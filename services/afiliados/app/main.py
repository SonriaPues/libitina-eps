import logging
from datetime import date, datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, Request, Query
from sqlalchemy import select, func
from psycopg.errors import UniqueViolation
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from . import config, clientes, reglas
from .db import get_db
from .eventos import publicar
from .models import Afiliado, Regimen, Novedad, Consentimiento, Tarifa, Medicamento, ServicioPbs
from .schemas import InscripcionIn, ReenvioIn, RechazoIn
from .seguridad import usuario_del_token, requiere_rol, solo_interno

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("afiliados")
app = FastAPI(title="Libitina · Afiliados", version="1.0.0",
              description="Inscripción, grupo familiar, aprobación de afiliaciones y catálogos del plan de beneficios.")

CAMPOS_TITULAR = ("tipo_documento", "numero_documento", "nombres", "apellidos", "fecha_nacimiento", "sexo", "telefono",
                  "direccion", "departamento", "ciudad", "zona", "pertenencia_etnica", "tiene_discapacidad", "tipo_discapacidad")
CAMPOS_BENEF = ("tipo_documento", "numero_documento", "nombres", "apellidos", "fecha_nacimiento", "sexo", "parentesco",
                "incapacidad_permanente", "pertenencia_etnica", "tiene_discapacidad", "tipo_discapacidad")
CAMPOS_AFILIACION = ("tipo_cotizante", "categoria", "empleador_nit", "empleador_nombre", "grupo_sisben")
TEXTO_ESTADO = {"pendiente": "Solicitud en revisión", "activo": "Afiliación aprobada", "rechazado": "Solicitud rechazada"}


def ahora():
    return datetime.now(timezone.utc)


def ip_de(request: Request) -> str | None:
    return (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "")).split(",")[0].strip() or None


def regimen_id(db: Session, codigo: str):
    return db.scalar(select(Regimen.id).where(Regimen.codigo == codigo))


def beneficiarios_de(db: Session, cotizante_id):
    return db.scalars(select(Afiliado).where(Afiliado.cotizante_id == cotizante_id, Afiliado.eliminado_en.is_(None))
                      .order_by(Afiliado.creado_en, Afiliado.apellidos, Afiliado.nombres, Afiliado.id)).all()


def documento_ocupado(db: Session, tipo: str, numero: str, excepto=None) -> bool:
    q = select(Afiliado.id).where(Afiliado.tipo_documento == tipo, Afiliado.numero_documento == numero)
    if excepto:
        q = q.where(Afiliado.id.notin_(excepto))
    return db.scalar(q) is not None


def cambiar_estado(db: Session, afiliado: Afiliado, nuevo: str, motivo: str, por=None):
    db.add(Novedad(afiliado_id=afiliado.id, estado_anterior=afiliado.estado, estado_nuevo=nuevo, motivo=motivo, registrado_por=por))
    afiliado.estado = nuevo


def afiliado_out(db: Session, a: Afiliado) -> dict:
    """Forma que consume el front: titular, grupo familiar e historial."""
    codigo = db.scalar(select(Regimen.codigo).where(Regimen.id == a.regimen_id))
    ben = beneficiarios_de(db, a.id)
    historial = db.scalars(select(Novedad).where(Novedad.afiliado_id == a.id).order_by(Novedad.fecha)).all()
    return {
        "id": a.id, "usuario_id": a.usuario_id, "estado": a.estado, "motivo_rechazo": a.motivo_rechazo, "creado_en": a.creado_en,
        "fecha_afiliacion": a.fecha_afiliacion, "email": a.email, "regimen": codigo, "ips_id": a.ips_id,
        **{c: getattr(a, c) for c in CAMPOS_TITULAR + CAMPOS_AFILIACION},
        "beneficiarios": [{"id": b.id, "estado": b.estado, **{c: getattr(b, c) for c in CAMPOS_BENEF}} for b in ben],
        "historial": [{"estado": n.estado_nuevo, "fecha": n.fecha, "detalle": n.motivo} for n in historial],
    }


def mi_afiliado(db: Session, token: dict) -> Afiliado:
    a = db.scalar(select(Afiliado).where(Afiliado.usuario_id == token["sub"], Afiliado.eliminado_en.is_(None)))
    if not a:
        raise HTTPException(404, "No encontramos una afiliación asociada a tu cuenta.")
    return a


@app.get("/health", tags=["Salud"])
def salud():
    return {"servicio": "afiliados", "estado": "ok"}


