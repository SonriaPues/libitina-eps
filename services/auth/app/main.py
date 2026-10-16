import logging
from datetime import timedelta
from fastapi import FastAPI, Depends, HTTPException, Request
from sqlalchemy import select, func, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from . import config
from .db import SessionLocal, get_db
from .models import Usuario, RefreshToken, TokenVerificacion
from .schemas import LoginIn, SesionOut, UsuarioOut, RefreshIn, CorreoIn, NuevaClaveIn, UsuarioInterno, CambioInterno
from .seguridad import (ahora, hash_clave, verificar_clave, sha256, token_aleatorio, crear_access_token,
                        usuario_del_token, solo_interno)
from .eventos import publicar

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("auth")
app = FastAPI(title="Libitina · Autenticación", version="1.0.0",
              description="Usuarios, roles, sesiones JWT, verificación de correo y recuperación de contraseña.")


def por_correo(db: Session, correo: str):
    return db.scalar(select(Usuario).where(func.lower(Usuario.email) == correo.lower()))


def usuario_out(u: Usuario) -> UsuarioOut:
    return UsuarioOut(id=u.id, correo=u.email, rol=u.rol, nombre=u.nombre, email_verificado=u.email_verificado)


def emitir_sesion(db: Session, u: Usuario, request: Request) -> SesionOut:
    refresh = token_aleatorio()
    db.add(RefreshToken(usuario_id=u.id, token_hash=sha256(refresh), expira_en=ahora() + timedelta(days=config.REFRESH_DIAS),
                        user_agent=(request.headers.get("user-agent") or "")[:255], ip_origen=request.headers.get("x-forwarded-for", request.client.host if request.client else None)))
    db.commit()
    return SesionOut(access_token=crear_access_token(u), refresh_token=refresh, usuario=usuario_out(u))


def crear_token_verificacion(db: Session, usuario_id, tipo: str, horas: float) -> str:
    token = token_aleatorio()
    db.add(TokenVerificacion(usuario_id=usuario_id, token_hash=sha256(token), tipo=tipo, expira_en=ahora() + timedelta(hours=horas)))
    return token


def usar_token(db: Session, token: str, tipo: str) -> TokenVerificacion:
    t = db.scalar(select(TokenVerificacion).where(TokenVerificacion.token_hash == sha256(token), TokenVerificacion.tipo == tipo))
    if not t or t.usado or t.expira_en < ahora():
        raise HTTPException(400, "El enlace no es válido o ya venció. Solicita uno nuevo.")
    t.usado = True
    return t


@app.on_event("startup")
def crear_admin():
    with SessionLocal() as db:
        if not por_correo(db, config.ADMIN_CORREO):
            db.add(Usuario(tipo_documento="CC", numero_documento=config.ADMIN_DOCUMENTO, nombres="Administrador", apellidos="Libitina",
                           email=config.ADMIN_CORREO.lower(), password_hash=hash_clave(config.ADMIN_CLAVE), rol="admin", email_verificado=True))
            db.commit()
            log.info("Administrador inicial creado: %s", config.ADMIN_CORREO)


@app.get("/health", tags=["Salud"])
def salud():
    return {"servicio": "auth", "estado": "ok"}


