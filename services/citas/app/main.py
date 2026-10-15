"""Microservicio de CITAS MÉDICAS · base libitina_citas.

- Afiliado: ve horarios disponibles por especialidad y sede, agenda para él o un
  beneficiario, cancela y reagenda. Las especialidades que lo exigen piden una
  remisión vigente (Trámites) que se consume al agendar.
- Doctor: ve su agenda y marca inasistencias. La consulta la registra en Historia
  Clínica, que marca la cita como realizada por un endpoint interno.
- Administrador: define los turnos semanales de cada doctor y sus bloqueos.
La base de datos impide dos citas del mismo doctor a la misma hora y dos citas
activas de la misma especialidad para un paciente.
"""
import logging
from datetime import date, datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, Query
from psycopg.errors import UniqueViolation
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from . import agenda, clientes, config
from .db import engine, get_db
from .eventos import notificar
from .migrar import aplicar
from .models import Doctor, Turno, Excepcion, Cita, ACTIVAS
from .schemas import AgendarIn, ReagendarIn, CancelarIn, TurnoIn, ExcepcionIn
from .seguridad import requiere_rol, solo_interno
from .tiempo import ahora, hoy, fecha_larga, hora_corta

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("citas")
app = FastAPI(title="Libitina · Citas Médicas", version="1.0.0",
              description="Agendas de los profesionales, disponibilidad y agendamiento de citas.")
solo_afiliado, solo_doctor, solo_admin = requiere_rol("afiliado"), requiere_rol("doctor"), requiere_rol("admin")


@app.on_event("startup")
def migrar():
    aplicar(engine)


# ---------------- Utilidades ----------------
def obtener(db: Session, modelo, id_, mensaje: str):
    try:
        obj = db.get(modelo, id_)
    except Exception:  # noqa: BLE001 - id con formato inválido
        obj = None
    if not obj:
        raise HTTPException(404, mensaje)
    return obj


def inicio(c: Cita) -> datetime:
    return datetime.combine(c.fecha, c.hora_inicio)


def cita_out(c: Cita, doctor: Doctor | None = None) -> dict:
    activa = c.estado in ACTIVAS
    return {"id": c.id, "afiliado_id": c.afiliado_id, "paciente": c.paciente_nombre, "paciente_documento": c.paciente_documento,
            "doctor_id": c.doctor_id, "doctor": doctor.nombre_completo if doctor else None,
            "especialidad": c.especialidad, "especialidad_codigo": c.especialidad_codigo, "estado": c.estado,
            "fecha": c.fecha, "hora": c.hora_inicio.strftime("%H:%M"), "hora_fin": c.hora_fin.strftime("%H:%M"),
            "punto_atencion_id": c.punto_atencion_id, "motivo": c.motivo, "cuota_moderadora": float(c.cuota_moderadora),
            "remision_id": c.remision_id, "motivo_cancelacion": c.motivo_cancelacion, "cita_anterior_id": c.cita_anterior_id,
            "puede_cancelar": activa and inicio(c) - ahora() >= timedelta(hours=config.HORAS_MINIMAS_PARA_CANCELAR)}


def con_doctores(db: Session, citas: list[Cita]) -> list[dict]:
    docs = {d.doctor_id: d for d in db.scalars(select(Doctor).where(Doctor.doctor_id.in_({c.doctor_id for c in citas})))} if citas else {}
    return [cita_out(c, docs.get(c.doctor_id)) for c in citas]


def avisar(evento: str, c: Cita, doctor: Doctor, **extra) -> None:
    pesos = f"${int(c.cuota_moderadora):,}".replace(",", ".") if c.cuota_moderadora else "no aplica"
    notificar(evento, "citas", c.contacto_email, c.contacto_nombre or "", usuario_id=c.titular_usuario_id, ruta="/portal/citas",
              referencia_id=c.id, paciente=c.paciente_nombre, especialidad=c.especialidad, fecha=fecha_larga(c.fecha),
              hora=hora_corta(c.hora_inicio), doctor=doctor.nombre_completo, sede=clientes.nombre_sede(c.punto_atencion_id),
              cuota=pesos, **extra)


