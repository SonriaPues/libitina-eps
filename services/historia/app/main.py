"""Microservicio de HISTORIA CLÍNICA · base libitina_historia (servidor clínico aparte).

- Los textos clínicos se guardan cifrados con pgcrypto. La clave vive en este servicio,
  nunca en la base: quien robe un respaldo de la base no puede leer los diagnósticos.
- Cada lectura o escritura queda en log_accesos_historia, que la base no deja editar
  ni borrar (Resolución 1995 de 1999).
- El doctor solo accede a la historia de pacientes con los que tiene una cita (lo
  confirma con Citas). El afiliado ve la suya y la de sus beneficiarios menores de edad.
"""
import json
import logging
from datetime import date
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from .config import CLAVE_CIFRADO, CITAS_URL, AFILIADOS_URL
from .db import engine, get_db
from .internos import llamar, json_o_error
from .migrar import aplicar
from .schemas import ConsultaIn, AntecedenteIn, AlergiaIn
from .seguridad import requiere_rol
from .tiempo import hoy

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("historia")
app = FastAPI(title="Libitina · Historia Clínica", version="1.0.0",
              description="Consultas, antecedentes y alergias cifrados, con auditoría de cada acceso.")
solo_doctor, solo_afiliado = requiere_rol("doctor"), requiere_rol("afiliado")
TABLAS = ["historias_clinicas", "consultas", "antecedentes", "alergias", "medicamentos_permanentes",
          "discapacidades", "examenes", "log_accesos_historia"]


@app.on_event("startup")
def migrar():
    aplicar(engine)


@app.get("/health", tags=["Salud"])
def salud():
    """Conexión, 8 tablas, cifrado con la clave del servicio y auditoría inmutable."""
    with engine.connect() as c:
        existentes = set(c.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).scalars())
        cifrado = c.execute(text("SELECT pgp_sym_decrypt(pgp_sym_encrypt('prueba', :k), :k) = 'prueba'"), {"k": CLAVE_CIFRADO}).scalar()
        auditoria = c.execute(text("SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_log_inmutable'")).scalar() == 1
    faltan = [t for t in TABLAS if t not in existentes]
    ok = not faltan and cifrado and auditoria
    return JSONResponse({"servicio": "historia", "estado": "ok" if ok else "error", "tablas": len(TABLAS) - len(faltan),
                         "cifrado_pgcrypto": bool(cifrado), "auditoria_inmutable": auditoria}, status_code=200 if ok else 503)


# ---------------- Utilidades ----------------
def ip(request: Request) -> str:
    return (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "desconocida")).split(",")[0].strip()


def cita_del_doctor(cita_id, doctor_id: str) -> dict:
    r = llamar("GET", f"{CITAS_URL}/internal/citas/{cita_id}", "Citas")
    if r.status_code == 404:
        raise HTTPException(404, "Cita no encontrada.")
    c = json_o_error(r, "No pudimos consultar la cita.")
    if c["doctor_id"] != doctor_id:
        raise HTTPException(403, "Solo puedes ver la historia de pacientes de tus propias citas.")
    if c["estado"] not in ("confirmada", "realizada"):
        raise HTTPException(403, "La cita no está activa: no hay motivo de atención para abrir la historia.")
    return c


def historia_id(db: Session, afiliado_id) -> str | None:
    return db.execute(text("SELECT id FROM historias_clinicas WHERE afiliado_id = :a"), {"a": str(afiliado_id)}).scalar()


def registrar_acceso(db: Session, hid, usuario_id: str, rol: str, accion: str, recurso: str, ip_origen: str, justificacion: str):
    db.execute(text("INSERT INTO log_accesos_historia (historia_id, usuario_id, rol, accion, recurso, ip_origen, justificacion) "
                    "VALUES (:h, :u, :r, :a, :rec, :ip, :j)"),
               {"h": hid, "u": usuario_id, "r": rol, "a": accion, "rec": recurso, "ip": ip_origen, "j": justificacion})