# ---------------- Sesión ----------------
@app.post("/auth/login", response_model=SesionOut, tags=["Sesión"])
def login(datos: LoginIn, request: Request, db: Session = Depends(get_db)):
    u = por_correo(db, datos.correo)
    error = HTTPException(401, "El correo o la contraseña no son correctos.")
    if not u:
        raise error
    if u.bloqueado_hasta and u.bloqueado_hasta > ahora():
        minutos = int((u.bloqueado_hasta - ahora()).total_seconds() // 60) + 1
        raise HTTPException(423, f"Tu cuenta está bloqueada por intentos fallidos. Intenta de nuevo en {minutos} minutos o restablece tu contraseña.")
    if not verificar_clave(datos.clave, u.password_hash):
        u.intentos_fallidos += 1
        if u.intentos_fallidos >= config.MAX_INTENTOS:
            u.bloqueado_hasta, u.intentos_fallidos = ahora() + timedelta(minutes=config.MINUTOS_BLOQUEO), 0
        db.commit()
        raise error
    if not u.activo:
        raise HTTPException(403, "Tu cuenta está desactivada. Comunícate con atención al usuario.")
    u.intentos_fallidos, u.bloqueado_hasta, u.ultimo_acceso = 0, None, ahora()
    return emitir_sesion(db, u, request)


@app.post("/auth/refresh", response_model=SesionOut, tags=["Sesión"])
def refrescar(datos: RefreshIn, request: Request, db: Session = Depends(get_db)):
    """Rota el refresh token: el usado queda revocado y se entrega uno nuevo."""
    t = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == sha256(datos.refresh_token)))
    if not t or t.revocado or t.expira_en < ahora():
        raise HTTPException(401, "Tu sesión expiró. Inicia sesión de nuevo.")
    u = db.get(Usuario, t.usuario_id)
    if not u or not u.activo:
        raise HTTPException(401, "Tu sesión expiró. Inicia sesión de nuevo.")
    t.revocado = True
    return emitir_sesion(db, u, request)


@app.post("/auth/logout", status_code=204, tags=["Sesión"])
def logout(datos: RefreshIn, db: Session = Depends(get_db)):
    db.execute(update(RefreshToken).where(RefreshToken.token_hash == sha256(datos.refresh_token)).values(revocado=True))
    db.commit()


@app.get("/auth/me", response_model=UsuarioOut, tags=["Sesión"])
def yo(token: dict = Depends(usuario_del_token), db: Session = Depends(get_db)):
    u = db.get(Usuario, token["sub"])
    if not u:
        raise HTTPException(404, "Usuario no encontrado.")
    return usuario_out(u)


# ---------------- Correo y contraseña ----------------
@app.get("/auth/verificar-email/{token}", tags=["Correo"])
def verificar_email(token: str, db: Session = Depends(get_db)):
    t = usar_token(db, token, "verificacion_email")
    db.get(Usuario, t.usuario_id).email_verificado = True
    db.commit()
    return {"mensaje": "Tu correo quedó confirmado."}


@app.post("/auth/verificar-email", tags=["Correo"])
def reenviar_verificacion(token: dict = Depends(usuario_del_token), db: Session = Depends(get_db)):
    u = db.get(Usuario, token["sub"])
    if u.email_verificado:
        return {"mensaje": "Tu correo ya está confirmado."}
    t = crear_token_verificacion(db, u.id, "verificacion_email", 24)
    db.commit()
    publicar("verificacion_email", u.id, u.email, u.nombres, f"{config.FRONTEND_URL}/verificar-correo?token={t}")
    return {"mensaje": "Te enviamos un nuevo enlace de confirmación."}


@app.post("/auth/recuperar", tags=["Contraseña"])
def recuperar(datos: CorreoIn, db: Session = Depends(get_db)):
    # Responde igual exista o no el correo, para no revelar quién está registrado.
    u = por_correo(db, datos.correo)
    if u and u.activo:
        t = crear_token_verificacion(db, u.id, "recuperacion_contrasena", 0.5)
        db.commit()
        publicar("recuperacion_contrasena", u.id, u.email, u.nombres, f"{config.FRONTEND_URL}/restablecer?token={t}")
    return {"mensaje": "Si el correo está registrado, te enviaremos un enlace."}


@app.post("/auth/recuperar/confirmar", tags=["Contraseña"])
def confirmar_recuperacion(datos: NuevaClaveIn, db: Session = Depends(get_db)):
    t = usar_token(db, datos.token, "recuperacion_contrasena")
    u = db.get(Usuario, t.usuario_id)
    u.password_hash, u.intentos_fallidos, u.bloqueado_hasta = hash_clave(datos.clave), 0, None
    u.email_verificado = True   # abrir el enlace del correo demuestra que el correo es suyo
    db.execute(update(RefreshToken).where(RefreshToken.usuario_id == u.id).values(revocado=True))  # cierra otras sesiones
    db.commit()
    return {"mensaje": "Tu contraseña se actualizó. Ya puedes iniciar sesión."}


