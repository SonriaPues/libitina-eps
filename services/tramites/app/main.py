"""Microservicio de TRÁMITES · base libitina_tramites.

- Remisiones: el doctor remite a un especialista desde la consulta (autorización de tipo
  consulta_especializada, vigente 90 días). Citas las consume por endpoints internos.
- Certificados de afiliación en PDF con código de verificación y QR.
- PQRSD: radicado automático, plazo en días hábiles con festivos de Colombia,
  radicación anónima, consulta pública y bandeja del administrador.
Todo trámite recibe un radicado (LIB-PQR-2026-000123) que genera la base de datos.
"""
import logging
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends, HTTPException, Query, Response
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from . import clientes, config
from .db import engine, get_db
from .eventos import notificar
from .fechas import sumar_habiles, habiles_entre
from .migrar import aplicar
from .models import Tramite, Pqrsd, Autorizacion, Certificado
from .pdf import certificado_afiliacion
from .schemas import RemisionIn, UsarRemisionIn, PqrsdIn, RespuestaIn
from .seguridad import requiere_rol, usuario_del_token, usuario_opcional, solo_interno
from .tiempo import hoy, fecha_larga

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("tramites")
app = FastAPI(title="Libitina · Trámites", version="1.0.0",
              description="Remisiones, certificados de afiliación y PQRSD.")
solo_afiliado, solo_doctor, solo_admin = requiere_rol("afiliado"), requiere_rol("doctor"), requiere_rol("admin")
TIPOS_PQRSD = {"peticion": "petición", "queja": "queja", "reclamo": "reclamo", "sugerencia": "sugerencia", "denuncia": "denuncia"}


@app.on_event("startup")
def migrar():
    aplicar(engine)


def obtener(db: Session, modelo, id_, mensaje: str):
    try:
        obj = db.get(modelo, id_)
    except Exception:  # noqa: BLE001
        obj = None
    if not obj:
        raise HTTPException(404, mensaje)
    return obj


def enmascarar_nombre(nombre: str) -> str:
    partes = nombre.split()
    return " ".join([partes[0]] + [p[0] + "***" for p in partes[1:]]).upper() if partes else ""


def enmascarar_documento(doc: str) -> str:
    tipo, _, numero = doc.partition(" ")
    return f"{tipo} {'*' * max(len(numero) - 4, 0)}{numero[-4:]}"


@app.get("/health", tags=["Salud"])
def salud():
    return {"servicio": "tramites", "estado": "ok"}


# =====================================================================
# Remisiones
# =====================================================================
def estado_remision(a: Autorizacion) -> str:
    if a.cita_uso_id:
        return "usada"
    return "vencida" if a.fecha_vencimiento and a.fecha_vencimiento < hoy() else "vigente"


def remision_out(a: Autorizacion, t: Tramite) -> dict:
    return {"id": a.id, "radicado": t.radicado, "afiliado_id": a.afiliado_id, "paciente": t.datos.get("paciente"),
            "especialidad_codigo": a.especialidad_codigo, "especialidad": a.descripcion_servicio.replace("Consulta de ", ""),
            "doctor": t.datos.get("doctor"), "diagnostico": f"{a.diagnostico_cie10} · {a.diagnostico_desc}",
            "urgente": a.urgente, "emitida": t.creado_en, "vence": a.fecha_vencimiento, "estado": estado_remision(a)}


