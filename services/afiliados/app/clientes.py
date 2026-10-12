"""Llamadas síncronas a otros microservicios por la red interna."""
import httpx
from fastapi import HTTPException
from .config import AUTH_URL, PRESTADORES_URL, INTERNAL_TOKEN

H = {"X-Internal-Token": INTERNAL_TOKEN}


def _error(r: httpx.Response, defecto: str):
    try:
        detalle = r.json().get("detail")
    except ValueError:
        detalle = None
    if isinstance(detalle, list):  # errores de validación de Pydantic
        detalle = detalle[0].get("msg", defecto).replace("Value error, ", "")
    raise HTTPException(r.status_code if r.status_code < 500 else 502, detalle or defecto)


def ips_existe(ips_id) -> bool:
    try:
        r = httpx.get(f"{PRESTADORES_URL}/prestadores/ips/{ips_id}", timeout=5)
    except httpx.HTTPError:
        raise HTTPException(503, "No pudimos validar la IPS en este momento. Intenta de nuevo en unos minutos.")
    return r.status_code == 200


def crear_usuario(datos: dict) -> dict:
    try:
        r = httpx.post(f"{AUTH_URL}/internal/usuarios", json=datos, headers=H, timeout=10)
    except httpx.HTTPError:
        raise HTTPException(503, "No pudimos crear tu cuenta en este momento. Intenta de nuevo en unos minutos.")
    if r.status_code != 201:
        _error(r, "No pudimos crear tu cuenta.")
    return r.json()


def borrar_usuario(usuario_id: str):
    try:
        httpx.delete(f"{AUTH_URL}/internal/usuarios/{usuario_id}", headers=H, timeout=10)
    except httpx.HTTPError:
        pass
