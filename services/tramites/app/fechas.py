"""Plazos en días hábiles: sin sábados, domingos ni festivos de Colombia."""
from datetime import date, timedelta
import holidays

_festivos: dict[int, holidays.HolidayBase] = {}


def es_habil(d: date) -> bool:
    if d.year not in _festivos:
        _festivos[d.year] = holidays.Colombia(years=d.year)
    return d.weekday() < 5 and d not in _festivos[d.year]


def sumar_habiles(desde: date, dias: int) -> date:
    """El plazo empieza a contar el día hábil siguiente a la radicación."""
    d, contados = desde, 0
    while contados < dias:
        d += timedelta(days=1)
        if es_habil(d):
            contados += 1
    return d


def habiles_entre(desde: date, hasta: date) -> int:
    """Días hábiles que faltan (negativo si ya venció)."""
    if hasta < desde:
        return -habiles_entre(hasta, desde)
    d, n = desde, 0
    while d < hasta:
        d += timedelta(days=1)
        if es_habil(d):
            n += 1
    return n