def paciente_del_grupo(grupo: dict, afiliado_id) -> dict:
    personas = [grupo["titular"], *grupo["beneficiarios"]]
    p = next((x for x in personas if x["id"] == str(afiliado_id)), None)
    if not p:
        raise HTTPException(403, "Solo puedes agendar citas para ti o para tu grupo familiar.")
    if p["estado"] != "activo":
        raise HTTPException(422, "La afiliación debe estar activa para agendar citas.")
    return p


def error_de_unicidad(e: IntegrityError) -> HTTPException:
    if isinstance(e.orig, UniqueViolation) and "uq_cita_paciente_especialidad" in str(e.orig):
        return HTTPException(409, "El paciente ya tiene una cita activa de esa especialidad. Cancélala o reagéndala.")
    if isinstance(e.orig, UniqueViolation):
        return HTTPException(409, "Alguien acaba de tomar ese horario. Elige otro.")
    return HTTPException(422, "No pudimos guardar la cita con esos datos.")


@app.get("/health", tags=["Salud"])
def salud(db: Session = Depends(get_db)):
    doctores = db.scalar(select(func.count()).select_from(Doctor).where(Doctor.activo))
    return {"servicio": "citas", "estado": "ok", "doctores_activos": doctores}


# ---------------- Afiliado ----------------
@app.get("/citas/especialidades", tags=["Agendar"])
def especialidades_con_agenda(db: Session = Depends(get_db)):
    """Especialidades que hoy tienen al menos un profesional activo con turnos."""
    filas = db.execute(select(Doctor.especialidad_codigo, Doctor.especialidad).join(Turno, Turno.doctor_id == Doctor.doctor_id)
                       .where(Doctor.activo, Turno.activo).distinct()).all()
    return [{"codigo": c, "nombre": n} for c, n in sorted(filas, key=lambda f: f[1])]


@app.get("/citas/disponibilidad", tags=["Agendar"])
def disponibilidad(especialidad: str = Query(max_length=40), punto_atencion_id: str | None = None,
                   desde: date | None = None, dias: int = Query(default=14, ge=1, le=31),
                   _: dict = Depends(requiere_rol("afiliado", "admin")), db: Session = Depends(get_db)):
    return agenda.disponibilidad(db, especialidad, desde or hoy(), dias, punto_atencion_id)


@app.post("/citas", status_code=201, tags=["Agendar"])
def agendar(datos: AgendarIn, u: dict = Depends(solo_afiliado), db: Session = Depends(get_db)):
    grupo = clientes.grupo_de_usuario(u["sub"])
    paciente = paciente_del_grupo(grupo, datos.afiliado_id)
    esp = clientes.especialidad(datos.especialidad_codigo)
    d = obtener(db, Doctor, datos.doctor_id, "Profesional no encontrado.")
    if d.especialidad_codigo != esp["codigo"]:
        raise HTTPException(422, "El profesional no atiende esa especialidad.")
    hora_fin = agenda.validar_horario(db, d, datos.punto_atencion_id, datos.fecha, datos.hora)

    remision = None
    if esp["requiere_remision"]:
        remision = clientes.remision_vigente(datos.afiliado_id, esp["codigo"])
        if not remision:
            raise HTTPException(422, f"Para {esp['nombre']} necesitas una remisión vigente de medicina general.")

    titular = grupo["titular"]
    c = Cita(afiliado_id=datos.afiliado_id, paciente_nombre=f"{paciente['nombres']} {paciente['apellidos']}",
             paciente_documento=f"{paciente['tipo_documento']} {paciente['numero_documento']}", doctor_id=d.doctor_id,
             agendada_por_rol="afiliado", agendada_por_id=u["sub"], estado="confirmada", fecha=datos.fecha,
             hora_inicio=datos.hora, hora_fin=hora_fin, punto_atencion_id=datos.punto_atencion_id, motivo=datos.motivo.strip(),
             especialidad_codigo=esp["codigo"], especialidad=esp["nombre"], remision_id=remision["id"] if remision else None,
             cuota_moderadora=clientes.cuota_moderadora(grupo), titular_usuario_id=u["sub"],
             contacto_email=titular["email"], contacto_nombre=titular["nombres"].split()[0])
    db.add(c)
    try:
        db.flush()
    except IntegrityError as e:
        db.rollback()
        raise error_de_unicidad(e)
    if remision:
        try:
            clientes.usar_remision(remision["id"], c.id)
        except HTTPException:
            db.rollback()
            raise
    db.commit()
    avisar("cita_agendada", c, d)
    return cita_out(c, d)


