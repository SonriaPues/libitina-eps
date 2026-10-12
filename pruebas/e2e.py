"""Prueba de punta a punta del flujo de afiliación, a través del API Gateway.

Uso:  python pruebas/e2e.py [URL del gateway] [URL de Mailpit]
      (por defecto http://localhost:8000 y http://localhost:8025)
Devuelve código de salida 1 si alguna comprobación falla (así la usa GitHub Actions).
"""
import copy
import os
import sys
import time
import httpx

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/")
MAILPIT = (sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8025").rstrip("/")
A = f"{BASE}/api/v1"
ADMIN = {"correo": os.getenv("ADMIN_CORREO", "admin@libitina.co"), "clave": os.getenv("ADMIN_CLAVE", "Admin123")}
c = httpx.Client(timeout=30)
fallas = []


def ver(nombre, r, esperado):
    ok = r.status_code == esperado
    print(f"{'✔' if ok else '✘'} {nombre}: {r.status_code}" + ("" if ok else f" (esperado {esperado}) -> {r.text[:300]}"))
    if not ok:
        fallas.append(nombre)
    return r


def comprobar(nombre, condicion, detalle=""):
    print(f"{'✔' if condicion else '✘'} {nombre}" + ("" if condicion else f" -> {detalle}"))
    if not condicion:
        fallas.append(nombre)


# Datos únicos en cada corrida, para poder repetir la prueba sin borrar las bases
n = str(int(time.time()))[-7:]
IPS = "a1b2c3d4-0000-4000-8000-000000000001"
CORREO = f"prueba{n}@correo.com"
insc = {
    "titular": {"tipo_documento": "CC", "numero_documento": f"10{n}", "nombres": "Laura Camila", "apellidos": "Rodríguez Pérez",
                "fecha_nacimiento": "1994-05-12", "sexo": "femenino", "telefono": "3001234567", "direccion": "Calle 47 # 13-20",
                "departamento": "Bogotá D. C.", "ciudad": "Bogotá", "zona": "urbana", "pertenencia_etnica": "no_responde", "tiene_discapacidad": None},
    "afiliacion": {"regimen": "contributivo", "ips_id": IPS, "tipo_cotizante": "dependiente", "categoria": "B",
                   "empleador_nit": "900123456-7", "empleador_nombre": "Empresa Ejemplo SAS"},
    "beneficiarios": [
        {"parentesco": "conyuge", "tipo_documento": "CC", "numero_documento": f"80{n}", "nombres": "Andrés", "apellidos": "Rodríguez", "fecha_nacimiento": "1992-02-01", "sexo": "masculino"},
        {"parentesco": "hijo", "tipo_documento": "RC", "numero_documento": f"11{n}", "nombres": "Tomás", "apellidos": "Rodríguez", "fecha_nacimiento": "2020-08-10", "sexo": "masculino"}],
    "cuenta": {"correo": CORREO, "clave": "Laura1234"},
    "consentimiento": {"autoriza_datos_salud": True, "declara_veracidad": True, "autoriza_contacto_comercial": False, "canal_notificacion": "email"},
}

print("— Infraestructura")
salud = ver("health del gateway", c.get(f"{A}/health"), 200).json()
comprobar("los 7 servicios responden", all(v == "ok" for v in salud["servicios"].values()), salud)
r = c.get(f"{BASE}/afiliacion")
comprobar("el gateway sirve el front", r.status_code == 200 and "<div id=\"root\">" in r.text, r.status_code)

print("— Validaciones de negocio")
m = copy.deepcopy(insc); m["beneficiarios"].append({"parentesco": "padre", "tipo_documento": "CC", "numero_documento": f"19{n}", "nombres": "Jorge", "apellidos": "R", "fecha_nacimiento": "1960-01-01", "sexo": "masculino"})
ver("padre con cónyuge e hijo (debe fallar)", c.post(f"{A}/afiliados/inscripcion", json=m), 422)
m = copy.deepcopy(insc); m["beneficiarios"][1]["fecha_nacimiento"] = "1998-01-01"
ver("hijo de 28 años sin incapacidad (debe fallar)", c.post(f"{A}/afiliados/inscripcion", json=m), 422)
m = copy.deepcopy(insc); m["afiliacion"] = {"regimen": "subsidiado", "ips_id": IPS, "grupo_sisben": "C4"}
ver("subsidiado con Sisbén C4 (debe fallar)", c.post(f"{A}/afiliados/inscripcion", json=m), 422)
m = copy.deepcopy(insc); m["cuenta"]["clave"] = "debil"
ver("contraseña débil (debe fallar)", c.post(f"{A}/afiliados/inscripcion", json=m), 422)

print("— Inscripción y sesión")
ver("inscripción completa", c.post(f"{A}/afiliados/inscripcion", json=insc), 201)
ver("mismo documento otra vez (debe fallar)", c.post(f"{A}/afiliados/inscripcion", json=insc), 409)
s = ver("login afiliado", c.post(f"{A}/auth/login", json={"correo": CORREO, "clave": "Laura1234"}), 200).json()
H = {"Authorization": f"Bearer {s['access_token']}"}
me = ver("mi afiliación", c.get(f"{A}/afiliados/me", headers=H), 200).json()
comprobar("queda pendiente con 2 beneficiarios", me["estado"] == "pendiente" and len(me["beneficiarios"]) == 2, me.get("estado"))
ver("afiliado no ve solicitudes de admin", c.get(f"{A}/afiliados/solicitudes", headers=H), 403)
ver("refresh token", c.post(f"{A}/auth/refresh", json={"refresh_token": s["refresh_token"]}), 200)
ver("refresh token reusado (debe fallar)", c.post(f"{A}/auth/refresh", json={"refresh_token": s["refresh_token"]}), 401)
ver("token manipulado (debe fallar)", c.get(f"{A}/afiliados/me", headers={"Authorization": "Bearer abc.def.ghi"}), 401)
ver("endpoint interno bloqueado en el gateway", c.post(f"{A}/auth/internal/usuarios", json={}), 404)

print("— Administración: rechazar, corregir y aprobar")
adm = ver("login admin", c.post(f"{A}/auth/login", json=ADMIN), 200).json()
HA = {"Authorization": f"Bearer {adm['access_token']}"}
pend = ver("solicitudes pendientes", c.get(f"{A}/afiliados/solicitudes?estado=pendiente", headers=HA), 200).json()
sid = next(x["id"] for x in pend if x["email"] == CORREO)
ver("rechazar con motivo corto (debe fallar)", c.post(f"{A}/afiliados/solicitudes/{sid}/rechazar", json={"motivo": "no"}, headers=HA), 422)
ver("rechazar con motivo", c.post(f"{A}/afiliados/solicitudes/{sid}/rechazar", json={"motivo": "El registro civil de Tomás no coincide."}, headers=HA), 200)
me = c.get(f"{A}/afiliados/me", headers=H).json()
ids = {b["numero_documento"]: b["id"] for b in me["beneficiarios"]}   # se emparejan por documento, no por orden
corr = {"titular": insc["titular"], "afiliacion": insc["afiliacion"],
        "beneficiarios": [{**b, "id": ids[b["numero_documento"]]} for b in insc["beneficiarios"]]}
corr["beneficiarios"][1]["numero_documento"] = f"12{n}"
ver("corregir y reenviar", c.put(f"{A}/afiliados/me/reenviar", json=corr, headers=H), 200)
ver("aprobar", c.post(f"{A}/afiliados/solicitudes/{sid}/aprobar", headers=HA), 200)
me = c.get(f"{A}/afiliados/me", headers=H).json()
comprobar("afiliación y beneficiarios activos", me["estado"] == "activo" and all(b["estado"] == "activo" for b in me["beneficiarios"]), me["estado"])

print("— Consultas públicas")
cons = ver("consulta pública", c.get(f"{A}/afiliados/consulta?tipo=CC&numero=10{n}"), 200).json()
comprobar("nombre enmascarado", "***" in cons.get("nombre", ""), cons)
ver("red de IPS", c.get(f"{A}/prestadores/ips?servicio=Urgencias"), 200)
ver("tarifas 2026", c.get(f"{A}/afiliados/tarifas"), 200)

print("— Correos (worker de Celery)")
time.sleep(6)
n_ = ver("campanita del afiliado", c.get(f"{A}/notificaciones/mias", headers=H), 200).json()
comprobar("3 notificaciones (recibida, rechazada, aprobada)", len(n_["items"]) == 3, [x["resumen"] for x in n_["items"]])
try:
    correos = httpx.get(f"{MAILPIT}/api/v1/search", params={"query": f"to:{CORREO}"}, timeout=10).json()
    comprobar("los 3 correos llegaron a Mailpit", correos.get("messages_count", 0) >= 3, correos.get("messages_count"))
except httpx.HTTPError:
    print("· Mailpit no disponible: se omite la revisión del buzón")

print("— Seguridad")
for _ in range(5):
    c.post(f"{A}/auth/login", json={"correo": CORREO, "clave": "Mala1234"})
ver("bloqueo tras 5 intentos fallidos", c.post(f"{A}/auth/login", json={"correo": CORREO, "clave": "Laura1234"}), 423)

print()
if fallas:
    print(f"FALLARON {len(fallas)} comprobaciones: {fallas}")
    sys.exit(1)
print("Todas las comprobaciones pasaron.")
