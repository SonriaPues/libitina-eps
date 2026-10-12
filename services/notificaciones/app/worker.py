"""Worker de Celery: consume los eventos de los demás servicios y envía los correos.

1. notificaciones.enviar     registra la notificación (alimenta la campanita del portal)
2. notificaciones.despachar  intenta el envío SMTP; si falla, reintenta hasta 3 veces
Cada intento queda en log_envios.
"""
import logging
from datetime import datetime, timezone
from celery import Celery
from sqlalchemy import select, func
from . import config
from .correo import renderizar, armar_html, enviar
from .db import SessionLocal
from .models import Plantilla, Notificacion, LogEnvio

log = logging.getLogger("worker")
app = Celery("notificaciones", broker=config.REDIS_URL)
app.conf.task_acks_late = True
app.conf.broker_connection_retry_on_startup = True


@app.task(name="notificaciones.enviar")
def enviar_notificacion(evento, origen, usuario_id, email, variables, enlace="", referencia_id=None):
    with SessionLocal() as db:
        p = db.scalar(select(Plantilla).where(Plantilla.evento == evento, Plantilla.activa))
        if not p:
            log.error("No hay plantilla activa para el evento %s", evento)
            return
        n = Notificacion(usuario_id=usuario_id, email_destino=email, asunto=renderizar(p.asunto, variables),
                         cuerpo_html=armar_html(renderizar(p.cuerpo_html, variables)), resumen=renderizar(p.resumen, variables),
                         enlace=(enlace or "").replace(config.FRONTEND_URL, "") or None, origen=origen, evento=evento,
                         referencia_id=referencia_id)
        db.add(n)
        db.commit()
        despachar.delay(str(n.id))


@app.task(name="notificaciones.despachar", bind=True, max_retries=3, default_retry_delay=60)
def despachar(self, notificacion_id):
    with SessionLocal() as db:
        n = db.get(Notificacion, notificacion_id)
        intento = (db.scalar(select(func.count()).select_from(LogEnvio).where(LogEnvio.notificacion_id == n.id)) or 0) + 1
        try:
            enviar(n.email_destino, n.asunto, n.cuerpo_html)
            n.estado, n.enviado_en = "enviado", datetime.now(timezone.utc)
            db.add(LogEnvio(notificacion_id=n.id, intento=intento, resultado="ok"))
            db.commit()
            log.info("Correo %s enviado a %s", n.evento, n.email_destino)
        except Exception as e:  # noqa: BLE001
            n.estado = "fallido"
            db.add(LogEnvio(notificacion_id=n.id, intento=intento, resultado="error", detalle_error=str(e)[:500]))
            db.commit()
            log.error("Falló el envío de %s (intento %s): %s", n.evento, intento, e)
            raise self.retry(exc=e)
