"""Sesión y permisos. El Gateway ya validó la firma del JWT; aquí se vuelve a
validar (defensa en profundidad) y se revisa el rol de quien llama."""
import secrets
import jwt
from fastapi import Depends, Header, HTTPException
from .config import JWT_SECRET, INTERNAL_TOKEN


def _decodificar(authorization: str) -> dict:
    try:
        return jwt.decode(authorization[7:], JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Tu sesión expiró. Inicia sesión de nuevo.")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Sesión no válida. Inicia sesión de nuevo.")


def usuario_del_token(authorization: str = Header(default="")) -> dict:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Inicia sesión para continuar.")
    return _decodificar(authorization)


def usuario_opcional(authorization: str = Header(default="")) -> dict | None:
    """Para endpoints públicos que aprovechan la sesión si existe (ej. radicar una PQRSD)."""
    return _decodificar(authorization) if authorization.lower().startswith("bearer ") else None


def requiere_rol(*roles: str):
    def dependencia(u: dict = Depends(usuario_del_token)) -> dict:
        if u.get("rol") not in roles:
            raise HTTPException(403, "No tienes permiso para esta acción.")
        return u
    return dependencia


def solo_interno(x_internal_token: str = Header(default="")):
    """Endpoints que solo llaman otros microservicios. El Gateway nunca los expone."""
    if not INTERNAL_TOKEN or not secrets.compare_digest(x_internal_token, INTERNAL_TOKEN):
        raise HTTPException(403, "Acceso solo para servicios internos.")
