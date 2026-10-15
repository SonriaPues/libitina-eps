"""Llamadas REST síncronas a otros microservicios por la red interna."""
import httpx
from fastapi import HTTPException
from .config import INTERNAL_TOKEN

_H = {"X-Internal-Token": INTERNAL_TOKEN}


def llamar(metodo: str, url: str, servicio: str, **kw) -> httpx.Response:
    try:
        return httpx.request(metodo, url, headers={**_H, **kw.pop("headers", {})}, timeout=kw.pop("timeout", 8), **kw)
    except httpx.HTTPError:
        raise HTTPException(503, f"El servicio de {servicio} no responde en este momento. Intenta de nuevo en unos minutos.")


def propagar_error(r: httpx.Response, defecto: str):
    """Convierte la respuesta de error de otro servicio en un error de este."""
    try:
        detalle = r.json().get("detail")
    except ValueError:
        detalle = None
    if isinstance(detalle, list):
        detalle = (detalle[0].get("msg") or defecto).replace("Value error, ", "")
    raise HTTPException(r.status_code if r.status_code < 500 else 502, detalle or defecto)


def json_o_error(r: httpx.Response, defecto: str):
    if r.status_code >= 400:
        propagar_error(r, defecto)
    return r.json()
