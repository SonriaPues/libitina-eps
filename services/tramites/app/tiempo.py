"""Fechas y horas en la zona de Colombia (el servidor trabaja en UTC)."""
from datetime import datetime, date
from zoneinfo import ZoneInfo

BOGOTA = ZoneInfo("America/Bogota")
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def ahora() -> datetime:
    """Fecha y hora actual en Bogotá, sin zona (como se guardan fecha y hora de las citas)."""
    return datetime.now(BOGOTA).replace(tzinfo=None)


def hoy() -> date:
    return ahora().date()


def fecha_larga(d: date) -> str:
    return f"{DIAS[d.weekday()]} {d.day} de {MESES[d.month - 1]} de {d.year}"
