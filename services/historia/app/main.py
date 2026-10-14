"""Microservicio de HISTORIA CLÍNICA · base libitina_historia (8 tablas).

Vive en un servidor PostgreSQL aparte (red "clinica") al que solo llega este
servicio. Los textos clínicos se guardan cifrados con pgcrypto y cada acceso
queda en log_accesos_historia, que no se puede editar ni borrar
(Resolución 1995 de 1999).

Estado: base completa; los endpoints llegan en la próxima entrega (ver ROADMAP.md).
"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from .config import CLAVE_CIFRADO
from .db import engine

app = FastAPI(title="Libitina · Historia Clínica", version="0.2.0",
              description="Consultas, antecedentes, alergias, exámenes y auditoría de accesos.")

TABLAS = ["historias_clinicas", "consultas", "antecedentes", "alergias", "medicamentos_permanentes",
          "discapacidades", "examenes", "log_accesos_historia"]


@app.get("/health", tags=["Salud"])
def salud():
    """Comprueba la conexión, las 8 tablas, que el cifrado funciona con la clave del
    servicio y que el registro de accesos es inmutable."""
    with engine.connect() as c:
        existentes = set(c.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).scalars())
        cifrado = c.execute(text("SELECT pgp_sym_decrypt(pgp_sym_encrypt('prueba', :k), :k) = 'prueba'"), {"k": CLAVE_CIFRADO}).scalar()
        auditoria = c.execute(text("SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_log_inmutable'")).scalar() == 1
    faltan = [t for t in TABLAS if t not in existentes]
    ok = not faltan and cifrado and auditoria
    cuerpo = {"servicio": "historia", "estado": "ok" if ok else "error", "tablas": len(TABLAS) - len(faltan),
              "cifrado_pgcrypto": bool(cifrado), "auditoria_inmutable": auditoria, "endpoints": "próxima entrega"}
    if faltan:
        cuerpo["faltan"] = faltan
    return JSONResponse(cuerpo, status_code=200 if ok else 503)
