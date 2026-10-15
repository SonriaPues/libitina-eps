"""Reglas de la agenda: turnos, bloqueos y horarios disponibles."""
from datetime import date, datetime, time, timedelta
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session
from . import config
from .models import Doctor, Turno, Excepcion, Cita, ACTIVAS
from .tiempo import ahora, hoy, fecha_larga


def sumar_minutos(h: time, minutos: int) -> time:
    return (datetime.combine(date.min, h) + timedelta(minutes=minutos)).time()


def horas_del_turno(t: Turno, duracion: int):
    """Inicios de cita dentro de un turno: 7:00, 7:20, 7:40… sin pasarse del fin."""
    h = t.hora_inicio
    while sumar_minutos(h, duracion) <= t.hora_fin and sumar_minutos(h, duracion) > h:
        yield h
        h = sumar_minutos(h, duracion)


def bloqueado(excepciones: list[Excepcion], doctor_id, dia: date) -> bool:
    return any(e.doctor_id == doctor_id and e.fecha_inicio <= dia <= e.fecha_fin for e in excepciones)


def disponibilidad(db: Session, codigo: str, desde: date, dias: int, punto_id=None) -> list[dict]:
    desde = max(desde, hoy())
    hasta = min(desde + timedelta(days=dias - 1), hoy() + timedelta(days=config.DIAS_ANTICIPACION))
    doctores = {d.doctor_id: d for d in db.scalars(select(Doctor).where(Doctor.activo, Doctor.especialidad_codigo == codigo))}
    if not doctores or hasta < desde:
        return []
    q = select(Turno).where(Turno.activo, Turno.doctor_id.in_(doctores))
    if punto_id:
        q = q.where(Turno.punto_atencion_id == punto_id)
    turnos = list(db.scalars(q))
    excepciones = list(db.scalars(select(Excepcion).where(Excepcion.doctor_id.in_(doctores), Excepcion.fecha_fin >= desde,
                                                         Excepcion.fecha_inicio <= hasta)))
    ocupados = set(db.execute(select(Cita.doctor_id, Cita.fecha, Cita.hora_inicio).where(
        Cita.doctor_id.in_(doctores), Cita.fecha.between(desde, hasta), Cita.estado.in_(ACTIVAS))).all())
    limite = ahora() + timedelta(minutes=config.MINUTOS_MINIMOS_PARA_AGENDAR)

    resultado = []
    dia = desde
    while dia <= hasta:
        horarios = []
        for t in turnos:
            d = doctores[t.doctor_id]
            if t.dia_semana != dia.weekday() or bloqueado(excepciones, d.doctor_id, dia):
                continue
            for h in horas_del_turno(t, d.duracion_cita_min):
                if (d.doctor_id, dia, h) in ocupados or datetime.combine(dia, h) < limite:
                    continue
                horarios.append({"hora": h.strftime("%H:%M"), "doctor_id": str(d.doctor_id), "doctor": d.nombre_completo,
                                 "punto_atencion_id": str(t.punto_atencion_id)})
        if horarios:
            horarios.sort(key=lambda x: (x["hora"], x["doctor"]))
            resultado.append({"fecha": dia.isoformat(), "dia": fecha_larga(dia), "horarios": horarios})
        dia += timedelta(days=1)
    return resultado


def validar_horario(db: Session, d: Doctor, punto_id, dia: date, h: time) -> time:
    """Comprueba que el horario pedido exista en la agenda y devuelve la hora de fin."""
    if not d.activo:
        raise HTTPException(422, "El profesional no está recibiendo citas en este momento.")
    if dia < hoy() or dia > hoy() + timedelta(days=config.DIAS_ANTICIPACION):
        raise HTTPException(422, f"Solo puedes agendar entre hoy y los próximos {config.DIAS_ANTICIPACION} días.")
    if datetime.combine(dia, h) < ahora() + timedelta(minutes=config.MINUTOS_MINIMOS_PARA_AGENDAR):
        raise HTTPException(422, "Ese horario ya pasó o está muy cerca. Elige otro.")
    turnos = db.scalars(select(Turno).where(Turno.activo, Turno.doctor_id == d.doctor_id, Turno.dia_semana == dia.weekday(),
                                            Turno.punto_atencion_id == punto_id))
    if not any(h in set(horas_del_turno(t, d.duracion_cita_min)) for t in turnos):
        raise HTTPException(422, "Ese horario no está en la agenda del profesional.")
    excepciones = list(db.scalars(select(Excepcion).where(Excepcion.doctor_id == d.doctor_id)))
    if bloqueado(excepciones, d.doctor_id, dia):
        raise HTTPException(422, "El profesional no atiende ese día.")
    return sumar_minutos(h, d.duracion_cita_min)


def guardar_doctor(db: Session, copia: dict) -> None:
    """Crea o actualiza la copia local de un doctor (evento de Red de Prestadores)."""
    valores = {k: copia[k] for k in ("doctor_id", "nombre_completo", "especialidad", "especialidad_codigo",
                                     "duracion_cita_min", "sede_principal_id", "activo")}
    stmt = insert(Doctor).values(**valores)
    db.execute(stmt.on_conflict_do_update(index_elements=[Doctor.doctor_id],
                                          set_={**{k: stmt.excluded[k] for k in valores if k != "doctor_id"}, "actualizado_en": func.now()}))
