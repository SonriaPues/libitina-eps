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
from .models import Doctor, Turno, Excepcion, Cita, Ausencia, ACTIVAS
from .schemas import AgendarIn, ReagendarIn, CancelarIn, TurnoIn, TurnoCambio, ExcepcionIn, AusenciaIn, RespuestaAusenciaIn
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
    """Especialidades que hoy tienen al menos un profesional activo con turnos, y en qué sedes."""
    filas = db.execute(select(Doctor.especialidad_codigo, Doctor.especialidad, Turno.punto_atencion_id)
                       .join(Turno, Turno.doctor_id == Doctor.doctor_id).where(Doctor.activo, Turno.activo).distinct()).all()
    esp = {}
    for c, n, p in filas:
        esp.setdefault(c, {"codigo": c, "nombre": n, "sedes": []})["sedes"].append(p)
    return sorted(esp.values(), key=lambda e: e["nombre"])


@app.get("/citas/disponibilidad", tags=["Agendar"])
def disponibilidad(especialidad: str = Query(max_length=40), punto_atencion_id: str | None = None,
                   desde: date | None = None, dias: int = Query(default=14, ge=1, le=31), resumen: bool = False,
                   _: dict = Depends(requiere_rol("afiliado", "admin")), db: Session = Depends(get_db)):
    """resumen=true: solo las horas libres (sin repetir y sin nombres de profesionales)."""
    dias_ = agenda.disponibilidad(db, especialidad, desde or hoy(), dias, punto_atencion_id)
    if resumen:
        for d in dias_:
            d.pop("horarios")
    return dias_


