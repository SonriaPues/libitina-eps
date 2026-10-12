import logging
from celery import Celery
from .config import REDIS_URL

log = logging.getLogger("eventos")
cola = Celery("afiliados", broker=REDIS_URL)
cola.conf.broker_connection_retry_on_startup = False
cola.conf.broker_transport_options = {"max_retries": 1, "socket_timeout": 3}


def publicar(evento: str, usuario_id, email: str, nombre: str, enlace: str = "", referencia_id=None, **variables):
    try:
        cola.send_task("notificaciones.enviar", retry=False, kwargs={
            "evento": evento, "origen": "afiliados", "usuario_id": str(usuario_id), "email": email, "enlace": enlace,
            "referencia_id": str(referencia_id) if referencia_id else None,
            "variables": {"nombre": nombre, "enlace": enlace, **variables}})
    except Exception as e:  # noqa: BLE001
        log.error("No se pudo publicar el evento %s: %s", evento, e)