@app.post("/tramites/remisiones", status_code=201, tags=["Remisiones"])
def emitir_remision(datos: RemisionIn, u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    c = clientes.cita(datos.cita_id)
    if c["doctor_id"] != u["sub"]:
        raise HTTPException(403, "Solo puedes remitir a pacientes de tus propias citas.")
    if c["estado"] not in ("confirmada", "realizada") or not c["es_hoy_o_antes"]:
        raise HTTPException(422, "Solo se remite durante o después de la atención.")
    esp = clientes.especialidad(datos.especialidad_codigo)
    if not esp["activa"] or not esp["requiere_remision"]:
        raise HTTPException(422, f"{esp['nombre']} no requiere remisión: el paciente puede agendarla directamente.")
    ya = db.scalar(select(Autorizacion.id).where(Autorizacion.afiliado_id == c["afiliado_id"], Autorizacion.especialidad_codigo == esp["codigo"],
                                                 Autorizacion.cita_uso_id.is_(None), Autorizacion.fecha_vencimiento >= hoy()))
    if ya:
        raise HTTPException(409, f"El paciente ya tiene una remisión vigente a {esp['nombre']}.")
    t = Tramite(tipo="autorizacion_medica", estado="aprobado", solicitante_id=u["sub"], solicitante_rol="doctor",
                afiliado_id=c["afiliado_id"], datos={"paciente": c["paciente"], "doctor": u.get("nombre"), "cita_origen": str(c["id"])})
    db.add(t)
    db.flush()
    a = Autorizacion(tramite_id=t.id, afiliado_id=c["afiliado_id"], doctor_id=u["sub"], tipo="consulta_especializada",
                     descripcion_servicio=f"Consulta de {esp['nombre']}", descripcion_clinica=datos.descripcion_clinica.strip(),
                     diagnostico_cie10=datos.diagnostico_cie10, diagnostico_desc=datos.diagnostico_desc.strip(), urgente=datos.urgente,
                     fecha_vencimiento=hoy() + timedelta(days=config.DIAS_VIGENCIA_REMISION), especialidad_codigo=esp["codigo"],
                     cita_origen_id=c["id"])
    db.add(a)
    db.commit()
    notificar("remision_emitida", "tramites", c.get("contacto_email"), c.get("contacto_nombre") or "",
              usuario_id=c.get("titular_usuario_id"), ruta="/portal/citas", referencia_id=a.id, paciente=c["paciente"],
              especialidad=esp["nombre"], doctor=u.get("nombre", ""), vence=fecha_larga(a.fecha_vencimiento))
    return remision_out(a, t)


@app.get("/tramites/remisiones/cita/{cita_id}", tags=["Remisiones"])
def remisiones_de_cita(cita_id: str, u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    filas = db.execute(select(Autorizacion, Tramite).join(Tramite, Tramite.id == Autorizacion.tramite_id)
                       .where(Autorizacion.cita_origen_id == cita_id, Autorizacion.doctor_id == u["sub"])).all()
    return [remision_out(a, t) for a, t in filas]


@app.get("/tramites/remisiones/mias", tags=["Remisiones"])
def mis_remisiones(u: dict = Depends(solo_afiliado), db: Session = Depends(get_db)):
    grupo = clientes.grupo_de_usuario(u["sub"])
    ids = [grupo["titular"]["id"], *[b["id"] for b in grupo["beneficiarios"]]]
    filas = db.execute(select(Autorizacion, Tramite).join(Tramite, Tramite.id == Autorizacion.tramite_id)
                       .where(Autorizacion.afiliado_id.in_(ids), Autorizacion.tipo == "consulta_especializada")
                       .order_by(Tramite.creado_en.desc())).all()
    return [remision_out(a, t) for a, t in filas]


@app.get("/tramites/remisiones/emitidas", tags=["Remisiones"])
def remisiones_emitidas(u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    """Las remisiones que firmó el doctor, con su estado (vigente, usada o vencida)."""
    filas = db.execute(select(Autorizacion, Tramite).join(Tramite, Tramite.id == Autorizacion.tramite_id)
                       .where(Autorizacion.doctor_id == u["sub"], Autorizacion.tipo == "consulta_especializada")
                       .order_by(Tramite.creado_en.desc()).limit(300)).all()
    return [remision_out(a, t) for a, t in filas]


@app.get("/internal/remisiones/vigente", dependencies=[Depends(solo_interno)], tags=["Interno"])
def remision_vigente(afiliado_id: str, especialidad: str, db: Session = Depends(get_db)):
    a = db.scalar(select(Autorizacion).where(Autorizacion.afiliado_id == afiliado_id, Autorizacion.especialidad_codigo == especialidad,
                                             Autorizacion.cita_uso_id.is_(None), Autorizacion.fecha_vencimiento >= hoy())
                  .order_by(Autorizacion.fecha_vencimiento))
    if not a:
        raise HTTPException(404, "Sin remisión vigente.")
    return {"id": a.id, "vence": a.fecha_vencimiento}


@app.post("/internal/remisiones/{remision_id}/usar", dependencies=[Depends(solo_interno)], tags=["Interno"])
def usar_remision(remision_id: str, datos: UsarRemisionIn, db: Session = Depends(get_db)):
    """Marca la remisión como usada por una cita. Si se reagenda, pasa de la cita anterior a la nueva."""
    a = obtener(db, Autorizacion, remision_id, "Remisión no encontrada.")
    if a.cita_uso_id and a.cita_uso_id != datos.cita_anterior_id and a.cita_uso_id != datos.cita_id:
        raise HTTPException(409, "La remisión ya se usó en otra cita.")
    if not a.cita_uso_id and a.fecha_vencimiento < hoy():
        raise HTTPException(422, "La remisión está vencida.")
    a.cita_uso_id = datos.cita_id
    db.commit()
    return {"id": a.id, "cita_uso_id": a.cita_uso_id}


@app.post("/internal/remisiones/{remision_id}/liberar", dependencies=[Depends(solo_interno)], tags=["Interno"])
def liberar_remision(remision_id: str, db: Session = Depends(get_db)):
    """Al cancelar la cita, la remisión vuelve a quedar disponible (si no ha vencido)."""
    a = obtener(db, Autorizacion, remision_id, "Remisión no encontrada.")
    a.cita_uso_id = None
    db.commit()
    return {"id": a.id, "estado": estado_remision(a)}


# =====================================================================
# Certificados de afiliación
# =====================================================================
ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # sin 0/O ni 1/I para que no se confundan


def nuevo_codigo() -> str:
    c = "".join(secrets.choice(ALFABETO) for _ in range(8))
    return f"{c[:4]}-{c[4:]}"


def url_verificacion(codigo: str) -> str:
    return f"{config.FRONTEND_URL}/tramites/verificar-certificado?codigo={codigo}"


def certificado_out(cert: Certificado, t: Tramite) -> dict:
    return {"id": cert.id, "radicado": t.radicado, "codigo": cert.codigo_verificacion, "generado_en": cert.generado_en,
            "vigente_hasta": cert.vigente_hasta, "vigente": cert.vigente_hasta >= hoy(), "url_pdf": cert.archivo_url,
            "titular": t.datos["titular"]["nombre"], "beneficiarios": len(t.datos["beneficiarios"])}


@app.post("/tramites/certificados", status_code=201, tags=["Certificados"])
def expedir_certificado(u: dict = Depends(solo_afiliado), db: Session = Depends(get_db)):
    grupo = clientes.grupo_de_usuario(u["sub"])
    titular = grupo["titular"]
    if titular["estado"] != "activo":
        raise HTTPException(422, "El certificado se expide cuando la afiliación está activa.")
    persona = lambda p: f"{p['nombres']} {p['apellidos']}"  # noqa: E731
    datos = {"titular": {"nombre": persona(titular), "documento": f"{titular['tipo_documento']} {titular['numero_documento']}"},
             "beneficiarios": [{"nombre": persona(b), "documento": f"{b['tipo_documento']} {b['numero_documento']}",
                                "parentesco": b["parentesco"], "estado": b["estado"]} for b in grupo["beneficiarios"]],
             "regimen": grupo["regimen"], "categoria": grupo["categoria"], "grupo_sisben": grupo["grupo_sisben"],
             "ips": clientes.nombre_ips(grupo["ips_id"]), "fecha_afiliacion": grupo["fecha_afiliacion"], "expedido": hoy().isoformat()}
    t = Tramite(tipo="certificado", estado="aprobado", solicitante_id=u["sub"], solicitante_rol="afiliado",
                afiliado_id=titular["id"], datos=datos)
    db.add(t)
    db.flush()
    cert = Certificado(tramite_id=t.id, afiliado_id=titular["id"], codigo_verificacion=nuevo_codigo(), archivo_url="",
                       vigente_hasta=hoy() + timedelta(days=config.DIAS_VIGENCIA_CERTIFICADO))
    db.add(cert)
    db.flush()
    cert.archivo_url = f"/api/v1/tramites/certificados/{cert.id}/pdf"
    db.commit()
    return certificado_out(cert, t)


@app.get("/tramites/certificados", tags=["Certificados"])
def mis_certificados(u: dict = Depends(solo_afiliado), db: Session = Depends(get_db)):
    filas = db.execute(select(Certificado, Tramite).join(Tramite, Tramite.id == Certificado.tramite_id)
                       .where(Tramite.solicitante_id == u["sub"]).order_by(Certificado.generado_en.desc()).limit(50)).all()
    return [certificado_out(c, t) for c, t in filas]


@app.get("/tramites/certificados/verificar/{codigo}", tags=["Certificados"])
def verificar_certificado(codigo: str, db: Session = Depends(get_db)):
    """Público: una empresa o un colegio comprueban que el certificado es auténtico."""
    fila = db.execute(select(Certificado, Tramite).join(Tramite, Tramite.id == Certificado.tramite_id)
                      .where(Certificado.codigo_verificacion == codigo.strip().upper())).first()
    if not fila:
        return {"valido": False}
    cert, t = fila
    return {"valido": True, "vigente": cert.vigente_hasta >= hoy(), "radicado": t.radicado,
            "titular": enmascarar_nombre(t.datos["titular"]["nombre"]), "documento": enmascarar_documento(t.datos["titular"]["documento"]),
            "regimen": t.datos["regimen"], "beneficiarios": len(t.datos["beneficiarios"]),
            "expedido": t.datos["expedido"], "vigente_hasta": cert.vigente_hasta}


@app.get("/tramites/certificados/{certificado_id}/pdf", tags=["Certificados"])
def descargar_certificado(certificado_id: str, u: dict = Depends(solo_afiliado), db: Session = Depends(get_db)):
    cert = obtener(db, Certificado, certificado_id, "Certificado no encontrado.")
    t = db.get(Tramite, cert.tramite_id)
    if str(t.solicitante_id) != u["sub"]:
        raise HTTPException(404, "Certificado no encontrado.")
    d = t.datos
    datos = {**d, "expedido_texto": fecha_larga(datetime.fromisoformat(d["expedido"]).date()),
             "vigente_texto": fecha_larga(cert.vigente_hasta),
             "fecha_afiliacion_texto": fecha_larga(datetime.fromisoformat(d["fecha_afiliacion"]).date()) if d.get("fecha_afiliacion") else "la fecha de aprobación"}
    contenido = certificado_afiliacion(datos, t.radicado, cert.codigo_verificacion, url_verificacion(cert.codigo_verificacion))
    return Response(contenido, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="certificado-{t.radicado}.pdf"'})


# =====================================================================
# PQRSD
# =====================================================================
def pqrsd_out(p: Pqrsd, t: Tramite, completo: bool = True) -> dict:
    restantes = habiles_entre(hoy(), p.fecha_limite) if not p.respuesta else None
    base = {"radicado": t.radicado, "tipo": p.tipo, "estado": "respondida" if p.respuesta else t.estado,
            "fecha_limite": p.fecha_limite, "creado_en": t.creado_en, "anonima": p.anonima}
    if completo:
        base.update({"id": p.id, "asunto": p.asunto, "descripcion": p.descripcion, "respuesta": p.respuesta,
                     "respondida_en": p.respondida_en, "nombre": p.nombre_contacto, "email": p.email_contacto,
                     "documento": p.documento_contacto, "telefono": p.telefono_contacto,
                     "dias_habiles_restantes": restantes, "vencida": restantes is not None and restantes < 0})
    return base


@app.post("/tramites/pqrsd", status_code=201, tags=["PQRSD"])
def radicar_pqrsd(datos: PqrsdIn, u: dict | None = Depends(usuario_opcional), db: Session = Depends(get_db)):
    dias = config.DIAS_HABILES_DENUNCIA if datos.tipo == "denuncia" else config.DIAS_HABILES_PQRSD
    rol = "anonimo" if datos.anonima or not u else u["rol"]
    t = Tramite(tipo="pqrsd", estado="pendiente", solicitante_id=None if rol == "anonimo" else u["sub"], solicitante_rol=rol)
    db.add(t)
    db.flush()
    p = Pqrsd(tramite_id=t.id, fecha_limite=sumar_habiles(hoy(), dias), **datos.model_dump())
    db.add(p)
    db.commit()
    if not p.anonima:
        notificar("pqrsd_radicada", "tramites", p.email_contacto, p.nombre_contacto.split()[0],
                  usuario_id=t.solicitante_id, ruta=f"/tramites/pqrsd?radicado={t.radicado}", referencia_id=t.id,
                  tipo=TIPOS_PQRSD[p.tipo], radicado=t.radicado, fecha_limite=fecha_larga(p.fecha_limite))
    return {"radicado": t.radicado, "fecha_limite": p.fecha_limite, "dias_habiles": dias}


@app.get("/tramites/pqrsd/consulta", tags=["PQRSD"])
def consultar_pqrsd(radicado: str = Query(max_length=30), documento: str = Query(default="", max_length=20),
                    db: Session = Depends(get_db)):
    """Pública. Con radicado + documento muestra todo; si es anónima, solo el estado (para proteger al denunciante)."""
    fila = db.execute(select(Pqrsd, Tramite).join(Tramite, Tramite.id == Pqrsd.tramite_id)
                      .where(Tramite.radicado == radicado.strip().upper())).first()
    if not fila:
        raise HTTPException(404, "No encontramos una PQRSD con ese radicado.")
    p, t = fila
    if p.anonima:
        return pqrsd_out(p, t, completo=False)
    if documento.strip() != (p.documento_contacto or ""):
        raise HTTPException(404, "No encontramos una PQRSD con ese radicado y ese documento.")
    return pqrsd_out(p, t)


@app.get("/tramites/pqrsd/mias", tags=["PQRSD"])
def mis_pqrsd(u: dict = Depends(usuario_del_token), db: Session = Depends(get_db)):
    filas = db.execute(select(Pqrsd, Tramite).join(Tramite, Tramite.id == Pqrsd.tramite_id)
                       .where(Tramite.solicitante_id == u["sub"]).order_by(Tramite.creado_en.desc())).all()
    return [pqrsd_out(p, t) for p, t in filas]


@app.get("/tramites/admin/pqrsd", dependencies=[Depends(solo_admin)], tags=["PQRSD · Administración"])
def bandeja_pqrsd(estado: str = Query(default="abiertas", pattern="^(abiertas|respondidas|todas)$"), db: Session = Depends(get_db)):
    q = select(Pqrsd, Tramite).join(Tramite, Tramite.id == Pqrsd.tramite_id)
    if estado == "abiertas":
        q = q.where(Pqrsd.respuesta.is_(None)).order_by(Pqrsd.fecha_limite)
    elif estado == "respondidas":
        q = q.where(Pqrsd.respuesta.is_not(None)).order_by(Pqrsd.respondida_en.desc())
    else:
        q = q.order_by(Tramite.creado_en.desc())
    abiertas = db.scalar(select(func.count()).select_from(Pqrsd).where(Pqrsd.respuesta.is_(None)))
    vencidas = db.scalar(select(func.count()).select_from(Pqrsd).where(Pqrsd.respuesta.is_(None), Pqrsd.fecha_limite < hoy()))
    return {"abiertas": abiertas, "vencidas": vencidas, "items": [pqrsd_out(p, t) for p, t in db.execute(q.limit(200))]}


@app.post("/tramites/admin/pqrsd/{pqrsd_id}/en-proceso", tags=["PQRSD · Administración"])
def tomar_pqrsd(pqrsd_id: str, admin: dict = Depends(solo_admin), db: Session = Depends(get_db)):
    p = obtener(db, Pqrsd, pqrsd_id, "PQRSD no encontrada.")
    t = db.get(Tramite, p.tramite_id)
    if t.estado == "pendiente":
        t.estado, t.asignado_a = "en_proceso", admin["sub"]
        db.commit()
    return pqrsd_out(p, t)


@app.post("/tramites/admin/pqrsd/{pqrsd_id}/responder", tags=["PQRSD · Administración"])
def responder_pqrsd(pqrsd_id: str, datos: RespuestaIn, admin: dict = Depends(solo_admin), db: Session = Depends(get_db)):
    p = obtener(db, Pqrsd, pqrsd_id, "PQRSD no encontrada.")
    if p.respuesta:
        raise HTTPException(409, "Esta PQRSD ya fue respondida.")
    t = db.get(Tramite, p.tramite_id)
    p.respuesta, p.respondida_por, p.respondida_en = datos.respuesta.strip(), admin["sub"], datetime.now(timezone.utc)
    t.estado, t.asignado_a = "cerrado", admin["sub"]
    db.commit()
    if not p.anonima:
        notificar("pqrsd_respondida", "tramites", p.email_contacto, p.nombre_contacto.split()[0], usuario_id=t.solicitante_id,
                  ruta=f"/tramites/pqrsd?radicado={t.radicado}", referencia_id=t.id, tipo=TIPOS_PQRSD[p.tipo],
                  radicado=t.radicado, respuesta=p.respuesta)
    return pqrsd_out(p, t)