@app.post("/citas", status_code=201, tags=["Agendar"])
def agendar(datos: AgendarIn, u: dict = Depends(solo_afiliado), db: Session = Depends(get_db)):
    grupo = clientes.grupo_de_usuario(u["sub"])
    paciente = paciente_del_grupo(grupo, datos.afiliado_id)
    esp = clientes.especialidad(datos.especialidad_codigo)
    d = (obtener(db, Doctor, datos.doctor_id, "Profesional no encontrado.") if datos.doctor_id
         else agenda.elegir_doctor(db, esp["codigo"], datos.punto_atencion_id, datos.fecha, datos.hora))
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
    d = (obtener(db, Doctor, datos.doctor_id, "Profesional no encontrado.") if datos.doctor_id
         else agenda.elegir_doctor(db, anterior.especialidad_codigo, datos.punto_atencion_id, datos.fecha, datos.hora))
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
@app.get("/citas/doctor/pacientes", tags=["Doctor"])
def mis_pacientes(q: str = Query(default="", max_length=60), u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    """Pacientes que el doctor ha atendido o tiene agendados, con su última y su próxima cita."""
    citas = list(db.scalars(select(Cita).where(Cita.doctor_id == u["sub"], Cita.estado.notin_(["reagendada", "cancelada"]))
                            .order_by(Cita.fecha.desc(), Cita.hora_inicio.desc()).limit(2000)))
    filtro = q.strip().lower()
    pacientes = {}
    for c in citas:
        p = pacientes.setdefault(c.afiliado_id, {"afiliado_id": c.afiliado_id, "nombre": c.paciente_nombre, "documento": c.paciente_documento,
                                                 "atenciones": 0, "inasistencias": 0, "ultima": None, "proxima": None, "abrir_cita_id": None})
        if c.estado == "realizada":
            p["atenciones"] += 1
            p["ultima"] = p["ultima"] or {"fecha": c.fecha, "especialidad": c.especialidad, "cita_id": c.id}
        if c.estado == "no_asistio":
            p["inasistencias"] += 1
        if c.estado in ACTIVAS and c.fecha >= hoy():
            p["proxima"] = {"fecha": c.fecha, "hora": c.hora_inicio.strftime("%H:%M"), "cita_id": c.id}
        if c.estado in ("confirmada", "realizada") and not p["abrir_cita_id"]:
            p["abrir_cita_id"] = c.id                 # la historia se abre siempre desde una cita (queda en la auditoría)
    lista = [p for p in pacientes.values() if not filtro or filtro in p["nombre"].lower() or filtro in p["documento"].lower()]
    return sorted(lista, key=lambda p: (p["ultima"] is None, -(p["ultima"]["fecha"].toordinal() if p["ultima"] else 0), p["nombre"]))


@app.get("/citas/doctor/malla", tags=["Doctor"])
def malla_doctor(desde: date | None = None, dias: int = Query(default=7, ge=1, le=7), u: dict = Depends(solo_doctor),
                 db: Session = Depends(get_db)):
    d = obtener(db, Doctor, u["sub"], "Tu agenda todavía no está lista. Intenta en unos minutos.")
    return malla(db, [d], desde or hoy(), dias)


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


@app.put("/citas/admin/turnos/{turno_id}", dependencies=[Depends(solo_admin)], tags=["Administración"])
def cambiar_turno(turno_id: str, datos: TurnoCambio, db: Session = Depends(get_db)):
    """Mover o estirar un turno. No se permite si deja citas agendadas por fuera."""
    t = obtener(db, Turno, turno_id, "Turno no encontrado.")
    if not t.activo:
        raise HTTPException(404, "Turno no encontrado.")
    cruces = db.scalars(select(Turno).where(Turno.doctor_id == t.doctor_id, Turno.activo, Turno.id != t.id,
                                            Turno.dia_semana == datos.dia_semana, Turno.hora_inicio < datos.hora_fin,
                                            Turno.hora_fin > datos.hora_inicio)).first()
    if cruces:
        raise HTTPException(409, "Ese turno se cruza con otro del mismo día.")
    fuera = agenda.citas_por_fuera(db, t, datos.model_dump())
    if fuera:
        raise HTTPException(409, agenda.aviso_citas(fuera, "mover el turno"))
    t.dia_semana, t.hora_inicio, t.hora_fin = datos.dia_semana, datos.hora_inicio, datos.hora_fin
    db.commit()
    return turno_out(t)


@app.delete("/citas/admin/turnos/{turno_id}", status_code=204, dependencies=[Depends(solo_admin)], tags=["Administración"])
def borrar_turno(turno_id: str, db: Session = Depends(get_db)):
    """No se permite quitar un turno que tiene citas agendadas."""
    t = obtener(db, Turno, turno_id, "Turno no encontrado.")
    fuera = agenda.citas_por_fuera(db, t, None)
    if fuera:
        raise HTTPException(409, agenda.aviso_citas(fuera, "quitar el turno"))
    t.activo = False
    db.commit()


def turno_out(t: Turno) -> dict:
    return {"id": t.id, "doctor_id": t.doctor_id, "dia_semana": t.dia_semana, "hora_inicio": t.hora_inicio.strftime("%H:%M"),
            "hora_fin": t.hora_fin.strftime("%H:%M"), "punto_atencion_id": t.punto_atencion_id}


def malla(db: Session, doctores: list[Doctor], desde: date, dias: int, punto_id=None, con_paciente=True) -> dict:
    """Turnos, bloqueos y citas de varios doctores en un rango: alimenta las mallas semanal y diaria."""
    ids = [d.doctor_id for d in doctores]
    hasta = desde + timedelta(days=dias - 1)
    qt = select(Turno).where(Turno.activo, Turno.doctor_id.in_(ids))
    qc = select(Cita).where(Cita.doctor_id.in_(ids), Cita.fecha.between(desde, hasta), Cita.estado.notin_(["reagendada", "cancelada"]))
    if punto_id:
        qt, qc = qt.where(Turno.punto_atencion_id == punto_id), qc.where(Cita.punto_atencion_id == punto_id)
    return {
        "desde": desde, "hasta": hasta,
        "doctores": [{"doctor_id": d.doctor_id, "nombre": d.nombre_completo, "especialidad": d.especialidad,
                      "especialidad_codigo": d.especialidad_codigo, "duracion_cita_min": d.duracion_cita_min, "activo": d.activo}
                     for d in doctores],
        "turnos": [turno_out(t) for t in db.scalars(qt.order_by(Turno.dia_semana, Turno.hora_inicio))],
        "excepciones": [{"id": e.id, "doctor_id": e.doctor_id, "fecha_inicio": e.fecha_inicio, "fecha_fin": e.fecha_fin, "motivo": e.motivo}
                        for e in db.scalars(select(Excepcion).where(Excepcion.doctor_id.in_(ids), Excepcion.fecha_fin >= desde,
                                                                    Excepcion.fecha_inicio <= hasta))],
        "citas": [{"id": c.id, "doctor_id": c.doctor_id, "fecha": c.fecha, "hora_inicio": c.hora_inicio.strftime("%H:%M"),
                   "hora_fin": c.hora_fin.strftime("%H:%M"), "estado": c.estado, "especialidad": c.especialidad,
                   "punto_atencion_id": c.punto_atencion_id, **({"paciente": c.paciente_nombre} if con_paciente else {})}
                  for c in db.scalars(qc.order_by(Cita.fecha, Cita.hora_inicio))],
    }


@app.get("/citas/admin/malla", dependencies=[Depends(solo_admin)], tags=["Administración"])
def malla_admin(punto_atencion_id: str, desde: date | None = None, dias: int = Query(default=7, ge=1, le=7),
                especialidad: str | None = None, db: Session = Depends(get_db)):
    """Malla de una sede: los doctores con turnos en ella (o que la tienen como sede principal)."""
    con_turno = select(Turno.doctor_id).where(Turno.activo, Turno.punto_atencion_id == punto_atencion_id)
    q = select(Doctor).where((Doctor.doctor_id.in_(con_turno)) | (Doctor.sede_principal_id == punto_atencion_id))
    if especialidad:
        q = q.where(Doctor.especialidad_codigo == especialidad)
    doctores = list(db.scalars(q.order_by(Doctor.especialidad, Doctor.nombre_completo)))
    return malla(db, doctores, desde or hoy(), dias, punto_atencion_id)


@app.post("/citas/admin/doctores/{doctor_id}/excepciones", status_code=201, dependencies=[Depends(solo_admin)], tags=["Administración"])
def crear_excepcion(doctor_id: str, datos: ExcepcionIn, admin: dict = Depends(solo_admin), db: Session = Depends(get_db)):
    """Bloquea días (vacaciones, incapacidad). Las citas ya agendadas esos días se cancelan y se avisa a los pacientes."""
    d = obtener(db, Doctor, doctor_id, "Doctor no encontrado.")
    e, n = bloquear(db, d, datos.fecha_inicio, datos.fecha_fin, datos.motivo, admin["sub"])
    return {"id": e.id, "citas_canceladas": n}


def citas_en(db: Session, doctor_id, desde: date, hasta: date) -> list[Cita]:
    return list(db.scalars(select(Cita).where(Cita.doctor_id == doctor_id, Cita.estado.in_(ACTIVAS), Cita.fecha.between(desde, hasta))
                           .order_by(Cita.fecha, Cita.hora_inicio)))


def bloquear(db: Session, d: Doctor, desde: date, hasta: date, motivo_bloqueo: str, admin_id: str, antes_de_guardar=None):
    """Crea el bloqueo, cancela las citas de esos días (liberando remisiones) y avisa a cada paciente."""
    e = Excepcion(doctor_id=d.doctor_id, fecha_inicio=desde, fecha_fin=hasta, motivo=motivo_bloqueo[:150])
    db.add(e)
    db.flush()
    afectadas = citas_en(db, d.doctor_id, desde, hasta)
    motivo = "El profesional no estará disponible ese día. Puedes agendar de nuevo desde tu portal."
    for c in afectadas:
        c.estado, c.motivo_cancelacion, c.cancelada_por = "cancelada", motivo, admin_id
    if antes_de_guardar:
        antes_de_guardar(e)
    db.commit()
    for c in afectadas:
        if c.remision_id:
            clientes.liberar_remision(c.remision_id)
        avisar("cita_cancelada", c, d, motivo=motivo)
    return e, len(afectadas)


# ---------------- Ausencias (el doctor solicita, el administrador decide) ----------------
TIPOS_AUSENCIA = {"vacaciones": "Vacaciones", "incapacidad": "Incapacidad", "capacitacion": "Capacitación",
                  "calamidad": "Calamidad doméstica", "otro": "Otro motivo"}


def ausencia_out(db: Session, a: Ausencia, d: Doctor | None = None) -> dict:
    return {"id": a.id, "doctor_id": a.doctor_id, "doctor": d.nombre_completo if d else None, "especialidad": d.especialidad if d else None,
            "tipo": a.tipo, "tipo_texto": TIPOS_AUSENCIA[a.tipo], "fecha_inicio": a.fecha_inicio, "fecha_fin": a.fecha_fin,
            "dias": (a.fecha_fin - a.fecha_inicio).days + 1, "motivo": a.motivo, "estado": a.estado, "respuesta": a.respuesta,
            "revisada_en": a.revisada_en, "creado_en": a.creado_en,
            "citas_afectadas": len(citas_en(db, a.doctor_id, a.fecha_inicio, a.fecha_fin)) if a.estado == "pendiente" else None}


def avisar_ausencia(a: Ausencia, d: Doctor) -> None:
    if not a.contacto_email:
        return
    notificar("ausencia_respondida", "citas", a.contacto_email, d.nombre_completo.split()[0], usuario_id=d.doctor_id,
              ruta="/doctor/ausencias", referencia_id=a.id, tipo=TIPOS_AUSENCIA[a.tipo].lower(),
              desde=fecha_larga(a.fecha_inicio), hasta=fecha_larga(a.fecha_fin),
              decision="aprobada" if a.estado == "aprobada" else "rechazada",
              respuesta=a.respuesta or ("Tu agenda quedó bloqueada esos días." if a.estado == "aprobada" else "Sin observaciones."))


@app.post("/citas/doctor/ausencias", status_code=201, tags=["Doctor"])
def solicitar_ausencia(datos: AusenciaIn, u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    d = obtener(db, Doctor, u["sub"], "Tu agenda todavía no está lista. Intenta en unos minutos.")
    if datos.fecha_inicio < hoy():
        raise HTTPException(422, "La ausencia debe empezar hoy o después.")
    cruce = db.scalar(select(Ausencia.id).where(Ausencia.doctor_id == d.doctor_id, Ausencia.estado.in_(["pendiente", "aprobada"]),
                                                Ausencia.fecha_inicio <= datos.fecha_fin, Ausencia.fecha_fin >= datos.fecha_inicio))
    if cruce:
        raise HTTPException(409, "Ya tienes una solicitud pendiente o aprobada que se cruza con esas fechas.")
    a = Ausencia(doctor_id=d.doctor_id, contacto_email=u.get("correo"), **datos.model_dump())
    db.add(a)
    db.commit()
    return ausencia_out(db, a, d)


@app.get("/citas/doctor/ausencias", tags=["Doctor"])
def mis_ausencias(u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    d = db.get(Doctor, u["sub"])
    return [ausencia_out(db, a, d) for a in db.scalars(select(Ausencia).where(Ausencia.doctor_id == u["sub"])
                                                       .order_by(Ausencia.fecha_inicio.desc()).limit(100))]


@app.post("/citas/doctor/ausencias/{ausencia_id}/cancelar", tags=["Doctor"])
def cancelar_ausencia(ausencia_id: str, u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    a = obtener(db, Ausencia, ausencia_id, "Solicitud no encontrada.")
    if str(a.doctor_id) != u["sub"]:
        raise HTTPException(404, "Solicitud no encontrada.")
    if a.estado != "pendiente":
        raise HTTPException(409, "Solo puedes retirar una solicitud que todavía esté pendiente.")
    a.estado = "cancelada"
    db.commit()
    return ausencia_out(db, a, db.get(Doctor, a.doctor_id))


@app.get("/citas/admin/ausencias", dependencies=[Depends(solo_admin)], tags=["Administración"])
def ausencias_admin(estado: str = Query(default="pendiente", pattern="^(pendiente|resueltas|todas)$"), db: Session = Depends(get_db)):
    q = select(Ausencia, Doctor).join(Doctor, Doctor.doctor_id == Ausencia.doctor_id)
    if estado == "pendiente":
        q = q.where(Ausencia.estado == "pendiente").order_by(Ausencia.fecha_inicio)
    else:
        if estado == "resueltas":
            q = q.where(Ausencia.estado.in_(["aprobada", "rechazada"]))
        q = q.order_by(Ausencia.creado_en.desc())
    return [ausencia_out(db, a, d) for a, d in db.execute(q.limit(200)).all()]


@app.get("/citas/admin/ausencias/cuenta", dependencies=[Depends(solo_admin)], tags=["Administración"])
def ausencias_pendientes(db: Session = Depends(get_db)):
    return {"pendientes": db.scalar(select(func.count()).select_from(Ausencia).where(Ausencia.estado == "pendiente")) or 0}


def ausencia_pendiente(db: Session, ausencia_id: str) -> tuple[Ausencia, Doctor]:
    a = obtener(db, Ausencia, ausencia_id, "Solicitud no encontrada.")
    if a.estado != "pendiente":
        raise HTTPException(409, "Esta solicitud ya fue respondida.")
    return a, db.get(Doctor, a.doctor_id)


@app.post("/citas/admin/ausencias/{ausencia_id}/aprobar", tags=["Administración"])
def aprobar_ausencia(ausencia_id: str, datos: RespuestaAusenciaIn, admin: dict = Depends(solo_admin), db: Session = Depends(get_db)):
    """Aprueba: bloquea esos días en la agenda, cancela las citas que había y avisa a los pacientes y al doctor."""
    a, d = ausencia_pendiente(db, ausencia_id)
    def marcar(e):
        a.estado, a.excepcion_id, a.revisada_por, a.revisada_en = "aprobada", e.id, admin["sub"], func.now()
        a.respuesta = (datos.respuesta or "").strip() or None
    _, n = bloquear(db, d, a.fecha_inicio, a.fecha_fin, f"{TIPOS_AUSENCIA[a.tipo]}: {a.motivo}", admin["sub"], marcar)
    avisar_ausencia(a, d)
    return {**ausencia_out(db, a, d), "citas_canceladas": n}


@app.post("/citas/admin/ausencias/{ausencia_id}/rechazar", tags=["Administración"])
def rechazar_ausencia(ausencia_id: str, datos: RespuestaAusenciaIn, admin: dict = Depends(solo_admin), db: Session = Depends(get_db)):
    a, d = ausencia_pendiente(db, ausencia_id)
    if not datos.respuesta or len(datos.respuesta.strip()) < 5:
        raise HTTPException(422, "Explícale al doctor por qué se rechaza (mínimo 5 caracteres).")
    a.estado, a.respuesta, a.revisada_por, a.revisada_en = "rechazada", datos.respuesta.strip(), admin["sub"], func.now()
    db.commit()
    avisar_ausencia(a, d)
    return ausencia_out(db, a, d)


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
