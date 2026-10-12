"""Servicio mínimo para Historia Clínica, Trámites y Citas.

Su base de datos ya existe con todas sus tablas; los endpoints llegan en la
siguiente entrega. Mientras tanto responde su estado y comprueba la conexión.
"""
import os
from fastapi import FastAPI
from sqlalchemy import create_engine, text

SERVICIO = os.getenv("SERVICIO", "pendiente")
engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
app = FastAPI(title=f"Libitina · {SERVICIO}", version="0.1.0")


@app.get("/health")
def salud():
    with engine.connect() as c:
        tablas = c.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")).scalar()
    return {"servicio": SERVICIO, "estado": "ok", "tablas": tablas, "endpoints": "próxima entrega"}
