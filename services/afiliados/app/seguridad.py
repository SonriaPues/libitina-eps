import jwt
from fastapi import Header, HTTPException, Depends
from .config import JWT_SECRET


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
