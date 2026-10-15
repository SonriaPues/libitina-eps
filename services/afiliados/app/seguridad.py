import secrets
import jwt
from fastapi import Header, HTTPException, Depends
from .config import JWT_SECRET, INTERNAL_TOKEN


def usuario_del_token(authorization: str = Header(default="")) -> dict:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Inicia sesión para continuar.")
    try:
        return jwt.decode(authorization[7:], JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Tu sesión expiró. Inicia sesión de nuevo.")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Sesión no válida. Inicia sesión de nuevo.")


def requiere_rol(*roles: str):
    def dependencia(u: dict = Depends(usuario_del_token)) -> dict:
        if u.get("rol") not in roles:
            raise HTTPException(403, "No tienes permiso para esta acción.")
        return u
    return dependencia


def solo_interno(x_internal_token: str = Header(default="")):
    """Endpoints que solo llaman otros microservicios. El Gateway nunca los expone."""
    if not secrets.compare_digest(x_internal_token, INTERNAL_TOKEN):
        raise HTTPException(403, "Acceso solo para servicios internos.")
