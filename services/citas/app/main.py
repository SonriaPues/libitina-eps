"""Microservicio de CITAS MÉDICAS · base libitina_citas (6 tablas).

Responsable de: agendas de los profesionales, citas, reagendamientos,
atención domiciliaria y reservas de salas y quirófanos. La base impide dos
citas del mismo doctor a la misma hora y reservas de salas que se crucen.

Estado: base completa; los endpoints llegan en la próxima entrega (ver ROADMAP.md).
"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from .db import engine

app = FastAPI(title="Libitina · Citas Médicas", version="0.2.0",
              description="Agendas, citas, atención domiciliaria y reservas de recursos.")

TABLAS = ["doctores", "agenda_doctor", "excepciones_agenda", "reservas_recurso", "citas", "solicitudes_domiciliarias"]


@app.get("/health", tags=["Salud"])
def salud():
    """Comprueba la conexión, las 6 tablas y las reglas que impiden cruces de horario."""
    with engine.connect() as c:
        existentes = set(c.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).scalars())
        sin_cruces = c.execute(text("SELECT count(*) FROM pg_constraint WHERE conname = 'ex_reserva_sin_cruce'")).scalar() == 1
        sin_dobles = c.execute(text("SELECT count(*) FROM pg_indexes WHERE indexname = 'uq_cita_doctor_horario'")).scalar() == 1
    faltan = [t for t in TABLAS if t not in existentes]
    ok = not faltan and sin_cruces and sin_dobles
    cuerpo = {"servicio": "citas", "estado": "ok" if ok else "error", "tablas": len(TABLAS) - len(faltan),
              "regla_salas_sin_cruce": sin_cruces, "regla_doctor_sin_citas_dobles": sin_dobles, "endpoints": "próxima entrega"}
    if faltan:
        cuerpo["faltan"] = faltan
    return JSONResponse(cuerpo, status_code=200 if ok else 503)
