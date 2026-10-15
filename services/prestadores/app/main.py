"""Microservicio RED DE PRESTADORES · base libitina_prestadores.

Dueño del catálogo de la red: IPS, puntos de atención (sedes), especialidades y
profesionales. El administrador gestiona aquí las especialidades y los doctores.

Al crear un doctor:
  1. Pide a Autenticación su cuenta (rol doctor, sin contraseña).        REST interno
  2. Guarda su perfil profesional.                                        base propia
  3. Avisa a Citas para que actualice su copia del doctor.                evento en Redis
  4. Pide a Notificaciones el correo para que cree su contraseña.        evento en Redis
"""
import logging
import re
import unicodedata
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from . import config
from .db import engine, get_db
from .eventos import enviar_tarea, notificar
from .internos import llamar, json_o_error
from .migrar import aplicar
from .models import Ips, PuntoAtencion, Especialidad, PerfilDoctor
from .schemas import EspecialidadIn, EspecialidadCambio, DoctorIn, DoctorCambio
from .seguridad import requiere_rol, solo_interno

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("prestadores")
app = FastAPI(title="Libitina · Red de Prestadores", version="1.1.0",
              description="IPS, sedes, especialidades y profesionales de la red.")
solo_admin = requiere_rol("admin")


@app.on_event("startup")
def migrar():
    aplicar(engine)


# ---------------- Utilidades ----------------
def slug(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "_", t).strip("_")[:40]


def obtener(db: Session, modelo, id_, mensaje: str):
    try:
        obj = db.get(modelo, id_)
    except Exception:  # noqa: BLE001 - id con formato inválido
        obj = None
    if not obj:
        raise HTTPException(404, mensaje)
    return obj


def ips_out(i: Ips) -> dict:
    return {"id": i.id, "nit": i.nit, "nombre": i.nombre, "nivel": i.nivel, "ciudad": i.ciudad, "departamento": i.departamento,
            "direccion": i.direccion, "telefono": i.telefono, "horario": i.horario, "imagen": i.imagen_url, "servicios": i.servicios,
            "latitud": float(i.latitud) if i.latitud is not None else None, "longitud": float(i.longitud) if i.longitud is not None else None}


def especialidad_out(e: Especialidad, doctores: int | None = None) -> dict:
    d = {"id": e.id, "codigo": e.codigo, "nombre": e.nombre, "descripcion": e.descripcion,
         "requiere_remision": e.requiere_remision, "duracion_cita_min": e.duracion_cita_min, "activa": e.activa}
    if doctores is not None:
        d["doctores"] = doctores
    return d


def doctor_out(d: PerfilDoctor, e: Especialidad | None, completo: bool = False) -> dict:
    base = {"usuario_id": d.usuario_id, "nombre": d.nombre_completo, "especialidad": e.nombre if e else d.especialidad,
            "especialidad_codigo": e.codigo if e else None, "sede_principal_id": d.sede_principal_id, "estado": d.estado}
    if completo:
        base.update({"id": d.id, "especialidad_id": d.especialidad_id, "email": d.email, "documento": d.documento,
                     "tarjeta_profesional": d.tarjeta_profesional, "universidad": d.universidad, "anio_graduacion": d.anio_graduacion,
                     "tipo_vinculacion": d.tipo_vinculacion, "fecha_ingreso": d.fecha_ingreso, "creado_en": d.creado_en})
    return base


def copia_para_citas(d: PerfilDoctor, e: Especialidad) -> dict:
    """Lo que Citas guarda de cada doctor (copia desnormalizada, ver tabla citas.doctores)."""
    return {"doctor_id": str(d.usuario_id), "nombre_completo": d.nombre_completo, "especialidad": e.nombre,
            "especialidad_codigo": e.codigo, "duracion_cita_min": e.duracion_cita_min,
            "sede_principal_id": str(d.sede_principal_id) if d.sede_principal_id else None,
            "activo": d.estado == "activo" and e.activa}