@app.get("/citas/mias", tags=["Mis citas"])
def mis_citas(u: dict = Depends(solo_afiliado), db: Session = Depends(get_db)):
    citas = list(db.scalars(select(Cita).where(Cita.titular_usuario_id == u["sub"], Cita.estado != "reagendada")
                            .order_by(Cita.fecha.desc(), Cita.hora_inicio.desc()).limit(100)))
    todas = con_doctores(db, citas)
    proximas = [c for c in todas if c["estado"] in ACTIVAS]
    proximas.sort(key=lambda c: (c["fecha"], c["hora"]))
    return {"proximas": proximas, "historial": [c for c in todas if c["estado"] not in ACTIVAS]}


def cita_cancelable(db: Session, cita_id: str, u: dict) -> Cita:
    c = obtener(db, Cita, cita_id, "Cita no encontrada.")
    if u["rol"] == "afiliado" and str(c.titular_usuario_id) != u["sub"]:
        raise HTTPException(404, "Cita no encontrada.")
    if c.estado not in ACTIVAS:
        raise HTTPException(409, "Esta cita ya no está activa.")
    if u["rol"] == "afiliado" and inicio(c) - ahora() < timedelta(hours=config.HORAS_MINIMAS_PARA_CANCELAR):
        raise HTTPException(422, f"Las citas se cancelan o reagendan con al menos {config.HORAS_MINIMAS_PARA_CANCELAR} horas de anticipación.")
    return c


@app.post("/citas/{cita_id}/cancelar", tags=["Mis citas"])
def cancelar(cita_id: str, datos: CancelarIn, u: dict = Depends(requiere_rol("afiliado", "admin")), db: Session = Depends(get_db)):
    c = cita_cancelable(db, cita_id, u)
    c.estado, c.motivo_cancelacion, c.cancelada_por = "cancelada", datos.motivo.strip(), u["sub"]
    db.commit()
    if c.remision_id:
        clientes.liberar_remision(c.remision_id)
    d = db.get(Doctor, c.doctor_id)
    avisar("cita_cancelada", c, d, motivo=c.motivo_cancelacion)
    return cita_out(c, d)


@app.post("/citas/{cita_id}/reagendar", tags=["Mis citas"])
def reagendar(cita_id: str, datos: ReagendarIn, u: dict = Depends(solo_afiliado), db: Session = Depends(get_db)):
    anterior = cita_cancelable(db, cita_id, u)
    d = obtener(db, Doctor, datos.doctor_id, "Profesional no encontrado.")
    if d.especialidad_codigo != anterior.especialidad_codigo:
        raise HTTPException(422, "Solo puedes reagendar con un profesional de la misma especialidad.")
    hora_fin = agenda.validar_horario(db, d, datos.punto_atencion_id, datos.fecha, datos.hora)
    anterior.estado = "reagendada"            # libera el horario y el cupo de la especialidad
    db.flush()
    nueva = Cita(**{k: getattr(anterior, k) for k in (
        "afiliado_id", "paciente_nombre", "paciente_documento", "agendada_por_rol", "motivo", "especialidad_codigo",
        "especialidad", "remision_id", "cuota_moderadora", "titular_usuario_id", "contacto_email", "contacto_nombre")},
        agendada_por_id=u["sub"], doctor_id=d.doctor_id, estado="confirmada", fecha=datos.fecha, hora_inicio=datos.hora,
        hora_fin=hora_fin, punto_atencion_id=datos.punto_atencion_id, cita_anterior_id=anterior.id)
    db.add(nueva)
    try:
        db.flush()
    except IntegrityError as e:
        db.rollback()
        raise error_de_unicidad(e)
    if nueva.remision_id:
        try:
            clientes.usar_remision(nueva.remision_id, nueva.id, cita_anterior_id=anterior.id)
        except HTTPException:
            db.rollback()
            raise
    db.commit()
    avisar("cita_agendada", nueva, d)
    return cita_out(nueva, d)


