import hashlib
import secrets
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from fastapi import Header, HTTPException
from .config import JWT_SECRET, JWT_MINUTOS, INTERNAL_TOKEN


def ahora() -> datetime:
    return datetime.now(timezone.utc)


def hash_clave(clave: str) -> str:
    return bcrypt.hashpw(clave.encode(), bcrypt.gensalt(rounds=12)).decode()


def verificar_clave(clave: str, hash_: str) -> bool:
    try:
        return bcrypt.checkpw(clave.encode(), hash_.encode())
    except ValueError:
        return False


def sha256(texto: str) -> str:
    return hashlib.sha256(texto.encode()).hexdigest()


def token_aleatorio() -> str:
    return secrets.token_urlsafe(32)


def crear_access_token(u) -> str:
    datos = {"sub": str(u.id), "correo": u.email, "rol": u.rol, "nombre": u.nombre,
             "iat": ahora(), "exp": ahora() + timedelta(minutes=JWT_MINUTOS), "tipo": "access"}
    return jwt.encode(datos, JWT_SECRET, algorithm="HS256")


def usuario_del_token(authorization: str = Header(default="")) -> dict:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Inicia sesión para continuar.")
    try:
        return jwt.decode(authorization[7:], JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Tu sesión expiró. Inicia sesión de nuevo.")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Sesión no válida. Inicia sesión de nuevo.")


def solo_interno(x_internal_token: str = Header(default="")):
    """Endpoints que solo pueden llamar otros microservicios (no pasan por el Gateway)."""
    if not secrets.compare_digest(x_internal_token, INTERNAL_TOKEN):
        raise HTTPException(403, "Acceso solo para servicios internos.")
