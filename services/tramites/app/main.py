"""Microservicio de TRÁMITES · base libitina_tramites (7 tablas).

Responsable de: PQRSD, certificados, autorizaciones médicas, solicitudes de
salas y quirófanos, y adjuntos. Cada trámite recibe un radicado automático
(LIB-PQR-2026-000123) que genera la base de datos.

Estado: base completa; los endpoints llegan en la próxima entrega (ver ROADMAP.md).
"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from .db import engine

app = FastAPI(title="Libitina · Trámites", version="0.2.0",
              description="PQRSD, certificados, autorizaciones y solicitudes de recursos.")

TABLAS = ["tramites", "pqrsd", "autorizaciones_medicas", "solicitudes_recurso", "certificados", "adjuntos", "historial_estado"]


@app.get("/health", tags=["Salud"])
def salud():
    """Comprueba la conexión, las 7 tablas y el generador de radicados."""
    with engine.connect() as c:
        existentes = set(c.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).scalars())
        radicados = c.execute(text("SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_tramites_radicado'")).scalar() == 1
    faltan = [t for t in TABLAS if t not in existentes]
    ok = not faltan and radicados
    cuerpo = {"servicio": "tramites", "estado": "ok" if ok else "error", "tablas": len(TABLAS) - len(faltan),
              "radicados_automaticos": radicados, "endpoints": "próxima entrega"}
    if faltan:
        cuerpo["faltan"] = faltan
    return JSONResponse(cuerpo, status_code=200 if ok else 503)