def avisar_a_citas(d: PerfilDoctor, e: Especialidad) -> None:
    enviar_tarea("citas.doctor_actualizado", cola_destino="citas", doctor=copia_para_citas(d, e))


@app.get("/health", tags=["Salud"])
def salud():
    return {"servicio": "prestadores", "estado": "ok"}


# ---------------- IPS y sedes (público) ----------------
@app.get("/prestadores/ips", tags=["IPS"])
def listar_ips(ciudad: str = "", servicio: str = "", q: str = "", db: Session = Depends(get_db)):
    consulta = select(Ips).where(Ips.activa)
    if ciudad:
        consulta = consulta.where(Ips.ciudad == ciudad)
    if servicio:
        consulta = consulta.where(Ips.servicios.contains([servicio]))
    if q:
        patron = f"%{q.lower()}%"
        consulta = consulta.where(func.lower(Ips.nombre).like(patron) | func.lower(Ips.direccion).like(patron))
    return [ips_out(i) for i in db.scalars(consulta.order_by(Ips.nombre))]


@app.get("/prestadores/ips/{ips_id}", tags=["IPS"])
def detalle_ips(ips_id: str, db: Session = Depends(get_db)):
    i = obtener(db, Ips, ips_id, "IPS no encontrada.")
    if not i.activa:
        raise HTTPException(404, "IPS no encontrada.")
    return ips_out(i)


@app.get("/prestadores/puntos-atencion", tags=["Sedes"])
def puntos(ciudad: str = "", db: Session = Depends(get_db)):
    q = select(PuntoAtencion).where(PuntoAtencion.activo)
    if ciudad:
        q = q.where(PuntoAtencion.ciudad == ciudad)
    return [{"id": p.id, "ips_id": p.ips_id, "nombre": p.nombre, "ciudad": p.ciudad, "direccion": p.direccion, "servicios": p.servicios}
            for p in db.scalars(q.order_by(PuntoAtencion.nombre))]


# ---------------- Especialidades ----------------
@app.get("/prestadores/especialidades", tags=["Especialidades"])
def listar_especialidades(incluir_inactivas: bool = False, db: Session = Depends(get_db)):
    q = select(Especialidad)
    if not incluir_inactivas:
        q = q.where(Especialidad.activa)
    conteo = dict(db.execute(select(PerfilDoctor.especialidad_id, func.count()).where(PerfilDoctor.estado == "activo")
                             .group_by(PerfilDoctor.especialidad_id)).all())
    return [especialidad_out(e, conteo.get(e.id, 0)) for e in db.scalars(q.order_by(Especialidad.requiere_remision, Especialidad.nombre))]


@app.get("/prestadores/especialidades/{codigo}", tags=["Especialidades"])
def detalle_especialidad(codigo: str, db: Session = Depends(get_db)):
    e = db.scalar(select(Especialidad).where(Especialidad.codigo == codigo))
    if not e:
        raise HTTPException(404, "Especialidad no encontrada.")
    return especialidad_out(e)


@app.post("/prestadores/especialidades", status_code=201, dependencies=[Depends(solo_admin)], tags=["Especialidades"])
def crear_especialidad(datos: EspecialidadIn, db: Session = Depends(get_db)):
    e = Especialidad(codigo=slug(datos.nombre), **datos.model_dump())
    db.add(e)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Ya existe una especialidad con ese nombre.")
    return especialidad_out(e, 0)


@app.put("/prestadores/especialidades/{especialidad_id}", dependencies=[Depends(solo_admin)], tags=["Especialidades"])
def editar_especialidad(especialidad_id: str, datos: EspecialidadCambio, db: Session = Depends(get_db)):
    e = obtener(db, Especialidad, especialidad_id, "Especialidad no encontrada.")
    if e.codigo == "medicina_general" and (datos.activa is False or datos.requiere_remision):
        raise HTTPException(422, "Medicina general es la puerta de entrada: no se puede desactivar ni exigir remisión.")
    for campo, valor in datos.model_dump(exclude_none=True).items():
        setattr(e, campo, valor)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Ya existe una especialidad con ese nombre.")
    # Citas guarda nombre, duración y si está activa: se le avisa por cada doctor afectado
    for d in db.scalars(select(PerfilDoctor).where(PerfilDoctor.especialidad_id == e.id)):
        avisar_a_citas(d, e)
    return especialidad_out(e)