def leer_historia(db: Session, hid) -> dict:
    k = {"k": CLAVE_CIFRADO, "h": hid}
    sangre = db.execute(text("SELECT grupo_sanguineo, factor_rh, fecha_apertura FROM historias_clinicas WHERE id = :h"), k).first()
    consultas = db.execute(text("""
        SELECT id, cita_id, fecha, doctor_nombre, especialidad, signos_vitales, diagnostico_principal_cie10 AS cie10,
               pgp_sym_decrypt(motivo_consulta, :k)            AS motivo,
               pgp_sym_decrypt(enfermedad_actual, :k)          AS enfermedad_actual,
               pgp_sym_decrypt(examen_fisico, :k)              AS examen_fisico,
               pgp_sym_decrypt(diagnostico_principal_desc, :k) AS diagnostico,
               pgp_sym_decrypt(tratamiento, :k)                AS tratamiento,
               pgp_sym_decrypt(observaciones, :k)              AS observaciones,
               proxima_cita
        FROM consultas WHERE historia_id = :h ORDER BY fecha DESC"""), k).mappings().all()
    antecedentes = db.execute(text("SELECT id, tipo, pgp_sym_decrypt(descripcion, :k) AS descripcion, fecha_diagnostico, creado_en "
                                   "FROM antecedentes WHERE historia_id = :h AND activo ORDER BY creado_en DESC"), k).mappings().all()
    alergias = db.execute(text("SELECT id, agente, tipo, severidad, reaccion, creado_en FROM alergias "
                               "WHERE historia_id = :h AND activo ORDER BY severidad DESC, agente"), k).mappings().all()
    return {"existe": True, "apertura": sangre.fecha_apertura if sangre else None,
            "grupo_sanguineo": f"{sangre.grupo_sanguineo}{'+' if sangre.factor_rh == 'positivo' else '−'}" if sangre and sangre.grupo_sanguineo else None,
            "consultas": [dict(c) for c in consultas], "antecedentes": [dict(a) for a in antecedentes], "alergias": [dict(a) for a in alergias]}


VACIA = {"existe": False, "consultas": [], "antecedentes": [], "alergias": []}


