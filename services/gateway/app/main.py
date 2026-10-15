"""API Gateway de Libitina EPS: punto de entrada único a los microservicios.

- Enruta /api/v1/<servicio>/... al microservicio correspondiente.
- Valida el JWT cuando la petición lo trae (los servicios validan además el rol).
- Aplica límite de peticiones por IP, más estricto en login, inscripción y consultas públicas.
- Agrega CORS y encabezados de seguridad. Nunca expone los endpoints /internal.
- Sirve el front ya compilado (React + Vite) desde la misma dirección, como el
  Gateway de CarneOne: una sola URL pública para la página y la API.
"""
import asyncio
import os
import time
from collections import defaultdict, deque
import httpx
import jwt
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from fastapi.responses import JSONResponse, FileResponse

SERVICIOS = {
    "auth": os.getenv("AUTH_URL", "http://auth:8000"),
    "afiliados": os.getenv("AFILIADOS_URL", "http://afiliados:8000"),
    "prestadores": os.getenv("PRESTADORES_URL", "http://prestadores:8000"),
    "notificaciones": os.getenv("NOTIFICACIONES_URL", "http://notificaciones:8000"),
    "historia": os.getenv("HISTORIA_URL", "http://historia:8000"),
    "tramites": os.getenv("TRAMITES_URL", "http://tramites:8000"),
    "citas": os.getenv("CITAS_URL", "http://citas:8000"),
}
JWT_SECRET = os.environ["JWT_SECRET"]
ORIGENES = [o.strip() for o in os.getenv("FRONTEND_URL", "http://localhost:5173").split(",")]
LIMITE_GENERAL = int(os.getenv("LIMITE_POR_MINUTO", "120"))
LIMITE_SENSIBLE = int(os.getenv("LIMITE_SENSIBLE_POR_MINUTO", "10"))
# Rutas públicas que un atacante podría usar por fuerza bruta: límite estricto por IP.
# Se comparan por prefijo, así cubren también rutas con parámetros (ej. el código de un certificado).
SENSIBLES = {("POST", "auth/login"), ("POST", "auth/recuperar"), ("POST", "auth/recuperar/confirmar"),
             ("POST", "afiliados/inscripcion"), ("GET", "afiliados/consulta"), ("POST", "tramites/pqrsd"),
             ("GET", "tramites/pqrsd/consulta"), ("GET", "tramites/certificados/verificar")}
TAMANO_MAXIMO = 1_000_000  # 1 MB por petición
# Carpeta con el build del front. En desarrollo no existe y el front corre con `npm run dev`.
ESTATICOS = Path(os.getenv("FRONT_DIR", "/srv/front"))

app = FastAPI(title="Libitina · API Gateway", version="1.0.0", docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=ORIGENES, allow_credentials=True,
                   allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])
cliente = httpx.AsyncClient(timeout=20)
ventanas: dict[str, deque] = defaultdict(deque)


def error(estado: int, mensaje: str, **extra) -> JSONResponse:
    return JSONResponse({"detail": mensaje}, status_code=estado, **extra)


def ip_cliente(request: Request) -> str:
    """En producción Nginx sobrescribe X-Real-IP con la IP real; el cliente no puede falsificarla."""
    return (request.headers.get("x-real-ip") or (request.client.host if request.client else "desconocida")).strip()


def excede_limite(clave: str, limite: int) -> bool:
    """Ventana deslizante de 60 s en memoria (para varias réplicas se movería a Redis)."""
    if len(ventanas) > 50_000:  # evita que la tabla crezca sin límite
        ventanas.clear()
    ahora, v = time.monotonic(), ventanas[clave]
    while v and ahora - v[0] > 60:
        v.popleft()
    if len(v) >= limite:
        return True
    v.append(ahora)
    return False


@app.middleware("http")
async def seguridad(request: Request, siguiente):
    respuesta = await siguiente(request)
    respuesta.headers.update({"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
                              "Referrer-Policy": "strict-origin-when-cross-origin",
                              "Permissions-Policy": "camera=(), microphone=(), geolocation=()"})
    ruta = request.url.path
    if ruta.startswith("/api/"):
        respuesta.headers["Cache-Control"] = "no-store"          # datos personales: nunca en caché
    elif ruta.startswith("/assets/"):
        respuesta.headers["Cache-Control"] = "public, max-age=31536000, immutable"  # archivos con hash en el nombre
    elif "Cache-Control" not in respuesta.headers:
        respuesta.headers["Cache-Control"] = "no-cache"          # index.html siempre fresco tras un despliegue
    return respuesta


