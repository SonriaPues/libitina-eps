"""Lo que Trámites les pregunta a otros microservicios (REST interno)."""
from fastapi import HTTPException
from . import config
from .internos import llamar, json_o_error


def grupo_de_usuario(usuario_id: str) -> dict:
    return json_o_error(llamar("GET", f"{config.AFILIADOS_URL}/internal/afiliados/grupo", "Afiliados",
                               params={"usuario_id": usuario_id}), "No encontramos tu afiliación.")


def cita(cita_id) -> dict:
    r = llamar("GET", f"{config.CITAS_URL}/internal/citas/{cita_id}", "Citas")
    if r.status_code == 404:
        raise HTTPException(404, "Cita no encontrada.")
    return json_o_error(r, "No pudimos consultar la cita.")


def especialidad(codigo: str) -> dict:
    r = llamar("GET", f"{config.PRESTADORES_URL}/prestadores/especialidades/{codigo}", "Red de Prestadores")
    if r.status_code == 404:
        raise HTTPException(422, "Esa especialidad no existe.")
    return json_o_error(r, "No pudimos consultar la especialidad.")


def nombre_ips(ips_id) -> str:
    if not ips_id:
        return "IPS por asignar"
    r = llamar("GET", f"{config.PRESTADORES_URL}/prestadores/ips/{ips_id}", "Red de Prestadores")
    return r.json()["nombre"] if r.status_code == 200 else "IPS por asignar"