# ---------------- Doctor ----------------
@app.get("/citas/doctor/agenda", tags=["Doctor"])
def agenda_del_doctor(desde: date | None = None, hasta: date | None = None, u: dict = Depends(solo_doctor),
                      db: Session = Depends(get_db)):
    desde = desde or hoy()
    hasta = hasta or desde + timedelta(days=6)
    if (hasta - desde).days > 62:
        raise HTTPException(422, "Consulta como máximo dos meses a la vez.")
    citas = list(db.scalars(select(Cita).where(Cita.doctor_id == u["sub"], Cita.fecha.between(desde, hasta),
                                               Cita.estado != "reagendada").order_by(Cita.fecha, Cita.hora_inicio)))
    return con_doctores(db, citas)


@app.get("/citas/doctor/citas/{cita_id}", tags=["Doctor"])
def detalle_para_doctor(cita_id: str, u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    c = obtener(db, Cita, cita_id, "Cita no encontrada.")
    if str(c.doctor_id) != u["sub"]:
        raise HTTPException(404, "Cita no encontrada.")
    info = clientes.afiliado(c.afiliado_id)
    p = info["persona"]
    return {**cita_out(c, db.get(Doctor, c.doctor_id)),
            "paciente_detalle": {"fecha_nacimiento": p["fecha_nacimiento"], "sexo": p["sexo"], "tipo_afiliado": p["tipo_afiliado"],
                                 "regimen": info["regimen"], "documento": f"{p['tipo_documento']} {p['numero_documento']}"},
            "puede_atender": c.estado == "confirmada" and c.fecha <= hoy()}


@app.post("/citas/{cita_id}/no-asistio", tags=["Doctor"])
def no_asistio(cita_id: str, u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    c = obtener(db, Cita, cita_id, "Cita no encontrada.")
    if str(c.doctor_id) != u["sub"]:
        raise HTTPException(404, "Cita no encontrada.")
    if c.estado != "confirmada":
        raise HTTPException(409, "Solo se marca la inasistencia de una cita confirmada.")
    if inicio(c) > ahora():
        raise HTTPException(422, "La inasistencia se marca después de la hora de la cita.")
    c.estado = "no_asistio"
    db.commit()
    return cita_out(c, db.get(Doctor, c.doctor_id))


# ---------------- Administración de agendas ----------------
@app.get("/citas/admin/doctores", dependencies=[Depends(solo_admin)], tags=["Administración"])
def doctores_con_agenda(db: Session = Depends(get_db)):
    turnos = dict(db.execute(select(Turno.doctor_id, func.count()).where(Turno.activo).group_by(Turno.doctor_id)).all())
    proximas = dict(db.execute(select(Cita.doctor_id, func.count()).where(Cita.estado.in_(ACTIVAS), Cita.fecha >= hoy())
                               .group_by(Cita.doctor_id)).all())
    return [{"doctor_id": d.doctor_id, "nombre": d.nombre_completo, "especialidad": d.especialidad, "activo": d.activo,
             "duracion_cita_min": d.duracion_cita_min, "turnos": turnos.get(d.doctor_id, 0), "citas_proximas": proximas.get(d.doctor_id, 0)}
            for d in db.scalars(select(Doctor).order_by(Doctor.nombre_completo))]


@app.get("/citas/admin/doctores/{doctor_id}/agenda", dependencies=[Depends(solo_admin)], tags=["Administración"])
def agenda_admin(doctor_id: str, db: Session = Depends(get_db)):
    d = obtener(db, Doctor, doctor_id, "El doctor todavía no está disponible en Citas. Espera unos segundos e intenta de nuevo.")
    turnos = db.scalars(select(Turno).where(Turno.doctor_id == d.doctor_id, Turno.activo).order_by(Turno.dia_semana, Turno.hora_inicio))
    excepciones = db.scalars(select(Excepcion).where(Excepcion.doctor_id == d.doctor_id, Excepcion.fecha_fin >= hoy())
                             .order_by(Excepcion.fecha_inicio))
    return {"doctor": {"doctor_id": d.doctor_id, "nombre": d.nombre_completo, "especialidad": d.especialidad,
                       "duracion_cita_min": d.duracion_cita_min, "activo": d.activo, "sede_principal_id": d.sede_principal_id},
            "turnos": [{"id": t.id, "dia_semana": t.dia_semana, "hora_inicio": t.hora_inicio.strftime("%H:%M"),
                        "hora_fin": t.hora_fin.strftime("%H:%M"), "punto_atencion_id": t.punto_atencion_id} for t in turnos],
            "excepciones": [{"id": e.id, "fecha_inicio": e.fecha_inicio, "fecha_fin": e.fecha_fin, "motivo": e.motivo} for e in excepciones]}


@app.post("/citas/admin/doctores/{doctor_id}/turnos", status_code=201, dependencies=[Depends(solo_admin)], tags=["Administración"])
def crear_turno(doctor_id: str, datos: TurnoIn, db: Session = Depends(get_db)):
    d = obtener(db, Doctor, doctor_id, "El doctor todavía no está disponible en Citas. Espera unos segundos e intenta de nuevo.")
    cruces = db.scalars(select(Turno).where(Turno.doctor_id == d.doctor_id, Turno.activo, Turno.dia_semana == datos.dia_semana,
                                            Turno.hora_inicio < datos.hora_fin, Turno.hora_fin > datos.hora_inicio)).first()
    if cruces:
        raise HTTPException(409, "Ese turno se cruza con otro del mismo día.")
    t = Turno(doctor_id=d.doctor_id, **datos.model_dump())
    db.add(t)
    db.commit()
    return {"id": t.id}


@app.delete("/citas/admin/turnos/{turno_id}", status_code=204, dependencies=[Depends(solo_admin)], tags=["Administración"])
def borrar_turno(turno_id: str, db: Session = Depends(get_db)):
    """Las citas ya agendadas en ese turno se conservan."""
    t = obtener(db, Turno, turno_id, "Turno no encontrado.")
    t.activo = False
    db.commit()


@app.post("/citas/admin/doctores/{doctor_id}/excepciones", status_code=201, dependencies=[Depends(solo_admin)], tags=["Administración"])
def crear_excepcion(doctor_id: str, datos: ExcepcionIn, admin: dict = Depends(solo_admin), db: Session = Depends(get_db)):
    """Bloquea días (vacaciones, incapacidad). Las citas ya agendadas esos días se cancelan y se avisa a los pacientes."""
    d = obtener(db, Doctor, doctor_id, "Doctor no encontrado.")
    e = Excepcion(doctor_id=d.doctor_id, **datos.model_dump())
    db.add(e)
    afectadas = list(db.scalars(select(Cita).where(Cita.doctor_id == d.doctor_id, Cita.estado.in_(ACTIVAS),
                                                   Cita.fecha.between(datos.fecha_inicio, datos.fecha_fin))))
    motivo = "El profesional no estará disponible ese día. Puedes agendar de nuevo desde tu portal."
    for c in afectadas:
        c.estado, c.motivo_cancelacion, c.cancelada_por = "cancelada", motivo, admin["sub"]
    db.commit()
    for c in afectadas:
        if c.remision_id:
            clientes.liberar_remision(c.remision_id)
        avisar("cita_cancelada", c, d, motivo=motivo)
    return {"id": e.id, "citas_canceladas": len(afectadas)}


@app.delete("/citas/admin/excepciones/{excepcion_id}", status_code=204, dependencies=[Depends(solo_admin)], tags=["Administración"])
def borrar_excepcion(excepcion_id: str, db: Session = Depends(get_db)):
    db.delete(obtener(db, Excepcion, excepcion_id, "Bloqueo no encontrado."))
    db.commit()


# ---------------- Solo para otros microservicios ----------------
@app.get("/internal/citas/{cita_id}", dependencies=[Depends(solo_interno)], tags=["Interno"])
def cita_interna(cita_id: str, db: Session = Depends(get_db)):
    c = obtener(db, Cita, cita_id, "Cita no encontrada.")
    return {**cita_out(c, db.get(Doctor, c.doctor_id)), "titular_usuario_id": c.titular_usuario_id,
            "contacto_email": c.contacto_email, "contacto_nombre": c.contacto_nombre, "es_hoy_o_antes": c.fecha <= hoy()}


@app.post("/internal/citas/{cita_id}/realizada", dependencies=[Depends(solo_interno)], tags=["Interno"])
def marcar_realizada(cita_id: str, db: Session = Depends(get_db)):
    """Historia Clínica la llama al registrar la consulta."""
    c = obtener(db, Cita, cita_id, "Cita no encontrada.")
    if c.estado == "realizada":
        return {"estado": c.estado}
    if c.estado != "confirmada":
        raise HTTPException(409, "La cita no está confirmada.")
    c.estado = "realizada"
    db.commit()
    return {"estado": c.estado}