@app.get("/api/v1/health")
async def salud():
    async def revisar(url: str) -> str:
        try:
            r = await cliente.get(f"{url}/health", timeout=3)
            return "ok" if r.status_code == 200 else f"error {r.status_code}"
        except httpx.HTTPError:
            return "sin respuesta"
    resultados = await asyncio.gather(*(revisar(u) for u in SERVICIOS.values()))  # en paralelo: máximo 3 s
    return {"gateway": "ok", "servicios": dict(zip(SERVICIOS, resultados))}


@app.api_route("/api/v1/{servicio}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
@app.api_route("/api/v1/{servicio}/{ruta:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def enrutar(servicio: str, request: Request, ruta: str = ""):
    if servicio not in SERVICIOS or ruta.startswith("internal") or ".." in ruta:
        return error(404, "Recurso no encontrado.")

    ip = ip_cliente(request)
    destino = f"{servicio}/{ruta}".rstrip("/")
    sensible = next((r for m, r in SENSIBLES if m == request.method and (destino == r or destino.startswith(r + "/"))), None)
    # Cada ruta sensible lleva su propio contador; el resto comparte el límite general
    if excede_limite(f"{ip}:{sensible or '*'}", LIMITE_SENSIBLE if sensible else LIMITE_GENERAL):
        return error(429, "Hiciste demasiadas solicitudes seguidas. Espera un minuto e intenta de nuevo.", headers={"Retry-After": "60"})

    auth = request.headers.get("authorization", "")
    if auth:
        if not auth.lower().startswith("bearer "):
            return error(401, "Sesión no válida. Inicia sesión de nuevo.")
        try:
            jwt.decode(auth[7:], JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return error(401, "Tu sesión expiró. Inicia sesión de nuevo.")
        except jwt.InvalidTokenError:
            return error(401, "Sesión no válida. Inicia sesión de nuevo.")

    cuerpo = await request.body()
    if len(cuerpo) > TAMANO_MAXIMO:
        return error(413, "La solicitud es demasiado grande.")
    encabezados = {k: v for k, v in request.headers.items() if k.lower() in ("authorization", "content-type", "user-agent", "accept")}
    encabezados["X-Forwarded-For"] = ip
    try:
        destino_url = f"{SERVICIOS[servicio]}/{servicio}" + (f"/{ruta}" if ruta else "")
        r = await cliente.request(request.method, destino_url, params=request.query_params,
                                  content=cuerpo, headers=encabezados)
    except httpx.HTTPError:
        return error(503, "El servicio no está disponible en este momento. Intenta de nuevo en unos minutos.")
    tipo = r.headers.get("content-type", "application/json")
    extra = {k: r.headers[k] for k in ("content-disposition",) if k in r.headers}   # descargas (PDF)
    return Response(content=r.content, status_code=r.status_code, media_type=tipo, headers=extra)


@app.api_route("/api/{resto:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def api_desconocida(resto: str):
    return error(404, "Recurso no encontrado.")


# ---------------- Front ----------------
@app.api_route("/{ruta:path}", methods=["GET", "HEAD"], include_in_schema=False)
async def front(ruta: str):
    """Entrega los archivos del build; cualquier otra ruta devuelve index.html (React Router)."""
    indice = ESTATICOS / "index.html"
    if not indice.is_file():
        return error(404, "El front no está compilado en este contenedor. En desarrollo usa `npm run dev`.")
    if ruta:
        archivo = (ESTATICOS / ruta).resolve()
        if archivo.is_file() and ESTATICOS.resolve() in archivo.parents:  # impide salir de la carpeta
            return FileResponse(archivo)
        if ruta.startswith("assets/") or "." in ruta.rsplit("/", 1)[-1]:
            return error(404, "Archivo no encontrado.")
    return FileResponse(indice)