# ---------------- Inscripción (público) ----------------
@app.post("/afiliados/inscripcion", status_code=201, tags=["Inscripción"])
def inscripcion(datos: InscripcionIn, request: Request, db: Session = Depends(get_db)):
    t, af = datos.titular, datos.afiliacion
    reglas.validar_titular(t)
    reglas.validar_grupo(t, datos.beneficiarios)
    for p in [t, *datos.beneficiarios]:
        if documento_ocupado(db, p.tipo_documento, p.numero_documento):
            raise HTTPException(409, f"El documento {p.tipo_documento} {p.numero_documento} ya está registrado en Libitina EPS.")
    if not clientes.ips_existe(af.ips_id):
        raise HTTPException(422, "La IPS elegida no existe o no está activa.")

    # 1. La cuenta se crea en Autenticación; si algo falla después, se deshace (compensación).
    cuenta = clientes.crear_usuario({"tipo_documento": t.tipo_documento, "numero_documento": t.numero_documento,
                                     "nombres": t.nombres, "apellidos": t.apellidos,
                                     "correo": datos.cuenta.correo, "clave": datos.cuenta.clave})
    try:
        reg = regimen_id(db, af.regimen)
        titular = Afiliado(usuario_id=cuenta["id"], email=datos.cuenta.correo.lower(), regimen_id=reg, ips_id=af.ips_id,
                           tipo_afiliado="cotizante", estado="pendiente",
                           **t.model_dump(), **af.model_dump(include=set(CAMPOS_AFILIACION)))
        db.add(titular)
        db.flush()
        db.add(Novedad(afiliado_id=titular.id, estado_anterior=None, estado_nuevo="pendiente", motivo="Solicitud de afiliación enviada"))
        for b in datos.beneficiarios:
            ben = Afiliado(tipo_afiliado="beneficiario", cotizante_id=titular.id, regimen_id=reg, ips_id=af.ips_id, estado="pendiente",
                           ciudad=t.ciudad, departamento=t.departamento, zona=t.zona, direccion=t.direccion,
                           **b.model_dump(exclude={"id"}))
            db.add(ben)
            db.flush()
            db.add(Novedad(afiliado_id=ben.id, estado_nuevo="pendiente", motivo="Incluido en la solicitud del cotizante"))
        c = datos.consentimiento
        db.add(Consentimiento(afiliado_id=titular.id, version_politica=config.VERSION_POLITICA, ip_origen=ip_de(request), **c.model_dump()))
        db.commit()
    except Exception as e:
        db.rollback()
        clientes.borrar_usuario(cuenta["id"])
        log.exception("Inscripción deshecha")
        if isinstance(e, IntegrityError):
            raise HTTPException(409, "Uno de los documentos ya está registrado en Libitina EPS.")
        raise HTTPException(500, "No pudimos guardar tu solicitud. Intenta de nuevo.")

    publicar("afiliacion_recibida", cuenta["id"], titular.email, t.nombres, cuenta["enlace_verificacion"], referencia_id=titular.id)
    return {"afiliado_id": titular.id, "estado": "pendiente"}


# ---------------- Afiliado con sesión ----------------
@app.get("/afiliados/me", tags=["Mi afiliación"])
def mi_afiliacion(token: dict = Depends(usuario_del_token), db: Session = Depends(get_db)):
    return afiliado_out(db, mi_afiliado(db, token))


@app.put("/afiliados/me/reenviar", tags=["Mi afiliación"])
def reenviar(datos: ReenvioIn, token: dict = Depends(usuario_del_token), db: Session = Depends(get_db)):
    """Corrige y reenvía una solicitud rechazada. El documento del titular no se puede cambiar."""
    a = mi_afiliado(db, token)
    if a.estado != "rechazado":
        raise HTTPException(409, "Solo puedes corregir una solicitud rechazada.")
    t, af = datos.titular, datos.afiliacion
    if (t.tipo_documento, t.numero_documento) != (a.tipo_documento, a.numero_documento):
        raise HTTPException(422, "El documento del titular no se puede cambiar. Si está mal, comunícate con atención al usuario.")
    reglas.validar_titular(t)
    reglas.validar_grupo(t, datos.beneficiarios)
    if not clientes.ips_existe(af.ips_id):
        raise HTTPException(422, "La IPS elegida no existe o no está activa.")

    actuales = {b.id: b for b in beneficiarios_de(db, a.id)}
    propios = [a.id, *actuales.keys()]
    for b in datos.beneficiarios:
        if b.id and b.id not in actuales:
            raise HTTPException(422, "Uno de los beneficiarios no pertenece a tu solicitud.")
        if documento_ocupado(db, b.tipo_documento, b.numero_documento, excepto=propios):
            raise HTTPException(409, f"El documento {b.tipo_documento} {b.numero_documento} ya está registrado en Libitina EPS.")

    reg = regimen_id(db, af.regimen)
    for c, v in {**t.model_dump(), **af.model_dump(include=set(CAMPOS_AFILIACION)), "regimen_id": reg, "ips_id": af.ips_id}.items():
        setattr(a, c, v)
    a.motivo_rechazo = None
    cambiar_estado(db, a, "pendiente", "Solicitud corregida y reenviada", token["sub"])
    enviados = {b.id for b in datos.beneficiarios if b.id}
    for id_, b in actuales.items():
        if id_ not in enviados:
            b.eliminado_en = ahora()
            b.numero_documento = f"X{str(b.id)[:8]}"  # libera el documento para una futura afiliación
    for b in datos.beneficiarios:
        campos = {**b.model_dump(exclude={"id"}), "regimen_id": reg, "ips_id": af.ips_id, "ciudad": t.ciudad,
                  "departamento": t.departamento, "zona": t.zona, "direccion": t.direccion}
        if b.id:
            ben = actuales[b.id]
            for c, v in campos.items():
                setattr(ben, c, v)
            ben.motivo_rechazo = None
            cambiar_estado(db, ben, "pendiente", "Solicitud corregida y reenviada", token["sub"])
        else:
            ben = Afiliado(tipo_afiliado="beneficiario", cotizante_id=a.id, estado="pendiente", **campos)
            db.add(ben)
            db.flush()
            db.add(Novedad(afiliado_id=ben.id, estado_nuevo="pendiente", motivo="Agregado al corregir la solicitud"))
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        if isinstance(e.orig, UniqueViolation):
            raise HTTPException(409, "Uno de los documentos ya está registrado en Libitina EPS.")
        log.exception("Reenvío rechazado por la base")
        raise HTTPException(422, "Los datos de la solicitud no cumplen las reglas de afiliación. Revísalos e intenta de nuevo.")
    return afiliado_out(db, a)