# ---------------- Solo para otros microservicios ----------------
@app.post("/internal/usuarios", status_code=201, dependencies=[Depends(solo_interno)], tags=["Interno"])
def crear_usuario(datos: UsuarioInterno, db: Session = Depends(get_db)):
    """Crea la cuenta. Afiliados: con la clave que escribieron. Doctores: sin clave; se
    devuelve un enlace (72 h) para que la creen ellos mismos. Nadie más la conoce."""
    if por_correo(db, datos.correo):
        raise HTTPException(409, "Ya existe una cuenta con ese correo.")
    clave = datos.clave or token_aleatorio()  # aleatoria e irrecuperable hasta que use el enlace
    u = Usuario(tipo_documento=datos.tipo_documento, numero_documento=datos.numero_documento, nombres=datos.nombres,
                apellidos=datos.apellidos, email=datos.correo.lower(), password_hash=hash_clave(clave), rol=datos.rol)
    db.add(u)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Ya existe una cuenta con ese documento.")
    respuesta = {"id": str(u.id)}
    if datos.clave:
        token = crear_token_verificacion(db, u.id, "verificacion_email", 24)
        respuesta["enlace_verificacion"] = f"{config.FRONTEND_URL}/verificar-correo?token={token}"
    else:
        token = crear_token_verificacion(db, u.id, "recuperacion_contrasena", 72)
        respuesta["enlace_clave"] = f"{config.FRONTEND_URL}/restablecer?token={token}&nuevo=1"
    db.commit()
    return respuesta


@app.patch("/internal/usuarios/{usuario_id}", dependencies=[Depends(solo_interno)], tags=["Interno"])
def cambiar_usuario(usuario_id: str, datos: CambioInterno, db: Session = Depends(get_db)):
    """Activa o desactiva una cuenta (ej. un doctor que se retira) y actualiza su nombre."""
    u = db.get(Usuario, usuario_id)
    if not u:
        raise HTTPException(404, "Usuario no encontrado.")
    if datos.nombres:
        u.nombres = datos.nombres
    if datos.apellidos:
        u.apellidos = datos.apellidos
    if datos.email_verificado is not None:
        u.email_verificado = datos.email_verificado
    if datos.activo is not None:
        u.activo = datos.activo
        if not datos.activo:  # cierra sus sesiones abiertas
            db.execute(update(RefreshToken).where(RefreshToken.usuario_id == u.id).values(revocado=True))
    db.commit()
    return {"id": str(u.id), "activo": u.activo}


@app.post("/internal/usuarios/{usuario_id}/enlace-clave", dependencies=[Depends(solo_interno)], tags=["Interno"])
def nuevo_enlace_clave(usuario_id: str, db: Session = Depends(get_db)):
    """Nuevo enlace para crear la contraseña (si el primero venció)."""
    u = db.get(Usuario, usuario_id)
    if not u or not u.activo:
        raise HTTPException(404, "Usuario no encontrado o inactivo.")
    token = crear_token_verificacion(db, u.id, "recuperacion_contrasena", 72)
    db.commit()
    return {"enlace_clave": f"{config.FRONTEND_URL}/restablecer?token={token}&nuevo=1"}


@app.delete("/internal/usuarios/{usuario_id}", status_code=204, dependencies=[Depends(solo_interno)], tags=["Interno"])
def borrar_usuario(usuario_id: str, db: Session = Depends(get_db)):
    """Compensación: si la afiliación falla después de crear la cuenta, se deshace."""
    u = db.get(Usuario, usuario_id)
    if u:
        db.delete(u)
        db.commit()
