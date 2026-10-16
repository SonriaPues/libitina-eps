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
import secrets
from datetime import date, timedelta
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text
from sqlalchemy.orm import Session
from .config import CLAVE_CIFRADO, CITAS_URL, AFILIADOS_URL, FRONTEND_URL, DIAS_VIGENCIA_FORMULA
from .db import engine, get_db
from .internos import llamar, json_o_error
from .migrar import aplicar
from .schemas import ConsultaIn, AntecedenteIn, AlergiaIn, FormulaIn, IncapacidadIn
from . import pdf
from .seguridad import requiere_rol
from zoneinfo import ZoneInfo
from .tiempo import hoy, fecha_larga

ZONA = ZoneInfo("America/Bogota")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("historia")
app = FastAPI(title="Libitina · Historia Clínica", version="1.0.0",
              description="Consultas, antecedentes y alergias cifrados, con auditoría de cada acceso.")
solo_doctor, solo_afiliado = requiere_rol("doctor"), requiere_rol("afiliado")
TABLAS = ["historias_clinicas", "consultas", "antecedentes", "alergias", "medicamentos_permanentes",
          "discapacidades", "examenes", "log_accesos_historia", "formulas_medicas", "incapacidades"]


@app.on_event("startup")
def migrar():
    aplicar(engine)


@app.get("/health", tags=["Salud"])
def salud():
    """Conexión, 10 tablas, cifrado con la clave del servicio y auditoría inmutable."""
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



# =====================================================================
# Fórmulas médicas e incapacidades
# =====================================================================
ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # sin 0/O ni 1/I


def nuevo_codigo(db: Session) -> str:
    while True:
        c = "".join(secrets.choice(ALFABETO) for _ in range(8))
        c = f"{c[:4]}-{c[4:]}"
        ocupado = db.execute(text("SELECT 1 FROM formulas_medicas WHERE codigo_verificacion = :c UNION ALL "
                                  "SELECT 1 FROM incapacidades WHERE codigo_verificacion = :c"), {"c": c}).first()
        if not ocupado:
            return c


def url_verificacion(codigo: str) -> str:
    return f"{FRONTEND_URL}/tramites/verificar-documento?codigo={codigo}"


def consulta_de(db: Session, cita_id) -> dict:
    fila = db.execute(text("SELECT id, historia_id, diagnostico_principal_cie10 AS cie10, pgp_sym_decrypt(diagnostico_principal_desc, :k) AS diag "
                           "FROM consultas WHERE cita_id = :c"), {"k": CLAVE_CIFRADO, "c": str(cita_id)}).mappings().first()
    if not fila:
        raise HTTPException(422, "Primero registra la consulta de esta cita.")
    return dict(fila)


def regla_incapacidad(afiliado_id: str) -> str | None:
    """La incapacidad con prestación económica es para el cotizante del régimen contributivo. Devuelve el motivo si no aplica."""
    r = llamar("GET", f"{AFILIADOS_URL}/internal/afiliados/{afiliado_id}", "Afiliados")
    a = json_o_error(r, "No pudimos consultar la afiliación del paciente.")
    if a["regimen"] != "contributivo":
        return "La incapacidad se expide a cotizantes del régimen contributivo; este paciente es del subsidiado."
    if a["persona"]["id"] != a["titular"]["id"]:
        return "La incapacidad se expide al cotizante; este paciente es beneficiario."
    return None


FORMULA_SQL = """SELECT id, cita_id, afiliado_id, paciente_nombre, paciente_documento, doctor_id, doctor_nombre, especialidad,
                        pgp_sym_decrypt(medicamentos, :k) AS medicamentos, pgp_sym_decrypt(indicaciones, :k) AS indicaciones,
                        codigo_verificacion AS codigo, vigente_hasta, creado_en, historia_id, consulta_id FROM formulas_medicas"""
INCAPACIDAD_SQL = """SELECT id, cita_id, afiliado_id, paciente_nombre, paciente_documento, doctor_id, doctor_nombre, especialidad, tipo,
                            fecha_inicio, dias, fecha_fin, pgp_sym_decrypt(diagnostico, :k) AS diagnostico,
                            pgp_sym_decrypt(observaciones, :k) AS observaciones, codigo_verificacion AS codigo, creado_en, historia_id
                     FROM incapacidades"""


def formula_out(f) -> dict:
    d = dict(f)
    d["medicamentos"] = json.loads(d["medicamentos"])
    return {k: v for k, v in d.items() if k not in ("historia_id", "consulta_id")}


def incapacidad_out(i) -> dict:
    d = dict(i)
    d.pop("historia_id", None)
    d["tipo_texto"] = pdf.TIPOS_INCAPACIDAD[d["tipo"]]
    return d


def una(db: Session, sql: str, where: str, **p):
    return db.execute(text(f"{sql} WHERE {where}"), {"k": CLAVE_CIFRADO, **p}).mappings().first()