# ---------------- Consulta pública ----------------
@app.get("/afiliados/consulta", tags=["Consulta pública"])
def consulta(tipo: str = Query(pattern="^(CC|TI|RC|CE|PPT|PA)$"), numero: str = Query(pattern=r"^[0-9A-Za-z]{3,20}$"),
             db: Session = Depends(get_db)):
    a = db.scalar(select(Afiliado).where(Afiliado.tipo_documento == tipo, Afiliado.numero_documento == numero, Afiliado.eliminado_en.is_(None)))
    if not a:
        return {"encontrado": False}
    return {"encontrado": True, "nombre": f"{a.nombres.split()[0]} {reglas.ocultar(a.apellidos)}".upper(),
            "regimen": db.scalar(select(Regimen.codigo).where(Regimen.id == a.regimen_id)), "estado": a.estado,
            "ips_id": a.ips_id, "tipo_afiliado": a.tipo_afiliado}


# ---------------- Administración ----------------
@app.get("/afiliados/solicitudes", tags=["Administración"])
def solicitudes(estado: str | None = Query(default=None, pattern="^(pendiente|activo|rechazado)$"),
                _: dict = Depends(requiere_rol("admin")), db: Session = Depends(get_db)):
    q = select(Afiliado).where(Afiliado.tipo_afiliado == "cotizante", Afiliado.eliminado_en.is_(None))
    if estado:
        q = q.where(Afiliado.estado == estado)
    return [afiliado_out(db, a) for a in db.scalars(q.order_by(Afiliado.creado_en.desc()).limit(200))]


def solicitud_pendiente(db: Session, afiliado_id) -> Afiliado:
    a = db.get(Afiliado, afiliado_id)
    if not a or a.tipo_afiliado != "cotizante" or a.eliminado_en:
        raise HTTPException(404, "Solicitud no encontrada.")
    if a.estado != "pendiente":
        raise HTTPException(409, "Esta solicitud ya fue revisada.")
    return a


@app.post("/afiliados/solicitudes/{afiliado_id}/aprobar", tags=["Administración"])
def aprobar(afiliado_id: str, admin: dict = Depends(requiere_rol("admin")), db: Session = Depends(get_db)):
    a = solicitud_pendiente(db, afiliado_id)
    for x in [a, *beneficiarios_de(db, a.id)]:
        cambiar_estado(db, x, "activo", "Afiliación aprobada", admin["sub"])
        x.fecha_afiliacion = date.today()
    db.commit()
    publicar("afiliacion_aprobada", a.usuario_id, a.email, a.nombres, f"{config.FRONTEND_URL}/portal", referencia_id=a.id)
    return afiliado_out(db, a)


@app.post("/afiliados/solicitudes/{afiliado_id}/rechazar", tags=["Administración"])
def rechazar(afiliado_id: str, datos: RechazoIn, admin: dict = Depends(requiere_rol("admin")), db: Session = Depends(get_db)):
    a = solicitud_pendiente(db, afiliado_id)
    for x in [a, *beneficiarios_de(db, a.id)]:
        x.motivo_rechazo = datos.motivo
        cambiar_estado(db, x, "rechazado", f"Solicitud rechazada: {datos.motivo}", admin["sub"])
    db.commit()
    publicar("afiliacion_rechazada", a.usuario_id, a.email, a.nombres, f"{config.FRONTEND_URL}/portal", referencia_id=a.id, motivo=datos.motivo)
    return afiliado_out(db, a)


