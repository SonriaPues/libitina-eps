"""Reglas de la agenda: turnos, bloqueos y horarios disponibles."""
from datetime import date, datetime, time, timedelta
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session
from . import config
from .models import Doctor, Turno, Excepcion, Cita, ACTIVAS
from .tiempo import ahora, hoy, fecha_larga, hora_corta


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
            libres = {}
            for x in horarios:
                libres[(x["hora"], x["punto_atencion_id"])] = libres.get((x["hora"], x["punto_atencion_id"]), 0) + 1
            horas = [{"hora": h, "punto_atencion_id": p, "profesionales": n} for (h, p), n in sorted(libres.items())]
            resultado.append({"fecha": dia.isoformat(), "dia": fecha_larga(dia), "horas": horas, "horarios": horarios})
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


def elegir_doctor(db: Session, codigo: str, punto_id, dia: date, h: time) -> Doctor:
    """Asignación automática: entre los profesionales de la especialidad con ese horario libre en esa sede,
    el que tenga menos citas ese día (así la carga se reparte)."""
    candidatos = []
    for d in db.scalars(select(Doctor).where(Doctor.activo, Doctor.especialidad_codigo == codigo)):
        try:
            validar_horario(db, d, punto_id, dia, h)
        except HTTPException:
            continue
        ocupado = db.scalar(select(Cita.id).where(Cita.doctor_id == d.doctor_id, Cita.fecha == dia, Cita.hora_inicio == h,
                                                  Cita.estado.in_(ACTIVAS)))
        if ocupado:
            continue
        carga = db.scalar(select(func.count()).select_from(Cita).where(Cita.doctor_id == d.doctor_id, Cita.fecha == dia,
                                                                       Cita.estado.in_(ACTIVAS)))
        candidatos.append((carga, d.nombre_completo, d))
    if not candidatos:
        raise HTTPException(409, "Ese horario ya no está disponible. Elige otro.")
    return min(candidatos, key=lambda x: (x[0], x[1]))[2]


def cubierta(c: Cita, turnos: list) -> bool:
    return any(t.dia_semana == c.fecha.weekday() and t.punto_atencion_id == c.punto_atencion_id
               and t.hora_inicio <= c.hora_inicio and c.hora_fin <= t.hora_fin for t in turnos)


def citas_por_fuera(db: Session, turno: Turno, nuevo: dict | None) -> list[Cita]:
    """Citas futuras que hoy cubre `turno` y que quedarían sin turno si se cambia por `nuevo` (None = se quita)."""
    otros = [t for t in db.scalars(select(Turno).where(Turno.activo, Turno.doctor_id == turno.doctor_id, Turno.id != turno.id))]
    if nuevo:
        otros.append(Turno(doctor_id=turno.doctor_id, punto_atencion_id=turno.punto_atencion_id, **nuevo))
    citas = db.scalars(select(Cita).where(Cita.doctor_id == turno.doctor_id, Cita.estado.in_(ACTIVAS), Cita.fecha >= hoy(),
                                          Cita.punto_atencion_id == turno.punto_atencion_id).order_by(Cita.fecha, Cita.hora_inicio))
    return [c for c in citas if cubierta(c, [turno]) and not cubierta(c, otros)]


def aviso_citas(citas: list[Cita], accion: str) -> str:
    ejemplos = ", ".join(f"{fecha_larga(c.fecha).split(' de 20')[0]} a las {hora_corta(c.hora_inicio)}" for c in citas[:3])
    mas = f" y {len(citas) - 3} más" if len(citas) > 3 else ""
    if len(citas) == 1:
        return (f"No se puede {accion}: este turno tiene 1 cita agendada que quedaría por fuera ({ejemplos}). "
                "Reagéndala o bloquea ese día primero.")
    return (f"No se puede {accion}: este turno tiene {len(citas)} citas agendadas que quedarían por fuera ({ejemplos}{mas}). "
            "Reagéndalas o bloquea esos días primero.")