# ---------------- Doctor ----------------
@app.get("/historia/pacientes/{afiliado_id}", tags=["Doctor"])
def ver_como_doctor(afiliado_id: str, cita_id: str, request: Request, u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    c = cita_del_doctor(cita_id, u["sub"])
    if c["afiliado_id"] != afiliado_id:
        raise HTTPException(403, "La cita no corresponde a este paciente.")
    hid = historia_id(db, afiliado_id)
    if not hid:
        return VACIA
    registrar_acceso(db, hid, u["sub"], "doctor", "consulta", "historia completa", ip(request),
                     f"Atención de la cita de {c['especialidad']} del {c['fecha']}")
    datos = leer_historia(db, hid)
    db.commit()
    return datos


def historia_para_escribir(db: Session, afiliado_id, doctor_id: str) -> str:
    hid = historia_id(db, afiliado_id)
    if not hid:  # la historia se abre en la primera atención
        hid = db.execute(text("INSERT INTO historias_clinicas (afiliado_id, doctor_apertura_id) VALUES (:a, :d) RETURNING id"),
                         {"a": str(afiliado_id), "d": doctor_id}).scalar()
    return hid


@app.post("/historia/consultas", status_code=201, tags=["Doctor"])
def registrar_consulta(datos: ConsultaIn, request: Request, u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    c = cita_del_doctor(datos.cita_id, u["sub"])
    if c["estado"] != "confirmada":
        raise HTTPException(409, "Esta cita ya tiene una consulta registrada.")
    if not c["es_hoy_o_antes"]:
        raise HTTPException(422, "La consulta se registra el día de la cita.")
    hid = historia_para_escribir(db, c["afiliado_id"], u["sub"])
    k = CLAVE_CIFRADO
    cid = db.execute(text("""
        INSERT INTO consultas (historia_id, cita_id, doctor_id, doctor_nombre, especialidad, motivo_consulta, enfermedad_actual,
                               signos_vitales, examen_fisico, diagnostico_principal_cie10, diagnostico_principal_desc,
                               tratamiento, observaciones, proxima_cita)
        VALUES (:h, :cita, :doc, :nombre, :esp, pgp_sym_encrypt(:motivo, :k), pgp_sym_encrypt(:enf, :k), CAST(:signos AS jsonb),
                pgp_sym_encrypt(:examen, :k), :cie10, pgp_sym_encrypt(:diag, :k), pgp_sym_encrypt(:trat, :k),
                pgp_sym_encrypt(:obs, :k), :prox)
        RETURNING id"""), {
        "h": hid, "cita": str(datos.cita_id), "doc": u["sub"], "nombre": u.get("nombre"), "esp": c["especialidad"], "k": k,
        "motivo": datos.motivo_consulta.strip(), "enf": datos.enfermedad_actual, "examen": datos.examen_fisico,
        "signos": json.dumps(datos.signos_vitales.model_dump(exclude_none=True)), "cie10": datos.diagnostico_cie10,
        "diag": datos.diagnostico_desc.strip(), "trat": datos.tratamiento.strip(), "obs": datos.observaciones,
        "prox": datos.proxima_cita}).scalar()
    registrar_acceso(db, hid, u["sub"], "doctor", "creacion", "consulta", ip(request), f"Registro de la consulta de la cita del {c['fecha']}")
    # La cita pasa a "realizada" en Citas. Si Citas no responde, la consulta no se guarda (todo o nada).
    r = llamar("POST", f"{CITAS_URL}/internal/citas/{datos.cita_id}/realizada", "Citas")
    if r.status_code >= 400:
        db.rollback()
        json_o_error(r, "No pudimos cerrar la cita.")
    db.commit()
    return {"id": cid, "historia_id": hid}


@app.post("/historia/pacientes/{afiliado_id}/antecedentes", status_code=201, tags=["Doctor"])
def agregar_antecedente(afiliado_id: str, cita_id: str, datos: AntecedenteIn, request: Request,
                        u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    c = cita_del_doctor(cita_id, u["sub"])
    if c["afiliado_id"] != afiliado_id:
        raise HTTPException(403, "La cita no corresponde a este paciente.")
    hid = historia_para_escribir(db, afiliado_id, u["sub"])
    aid = db.execute(text("INSERT INTO antecedentes (historia_id, tipo, descripcion, fecha_diagnostico, registrado_por) "
                          "VALUES (:h, :t, pgp_sym_encrypt(:d, :k), :f, :u) RETURNING id"),
                     {"h": hid, "t": datos.tipo, "d": datos.descripcion.strip(), "k": CLAVE_CIFRADO, "f": datos.fecha_diagnostico,
                      "u": u["sub"]}).scalar()
    registrar_acceso(db, hid, u["sub"], "doctor", "creacion", "antecedentes", ip(request), f"Atención de la cita del {c['fecha']}")
    db.commit()
    return {"id": aid}


@app.post("/historia/pacientes/{afiliado_id}/alergias", status_code=201, tags=["Doctor"])
def agregar_alergia(afiliado_id: str, cita_id: str, datos: AlergiaIn, request: Request,
                    u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    c = cita_del_doctor(cita_id, u["sub"])
    if c["afiliado_id"] != afiliado_id:
        raise HTTPException(403, "La cita no corresponde a este paciente.")
    hid = historia_para_escribir(db, afiliado_id, u["sub"])
    aid = db.execute(text("INSERT INTO alergias (historia_id, agente, tipo, severidad, reaccion, registrado_por) "
                          "VALUES (:h, :a, :t, :s, :r, :u) RETURNING id"),
                     {"h": hid, "a": datos.agente.strip(), "t": datos.tipo, "s": datos.severidad, "r": datos.reaccion, "u": u["sub"]}).scalar()
    registrar_acceso(db, hid, u["sub"], "doctor", "creacion", "alergias", ip(request), f"Atención de la cita del {c['fecha']}")
    db.commit()
    return {"id": aid}


# ---------------- Afiliado (solo lectura) ----------------
def persona_permitida(usuario_id: str, afiliado_id: str) -> dict:
    """El titular ve su historia y la de sus beneficiarios menores de edad (los adultos tienen la suya reservada)."""
    grupo = json_o_error(llamar("GET", f"{AFILIADOS_URL}/internal/afiliados/grupo", "Afiliados", params={"usuario_id": usuario_id}),
                         "No encontramos tu afiliación.")
    if grupo["titular"]["id"] == afiliado_id:
        return grupo["titular"]
    b = next((x for x in grupo["beneficiarios"] if x["id"] == afiliado_id), None)
    if not b:
        raise HTTPException(403, "Solo puedes ver tu historia clínica y la de tus beneficiarios menores de edad.")
    nac, h = date.fromisoformat(b["fecha_nacimiento"]), hoy()
    edad = h.year - nac.year - ((h.month, h.day) < (nac.month, nac.day))
    if edad >= 18:
        raise HTTPException(403, "La historia clínica de un beneficiario mayor de edad es reservada: solo puede verla él mismo.")
    return b


@app.get("/historia/mia", tags=["Afiliado"])
def mi_historia(afiliado_id: str, request: Request, u: dict = Depends(solo_afiliado), db: Session = Depends(get_db)):
    p = persona_permitida(u["sub"], afiliado_id)
    hid = historia_id(db, afiliado_id)
    if not hid:
        return VACIA
    titular = p.get("usuario_id") == u["sub"]
    registrar_acceso(db, hid, u["sub"], "afiliado", "consulta", "historia completa", ip(request),
                     "Consulta de su propia historia" if titular else "Consulta del titular sobre un beneficiario menor de edad")
    datos = leer_historia(db, hid)
    db.commit()
    return datos


@app.get("/historia/mia/accesos", tags=["Afiliado"])
def accesos_a_mi_historia(afiliado_id: str, u: dict = Depends(solo_afiliado), db: Session = Depends(get_db)):
    """Transparencia: quién ha consultado la historia, cuándo y para qué."""
    persona_permitida(u["sub"], afiliado_id)
    hid = historia_id(db, afiliado_id)
    if not hid:
        return []
    filas = db.execute(text("SELECT fecha, rol, accion, recurso, justificacion FROM log_accesos_historia "
                            "WHERE historia_id = :h ORDER BY fecha DESC LIMIT 50"), {"h": hid}).mappings().all()
    return [dict(f) for f in filas]
