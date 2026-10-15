"""Publicación de eventos en Redis (Celery). Si Redis falla, la operación principal
sigue: el evento se registra como error y no tumba la petición del usuario."""
import logging
from celery import Celery
from .config import REDIS_URL, FRONTEND_URL

log = logging.getLogger("eventos")
cola = Celery("libitina", broker=REDIS_URL)
cola.conf.broker_connection_retry_on_startup = False
cola.conf.broker_transport_options = {"max_retries": 1, "socket_timeout": 3}


def enviar_tarea(nombre: str, cola_destino: str = "celery", **kwargs) -> None:
    try:
        cola.send_task(nombre, kwargs=kwargs, queue=cola_destino, retry=False)
    except Exception as e:  # noqa: BLE001
        log.error("No se pudo publicar %s: %s", nombre, e)


def notificar(evento: str, origen: str, email: str | None, nombre: str, usuario_id=None, ruta: str = "",
              referencia_id=None, **variables) -> None:
    """Pide al worker de Notificaciones que envíe un correo (y, si hay usuario, la campanita)."""
    if not email:
        return
    enlace = f"{FRONTEND_URL}{ruta}" if ruta else ""
    enviar_tarea("notificaciones.enviar", evento=evento, origen=origen, email=email,
                 usuario_id=str(usuario_id) if usuario_id else None, enlace=enlace,
                 referencia_id=str(referencia_id) if referencia_id else None,
                 variables={"nombre": nombre, "enlace": enlace, **{k: str(v) for k, v in variables.items()}})
