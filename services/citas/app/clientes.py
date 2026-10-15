"""Lo que Citas les pregunta a otros microservicios (REST interno)."""
import time as _time
from fastapi import HTTPException
from . import config
from .internos import llamar, json_o_error


def grupo_de_usuario(usuario_id: str) -> dict:
    """Titular y beneficiarios de la cuenta que está agendando (Afiliados)."""
    return json_o_error(llamar("GET", f"{config.AFILIADOS_URL}/internal/afiliados/grupo", "Afiliados",
                               params={"usuario_id": usuario_id}), "No encontramos tu afiliación.")


def afiliado(afiliado_id) -> dict:
    return json_o_error(llamar("GET", f"{config.AFILIADOS_URL}/internal/afiliados/{afiliado_id}", "Afiliados"),
                        "No encontramos al paciente.")


def especialidad(codigo: str) -> dict:
    r = llamar("GET", f"{config.PRESTADORES_URL}/prestadores/especialidades/{codigo}", "Red de Prestadores")
    if r.status_code == 404:
        raise HTTPException(422, "Esa especialidad no existe.")
    return json_o_error(r, "No pudimos consultar la especialidad.")


def cuota_moderadora(grupo: dict) -> float:
    """Contributivo: según la categoría del cotizante. Subsidiado: no paga cuota moderadora."""
    if grupo.get("regimen") != "contributivo":
        return 0.0
    tarifas = json_o_error(llamar("GET", f"{config.AFILIADOS_URL}/afiliados/tarifas", "Afiliados"), "No pudimos consultar las tarifas.")
    fila = next((t for t in tarifas if t["regimen"] == "contributivo" and t["categoria"] == grupo.get("categoria")), None)
    return float(fila["cuota_moderadora"]) if fila else 0.0


# ---------- Remisiones (viven en Trámites) ----------
def remision_vigente(afiliado_id, codigo: str) -> dict | None:
    r = llamar("GET", f"{config.TRAMITES_URL}/internal/remisiones/vigente", "Trámites",
               params={"afiliado_id": str(afiliado_id), "especialidad": codigo})
    return None if r.status_code == 404 else json_o_error(r, "No pudimos consultar tus remisiones.")


def usar_remision(remision_id, cita_id, cita_anterior_id=None) -> None:
    json_o_error(llamar("POST", f"{config.TRAMITES_URL}/internal/remisiones/{remision_id}/usar", "Trámites",
                        json={"cita_id": str(cita_id), "cita_anterior_id": str(cita_anterior_id) if cita_anterior_id else None}),
                 "No pudimos asociar la remisión a la cita.")


def liberar_remision(remision_id) -> None:
    """Al cancelar, la remisión vuelve a quedar disponible. Si Trámites no responde, no se bloquea la cancelación."""
    try:
        llamar("POST", f"{config.TRAMITES_URL}/internal/remisiones/{remision_id}/liberar", "Trámites")
    except HTTPException:
        pass


# ---------- Sedes (Red de Prestadores), en caché 5 minutos ----------
_sedes: dict = {"cuando": 0.0, "datos": {}}


def nombre_sede(punto_id) -> str:
    if _time.time() - _sedes["cuando"] > 300:
        try:
            r = llamar("GET", f"{config.PRESTADORES_URL}/prestadores/puntos-atencion", "Red de Prestadores")
            if r.status_code == 200:
                _sedes["datos"] = {p["id"]: f"{p['nombre']} ({p['direccion']})" for p in r.json()}
                _sedes["cuando"] = _time.time()
        except HTTPException:
            pass
    return _sedes["datos"].get(str(punto_id), "la sede asignada")