@app.post("/historia/formulas", status_code=201, tags=["Doctor"])
def expedir_formula(datos: FormulaIn, request: Request, u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    c = cita_del_doctor(datos.cita_id, u["sub"])
    cons = consulta_de(db, datos.cita_id)
    if db.execute(text("SELECT 1 FROM formulas_medicas WHERE consulta_id = :c"), {"c": cons["id"]}).first():
        raise HTTPException(409, "Esta consulta ya tiene una fórmula médica.")
    fid = db.execute(text("""
        INSERT INTO formulas_medicas (historia_id, consulta_id, cita_id, afiliado_id, paciente_nombre, paciente_documento, doctor_id,
                                      doctor_nombre, especialidad, medicamentos, indicaciones, codigo_verificacion, vigente_hasta)
        VALUES (:h, :cons, :cita, :af, :pn, :pd, :doc, :dn, :esp, pgp_sym_encrypt(:meds, :k), pgp_sym_encrypt(:ind, :k), :cod, :vig)
        RETURNING id"""), {
        "h": cons["historia_id"], "cons": cons["id"], "cita": str(datos.cita_id), "af": c["afiliado_id"], "pn": c["paciente"],
        "pd": c["paciente_documento"], "doc": u["sub"], "dn": u.get("nombre"), "esp": c["especialidad"], "k": CLAVE_CIFRADO,
        "meds": json.dumps([m.model_dump() for m in datos.medicamentos], ensure_ascii=False),
        "ind": (datos.indicaciones or "").strip() or None, "cod": nuevo_codigo(db), "vig": hoy() + timedelta(days=DIAS_VIGENCIA_FORMULA)}).scalar()
    registrar_acceso(db, cons["historia_id"], u["sub"], "doctor", "creacion", "formula", ip(request), f"Fórmula de la cita del {c['fecha']}")
    db.commit()
    return formula_out(una(db, FORMULA_SQL, "id = :i", i=fid))


@app.post("/historia/incapacidades", status_code=201, tags=["Doctor"])
def expedir_incapacidad(datos: IncapacidadIn, request: Request, u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    c = cita_del_doctor(datos.cita_id, u["sub"])
    cons = consulta_de(db, datos.cita_id)
    if db.execute(text("SELECT 1 FROM incapacidades WHERE consulta_id = :c"), {"c": cons["id"]}).first():
        raise HTTPException(409, "Esta consulta ya tiene una incapacidad.")
    motivo = regla_incapacidad(c["afiliado_id"])
    if motivo:
        raise HTTPException(422, motivo)
    dia_cita = date.fromisoformat(str(c["fecha"]))
    inicio = datos.fecha_inicio or dia_cita
    if not dia_cita - timedelta(days=3) <= inicio <= dia_cita:
        raise HTTPException(422, "La incapacidad empieza el día de la consulta o hasta 3 días antes.")
    iid = db.execute(text("""
        INSERT INTO incapacidades (historia_id, consulta_id, cita_id, afiliado_id, paciente_nombre, paciente_documento, doctor_id, doctor_nombre,
                                   especialidad, tipo, fecha_inicio, dias, fecha_fin, diagnostico, observaciones, codigo_verificacion)
        VALUES (:h, :cons, :cita, :af, :pn, :pd, :doc, :dn, :esp, :tipo, :ini, :dias, :fin, pgp_sym_encrypt(:diag, :k),
                pgp_sym_encrypt(:obs, :k), :cod)
        RETURNING id"""), {
        "h": cons["historia_id"], "cons": cons["id"], "cita": str(datos.cita_id), "af": c["afiliado_id"], "pn": c["paciente"],
        "pd": c["paciente_documento"], "doc": u["sub"], "dn": u.get("nombre"), "esp": c["especialidad"], "tipo": datos.tipo,
        "ini": inicio, "dias": datos.dias, "fin": inicio + timedelta(days=datos.dias - 1), "k": CLAVE_CIFRADO,
        "diag": f"{cons['cie10']} · {cons['diag']}", "obs": (datos.observaciones or "").strip() or None, "cod": nuevo_codigo(db)}).scalar()
    registrar_acceso(db, cons["historia_id"], u["sub"], "doctor", "creacion", "incapacidad", ip(request), f"Incapacidad de la cita del {c['fecha']}")
    db.commit()
    return incapacidad_out(una(db, INCAPACIDAD_SQL, "id = :i", i=iid))


@app.get("/historia/citas/{cita_id}/documentos", tags=["Doctor"])
def documentos_de_la_cita(cita_id: str, u: dict = Depends(solo_doctor), db: Session = Depends(get_db)):
    """Lo que el doctor ya expidió en esta cita y si al paciente le aplica incapacidad."""
    c = cita_del_doctor(cita_id, u["sub"])
    f = una(db, FORMULA_SQL, "cita_id = :c", c=cita_id)
    i = una(db, INCAPACIDAD_SQL, "cita_id = :c", c=cita_id)
    try:
        motivo = regla_incapacidad(c["afiliado_id"])
    except HTTPException:
        motivo = "No pudimos consultar la afiliación del paciente."
    return {"formula": formula_out(f) if f else None, "incapacidad": incapacidad_out(i) if i else None,
            "puede_incapacidad": motivo is None, "motivo_incapacidad": motivo}


@app.get("/historia/mia/documentos", tags=["Afiliado"])
def mis_documentos(afiliado_id: str, u: dict = Depends(solo_afiliado), db: Session = Depends(get_db)):
    persona_permitida(u["sub"], afiliado_id)
    formulas = db.execute(text(f"{FORMULA_SQL} WHERE afiliado_id = :a ORDER BY creado_en DESC"), {"k": CLAVE_CIFRADO, "a": afiliado_id}).mappings().all()
    incap = db.execute(text(f"{INCAPACIDAD_SQL} WHERE afiliado_id = :a ORDER BY creado_en DESC"), {"k": CLAVE_CIFRADO, "a": afiliado_id}).mappings().all()
    return {"formulas": [formula_out(f) for f in formulas], "incapacidades": [incapacidad_out(i) for i in incap]}


@app.get("/historia/documentos/{tipo}/{documento_id}/pdf", tags=["Afiliado"])
def documento_pdf(tipo: str, documento_id: str, request: Request, u: dict = Depends(requiere_rol("afiliado", "doctor")),
                  db: Session = Depends(get_db)):
    """PDF de una fórmula o incapacidad: lo descarga el paciente (o su titular si es menor) o el doctor que la expidió."""
    if tipo not in ("formula", "incapacidad"):
        raise HTTPException(404, "Documento no encontrado.")
    try:
        d = una(db, FORMULA_SQL if tipo == "formula" else INCAPACIDAD_SQL, "id = :i", i=documento_id)
    except Exception:  # noqa: BLE001 - id con formato inválido
        db.rollback()
        d = None
    if not d:
        raise HTTPException(404, "Documento no encontrado.")
    if u["rol"] == "doctor":
        if str(d["doctor_id"]) != u["sub"]:
            raise HTTPException(403, "Solo puedes descargar los documentos que tú expediste.")
    else:
        persona_permitida(u["sub"], str(d["afiliado_id"]))
    registrar_acceso(db, d["historia_id"], u["sub"], u["rol"], "exportacion", tipo, ip(request), f"Descarga del PDF {d['codigo']}")
    db.commit()
    base = {**dict(d), "expedida_texto": fecha_larga(d["creado_en"].astimezone(ZONA).date())}
    if tipo == "formula":
        cons = db.execute(text("SELECT diagnostico_principal_cie10 AS cie10, pgp_sym_decrypt(diagnostico_principal_desc, :k) AS diag "
                               "FROM consultas WHERE cita_id = :c"), {"k": CLAVE_CIFRADO, "c": str(d["cita_id"])}).mappings().first()
        contenido = pdf.formula_medica({**base, "medicamentos": json.loads(d["medicamentos"]), "vigente_texto": fecha_larga(d["vigente_hasta"]),
                                        "diagnostico": f"{cons['cie10']} · {cons['diag']}" if cons else ""}, url_verificacion(d["codigo"]))
        nombre = f"formula-{d['codigo']}.pdf"
    else:
        contenido = pdf.incapacidad({**base, "inicio_texto": fecha_larga(d["fecha_inicio"]), "fin_texto": fecha_larga(d["fecha_fin"])},
                                    url_verificacion(d["codigo"]))
        nombre = f"incapacidad-{d['codigo']}.pdf"
    return Response(contenido, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{nombre}"'})


def ocultar(texto: str) -> str:
    return " ".join(p[0] + "***" for p in (texto or "").split() if p)


@app.get("/historia/verificar/{codigo}", tags=["Público"])
def verificar_documento(codigo: str, db: Session = Depends(get_db)):
    """Pública. Confirma que una fórmula o incapacidad es auténtica, sin revelar su contenido clínico."""
    cod = codigo.strip().upper()[:9]
    f = db.execute(text("SELECT 'formula' AS tipo, creado_en, doctor_nombre, especialidad, paciente_nombre, paciente_documento, "
                        "vigente_hasta AS hasta FROM formulas_medicas WHERE codigo_verificacion = :c UNION ALL "
                        "SELECT 'incapacidad', creado_en, doctor_nombre, especialidad, paciente_nombre, paciente_documento, NULL "
                        "FROM incapacidades WHERE codigo_verificacion = :c"), {"c": cod}).mappings().first()
    if not f:
        return {"valido": False}
    doc = f["paciente_documento"] or ""
    return {"valido": True, "tipo": f["tipo"], "tipo_texto": "Fórmula médica" if f["tipo"] == "formula" else "Certificado de incapacidad",
            "expedido": f["creado_en"].astimezone(ZONA).date(), "profesional": f["doctor_nombre"], "especialidad": f["especialidad"],
            "paciente": ocultar(f["paciente_nombre"]), "documento": f"{doc.split(' ')[0]} ****{doc[-4:]}" if doc else "",
            "vigente": f["hasta"] is None or f["hasta"] >= hoy(), "vigente_hasta": f["hasta"]}
