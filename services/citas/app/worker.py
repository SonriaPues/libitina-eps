"""Worker de Citas (Celery, cola "citas").

Tareas:
- citas.doctor_actualizado   evento de Red de Prestadores: actualiza la copia local del doctor.
- citas.sincronizar_doctores cada 10 min: reconcilia la copia completa (por si se perdió un evento).
- citas.enviar_recordatorios cada 15 min: avisa por correo las citas del día siguiente.
"""
import logging
from datetime import timedelta
from celery import Celery
from celery.signals import worker_ready
from sqlalchemy import select
from . import clientes, config
from .agenda import guardar_doctor
from .db import SessionLocal, engine
from .internos import llamar
from .migrar import aplicar
from .models import Cita, Doctor
from .tiempo import hoy, fecha_larga, hora_corta
from .eventos import notificar

log = logging.getLogger("citas-worker")
app = Celery("citas", broker=config.REDIS_URL)
app.conf.task_default_queue = "citas"
app.conf.broker_connection_retry_on_startup = True
app.conf.beat_schedule = {
    "sincronizar-doctores": {"task": "citas.sincronizar_doctores", "schedule": 600.0},
    "recordatorios": {"task": "citas.enviar_recordatorios", "schedule": 900.0},
}


@app.task(name="citas.doctor_actualizado")
def doctor_actualizado(doctor: dict):
    with SessionLocal() as db:
        guardar_doctor(db, doctor)
        db.commit()
    log.info("Doctor actualizado: %s", doctor.get("nombre_completo"))


@app.task(name="citas.sincronizar_doctores")
def sincronizar_doctores():
    r = llamar("GET", f"{config.PRESTADORES_URL}/internal/doctores", "Red de Prestadores")
    r.raise_for_status()
    with SessionLocal() as db:
        for d in r.json():
            guardar_doctor(db, d)
        db.commit()
    log.info("Copia de doctores sincronizada (%s)", len(r.json()))


@app.task(name="citas.enviar_recordatorios")
def enviar_recordatorios():
    manana = hoy() + timedelta(days=1)
    with SessionLocal() as db:
        citas = list(db.scalars(select(Cita).where(Cita.estado == "confirmada", Cita.fecha == manana, ~Cita.recordatorio_enviado)))
        for c in citas:
            d = db.get(Doctor, c.doctor_id)
            notificar("cita_recordatorio", "citas", c.contacto_email, c.contacto_nombre or "", usuario_id=c.titular_usuario_id,
                      ruta="/portal/citas", referencia_id=c.id, paciente=c.paciente_nombre, especialidad=c.especialidad,
                      fecha=fecha_larga(c.fecha), hora=hora_corta(c.hora_inicio), doctor=d.nombre_completo,
                      sede=clientes.nombre_sede(c.punto_atencion_id))
            c.recordatorio_enviado = True
        db.commit()
    if citas:
        log.info("Recordatorios enviados: %s", len(citas))


@worker_ready.connect
def al_iniciar(**_):
    aplicar(engine)                       # por si el worker arranca antes que la API
    sincronizar_doctores.delay()