# ---------------- Doctores (administración) ----------------
@app.get("/prestadores/admin/doctores", dependencies=[Depends(solo_admin)], tags=["Doctores"])
def listar_doctores_admin(db: Session = Depends(get_db)):
    filas = db.execute(select(PerfilDoctor, Especialidad).outerjoin(Especialidad, PerfilDoctor.especialidad_id == Especialidad.id)
                       .order_by(PerfilDoctor.estado, PerfilDoctor.nombre_completo)).all()
    return [doctor_out(d, e, completo=True) for d, e in filas]


@app.post("/prestadores/admin/doctores", status_code=201, dependencies=[Depends(solo_admin)], tags=["Doctores"])
def crear_doctor(datos: DoctorIn, db: Session = Depends(get_db)):
    e = obtener(db, Especialidad, datos.especialidad_id, "La especialidad no existe.")
    if not e.activa:
        raise HTTPException(422, "La especialidad está desactivada.")
    if datos.sede_principal_id:
        obtener(db, PuntoAtencion, datos.sede_principal_id, "La sede no existe.")
    if db.scalar(select(PerfilDoctor.id).where(PerfilDoctor.tarjeta_profesional == datos.tarjeta_profesional)):
        raise HTTPException(409, "Ya existe un doctor con esa tarjeta profesional.")

    # 1. Cuenta en Autenticación (rol doctor, sin contraseña: la crea él con el enlace)
    r = llamar("POST", f"{config.AUTH_URL}/internal/usuarios", "Autenticación", json={
        "tipo_documento": datos.tipo_documento, "numero_documento": datos.numero_documento, "nombres": datos.nombres,
        "apellidos": datos.apellidos, "correo": datos.correo, "rol": "doctor"})
    cuenta = json_o_error(r, "No pudimos crear la cuenta del doctor.")

    # 2. Perfil profesional (si falla, se borra la cuenta: compensación)
    d = PerfilDoctor(usuario_id=cuenta["id"], nombre_completo=f"{datos.nombres} {datos.apellidos}", especialidad=e.nombre,
                     especialidad_id=e.id, tarjeta_profesional=datos.tarjeta_profesional, universidad=datos.universidad,
                     anio_graduacion=datos.anio_graduacion, sede_principal_id=datos.sede_principal_id,
                     tipo_vinculacion=datos.tipo_vinculacion, fecha_ingreso=datos.fecha_ingreso, estado="activo",
                     email=datos.correo.lower(), documento=f"{datos.tipo_documento} {datos.numero_documento}")
    db.add(d)
    try:
        db.commit()
    except Exception:
        db.rollback()
        llamar("DELETE", f"{config.AUTH_URL}/internal/usuarios/{cuenta['id']}", "Autenticación")
        log.exception("Creación de doctor deshecha")
        raise HTTPException(409, "No pudimos guardar el perfil del doctor. Revisa que la tarjeta profesional no esté repetida.")

    # 3 y 4. Eventos: copia en Citas y correo de bienvenida
    avisar_a_citas(d, e)
    notificar("bienvenida_doctor", "prestadores", d.email, datos.nombres, usuario_id=d.usuario_id,
              ruta=cuenta["enlace_clave"].replace(config.FRONTEND_URL, ""), especialidad=e.nombre)
    return doctor_out(d, e, completo=True)