# ---------------- Catálogos públicos ----------------
@app.get("/afiliados/regimenes", tags=["Catálogos"])
def regimenes(db: Session = Depends(get_db)):
    return [{"codigo": r.codigo, "nombre": r.nombre, "descripcion": r.descripcion} for r in db.scalars(select(Regimen))]


@app.get("/afiliados/tarifas", tags=["Catálogos"])
def tarifas(anio: int = 2026, db: Session = Depends(get_db)):
    return [{"regimen": t.regimen, "categoria": t.categoria, "cuota_moderadora": float(t.cuota_moderadora),
             "porcentaje_copago": float(t.porcentaje_copago), "tope_evento": float(t.tope_evento or 0), "tope_anual": float(t.tope_anual or 0)}
            for t in db.scalars(select(Tarifa).where(Tarifa.anio == anio).order_by(Tarifa.regimen, Tarifa.categoria))]


@app.get("/afiliados/medicamentos", tags=["Catálogos"])
def medicamentos(q: str = "", grupo: str = "", db: Session = Depends(get_db)):
    consulta = select(Medicamento).where(Medicamento.activo)
    if q:
        consulta = consulta.where(func.lower(Medicamento.nombre_generico).contains(q.lower()))
    if grupo:
        consulta = consulta.where(Medicamento.grupo == grupo)
    return [{"nombre": m.nombre_generico, "presentacion": " · ".join(filter(None, [m.concentracion, (m.forma_farmaceutica or "").lower()])),
             "grupo": m.grupo, "cobertura": "PBS" if m.cubierto_pbs else "MIPRES"} for m in db.scalars(consulta.order_by(Medicamento.nombre_generico))]


@app.get("/afiliados/plan-beneficios", tags=["Catálogos"])
def plan_beneficios(db: Session = Depends(get_db)):
    return [{"categoria": s.categoria, "nombre": s.nombre, "requiere_autorizacion": s.requiere_autorizacion}
            for s in db.scalars(select(ServicioPbs).where(ServicioPbs.activo))]


# ---------------- Solo para otros microservicios (Citas, Trámites, Historia) ----------------
def persona_interna(p: Afiliado) -> dict:
    return {"id": str(p.id), "nombres": p.nombres, "apellidos": p.apellidos, "tipo_documento": p.tipo_documento,
            "numero_documento": p.numero_documento, "fecha_nacimiento": p.fecha_nacimiento.isoformat(), "sexo": p.sexo,
            "estado": p.estado, "tipo_afiliado": p.tipo_afiliado, "parentesco": p.parentesco}


def grupo_interno(db: Session, titular: Afiliado) -> dict:
    return {"titular": {**persona_interna(titular), "usuario_id": str(titular.usuario_id) if titular.usuario_id else None,
                        "email": titular.email},
            "beneficiarios": [persona_interna(b) for b in beneficiarios_de(db, titular.id)],
            "regimen": db.scalar(select(Regimen.codigo).where(Regimen.id == titular.regimen_id)),
            "categoria": titular.categoria, "grupo_sisben": titular.grupo_sisben,
            "ips_id": str(titular.ips_id) if titular.ips_id else None, "fecha_afiliacion": titular.fecha_afiliacion.isoformat() if titular.fecha_afiliacion else None}


@app.get("/internal/afiliados/grupo", dependencies=[Depends(solo_interno)], tags=["Interno"])
def grupo_por_usuario(usuario_id: str, db: Session = Depends(get_db)):
    """Titular (dueño de la cuenta) y sus beneficiarios."""
    t = db.scalar(select(Afiliado).where(Afiliado.usuario_id == usuario_id, Afiliado.eliminado_en.is_(None)))
    if not t:
        raise HTTPException(404, "No encontramos una afiliación asociada a tu cuenta.")
    return grupo_interno(db, t)


@app.get("/internal/afiliados/{afiliado_id}", dependencies=[Depends(solo_interno)], tags=["Interno"])
def afiliado_interno(afiliado_id: str, db: Session = Depends(get_db)):
    """Una persona (titular o beneficiario) con los datos de su grupo."""
    try:
        p = db.get(Afiliado, afiliado_id)
    except Exception:  # noqa: BLE001 - id con formato inválido
        p = None
    if not p or p.eliminado_en:
        raise HTTPException(404, "Afiliado no encontrado.")
    titular = p if p.tipo_afiliado == "cotizante" else db.get(Afiliado, p.cotizante_id)
    return {"persona": persona_interna(p), **grupo_interno(db, titular)}
