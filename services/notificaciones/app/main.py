from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .db import engine, get_db
from .migrar import aplicar
from .models import Notificacion
from .seguridad import usuario_del_token, requiere_rol

app = FastAPI(title="Libitina · Notificaciones", version="1.0.0",
              description="Historial de notificaciones del usuario (campanita del portal). El envío lo hace el worker de Celery.")


@app.on_event("startup")
def migrar():
    aplicar(engine)


@app.get("/health", tags=["Salud"])
def salud():
    return {"servicio": "notificaciones", "estado": "ok"}


@app.get("/notificaciones/mias", tags=["Usuario"])
def mias(token: dict = Depends(usuario_del_token), db: Session = Depends(get_db)):
    lista = db.scalars(select(Notificacion).where(Notificacion.usuario_id == token["sub"]).order_by(Notificacion.creado_en.desc()).limit(30)).all()
    return {"no_leidas": sum(1 for n in lista if not n.leida),
            "items": [{"id": n.id, "resumen": n.resumen, "enlace": n.enlace, "leida": n.leida, "creado_en": n.creado_en} for n in lista]}


@app.patch("/notificaciones/{notificacion_id}/leida", status_code=204, tags=["Usuario"])
def marcar_leida(notificacion_id: str, token: dict = Depends(usuario_del_token), db: Session = Depends(get_db)):
    n = db.get(Notificacion, notificacion_id)
    if not n or str(n.usuario_id) != token["sub"]:
        raise HTTPException(404, "Notificación no encontrada.")
    n.leida, n.leida_en = True, datetime.now(timezone.utc)
    db.commit()


@app.get("/notificaciones/envios", tags=["Administración"])
def envios(_: dict = Depends(requiere_rol("admin")), db: Session = Depends(get_db)):
    """Estado de los últimos correos: útil para detectar fallas de envío."""
    filas = db.execute(select(Notificacion.estado, func.count()).group_by(Notificacion.estado)).all()
    ultimos = db.scalars(select(Notificacion).order_by(Notificacion.creado_en.desc()).limit(50)).all()
    return {"totales": {e: c for e, c in filas},
            "ultimos": [{"evento": n.evento, "destino": n.email_destino, "estado": n.estado, "creado_en": n.creado_en} for n in ultimos]}