@app.put("/prestadores/admin/doctores/{doctor_id}", dependencies=[Depends(solo_admin)], tags=["Doctores"])
def editar_doctor(doctor_id: str, datos: DoctorCambio, db: Session = Depends(get_db)):
    d = obtener(db, PerfilDoctor, doctor_id, "Doctor no encontrado.")
    if datos.especialidad_id:
        e = obtener(db, Especialidad, datos.especialidad_id, "La especialidad no existe.")
        d.especialidad_id, d.especialidad = e.id, e.nombre
    if datos.sede_principal_id:
        obtener(db, PuntoAtencion, datos.sede_principal_id, "La sede no existe.")
        d.sede_principal_id = datos.sede_principal_id
    for campo in ("tipo_vinculacion", "universidad"):
        if getattr(datos, campo) is not None:
            setattr(d, campo, getattr(datos, campo))
    estado_anterior = d.estado
    if datos.estado:
        d.estado = datos.estado
    db.commit()
    # Inactivo = no puede iniciar sesión. Vacaciones = entra, pero no recibe citas nuevas.
    if datos.estado and (datos.estado == "inactivo") != (estado_anterior == "inactivo"):
        json_o_error(llamar("PATCH", f"{config.AUTH_URL}/internal/usuarios/{d.usuario_id}", "Autenticación",
                            json={"activo": datos.estado != "inactivo"}), "No pudimos cambiar el acceso del doctor.")
    e = db.get(Especialidad, d.especialidad_id) if d.especialidad_id else None
    if e:
        avisar_a_citas(d, e)
    return doctor_out(d, e, completo=True)


@app.post("/prestadores/admin/doctores/{doctor_id}/reenviar-acceso", dependencies=[Depends(solo_admin)], tags=["Doctores"])
def reenviar_acceso(doctor_id: str, db: Session = Depends(get_db)):
    """Nuevo correo para crear la contraseña (si el doctor perdió o dejó vencer el primero)."""
    d = obtener(db, PerfilDoctor, doctor_id, "Doctor no encontrado.")
    r = json_o_error(llamar("POST", f"{config.AUTH_URL}/internal/usuarios/{d.usuario_id}/enlace-clave", "Autenticación"),
                     "No pudimos generar el enlace.")
    e = db.get(Especialidad, d.especialidad_id) if d.especialidad_id else None
    notificar("bienvenida_doctor", "prestadores", d.email, d.nombre_completo.split()[0], usuario_id=d.usuario_id,
              ruta=r["enlace_clave"].replace(config.FRONTEND_URL, ""), especialidad=e.nombre if e else d.especialidad)
    return {"mensaje": f"Enviamos un nuevo enlace de acceso a {d.email}."}


# ---------------- Doctores (público y del propio doctor) ----------------
@app.get("/prestadores/doctores", tags=["Doctores"])
def doctores(especialidad: str = "", db: Session = Depends(get_db)):
    q = select(PerfilDoctor, Especialidad).join(Especialidad, PerfilDoctor.especialidad_id == Especialidad.id).where(PerfilDoctor.estado == "activo")
    if especialidad:
        q = q.where(Especialidad.codigo == especialidad)
    return [doctor_out(d, e) for d, e in db.execute(q.order_by(PerfilDoctor.nombre_completo))]


@app.get("/prestadores/doctores/me", tags=["Doctores"])
def mi_perfil(u: dict = Depends(requiere_rol("doctor")), db: Session = Depends(get_db)):
    fila = db.execute(select(PerfilDoctor, Especialidad).outerjoin(Especialidad, PerfilDoctor.especialidad_id == Especialidad.id)
                      .where(PerfilDoctor.usuario_id == u["sub"])).first()
    if not fila:
        raise HTTPException(404, "No encontramos tu perfil profesional.")
    return doctor_out(*fila, completo=True)


# ---------------- Solo para otros microservicios ----------------
@app.get("/internal/doctores", dependencies=[Depends(solo_interno)], tags=["Interno"])
def doctores_internos(db: Session = Depends(get_db)):
    """Todos los doctores, para que Citas reconcilie su copia si se perdió algún evento."""
    filas = db.execute(select(PerfilDoctor, Especialidad).join(Especialidad, PerfilDoctor.especialidad_id == Especialidad.id)).all()
    return [copia_para_citas(d, e) for d, e in filas]
