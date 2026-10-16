"""Prueba de punta a punta del recorrido clínico, a través del API Gateway:

admin crea especialidad, doctores y agendas → afiliado agenda medicina general →
doctor atiende (historia cifrada) y remite → afiliado agenda especialista con la
remisión → cancela y reagenda → certificado PDF y verificación → PQRSD → bloqueos.

Uso:  python pruebas/e2e_atencion.py [gateway] [mailpit]
Opcional (para no depender de la hora a la que corre la prueba):
  E2E_SQL_CITAS     comando que ejecuta SQL en libitina_citas; mueve la cita de medicina
                    general a hoy para poder registrar la consulta ("llegó el día de la cita").
  E2E_SQL_HISTORIA  comando que ejecuta SQL en libitina_historia; confirma que el texto está cifrado.
  BUZON_MAILDIR     si no hay Mailpit, carpeta Maildir donde leer los correos.
"""
import mailbox
import os
import re
import shlex
import subprocess
import sys
import time
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
import httpx

# "Hoy" es el de Colombia, como en los servicios (GitHub Actions corre en UTC: de 7 p. m. a medianoche ya es mañana).
HOY = datetime.now(ZoneInfo("America/Bogota")).date()

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/")
MAILPIT = (sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8025").rstrip("/")
A = f"{BASE}/api/v1"
ADMIN = {"correo": os.getenv("ADMIN_CORREO", "admin@libitina.co"), "clave": os.getenv("ADMIN_CLAVE", "Admin123")}
c = httpx.Client(timeout=30)
fallas = []
n = str(int(time.time()))[-7:]
ahora = lambda: datetime.now(ZoneInfo("America/Bogota")).replace(tzinfo=None)  # noqa: E731


def ver(nombre, r, esperado):
    ok = r.status_code == esperado
    print(f"{'✔' if ok else '✘'} {nombre}: {r.status_code}" + ("" if ok else f" (esperado {esperado}) -> {r.text[:300]}"))
    if not ok:
        fallas.append(nombre)
    return r


def comprobar(nombre, condicion, detalle=""):
    print(f"{'✔' if condicion else '✘'} {nombre}" + ("" if condicion else f" -> {detalle}"))
    if not condicion:
        fallas.append(nombre)


def sql(variable, consulta):
    cmd = os.getenv(variable)
    if not cmd:
        return None
    r = subprocess.run(shlex.split(cmd) + ["-tAc", consulta], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else f"ERROR {r.stderr.strip()}"


def enlace_de_correo(destino, ruta, intentos=20):
    """Busca en el último correo enviado a `destino` el enlace que contiene `ruta`."""
    patron = re.compile(r'href="([^"]*' + re.escape(ruta) + r'[^"]*)"')
    for _ in range(intentos):
        try:
            res = httpx.get(f"{MAILPIT}/api/v1/search", params={"query": f'to:"{destino}"'}, timeout=5).json()
            for m in res.get("messages", []):
                html = httpx.get(f"{MAILPIT}/api/v1/message/{m['ID']}", timeout=5).json().get("HTML", "")
                if (e := patron.search(html)):
                    return e.group(1).replace("&amp;", "&")
        except (httpx.HTTPError, ValueError):
            carpeta = os.getenv("BUZON_MAILDIR")
            if carpeta:
                for msg in mailbox.Maildir(carpeta, create=False):
                    if destino in (msg["to"] or ""):
                        for parte in msg.walk():
                            if parte.get_content_type() == "text/html":
                                if (e := patron.search(parte.get_payload(decode=True).decode())):
                                    return e.group(1).replace("&amp;", "&")
        time.sleep(1)
    return None


def login(correo, clave):
    r = c.post(f"{A}/auth/login", json={"correo": correo, "clave": clave})
    return {"Authorization": f"Bearer {r.json()['access_token']}"} if r.status_code == 200 else None


# ---------------------------------------------------------------- Administración
print("— Administración: especialidades y doctores")
HA = login(**ADMIN)
esps = ver("catálogo de especialidades", c.get(f"{A}/prestadores/especialidades"), 200).json()
general = next(e for e in esps if e["codigo"] == "medicina_general")
comprobar("medicina general no exige remisión", not general["requiere_remision"])
nueva = ver("crear especialidad", c.post(f"{A}/prestadores/especialidades", headers=HA,
            json={"nombre": f"Neumología {n}", "requiere_remision": True, "duracion_cita_min": 30}), 201).json()
ver("especialidad repetida (debe fallar)", c.post(f"{A}/prestadores/especialidades", headers=HA,
    json={"nombre": f"Neumología {n}"}), 409)
ver("medicina general no se puede desactivar", c.put(f"{A}/prestadores/especialidades/{general['id']}", headers=HA, json={"activa": False}), 422)
ver("un afiliado no gestiona especialidades", c.post(f"{A}/prestadores/especialidades", json={"nombre": "X"}), 401)
sedes = ver("sedes", c.get(f"{A}/prestadores/puntos-atencion"), 200).json()
sede = sedes[0]["id"]


def crear_doctor(nombre, esp_id, sufijo):
    datos = {"tipo_documento": "CC", "numero_documento": f"7{sufijo}{n}", "nombres": nombre, "apellidos": f"Prueba{n}",
             "correo": f"doc{sufijo}{n}@correo.com", "especialidad_id": esp_id, "tarjeta_profesional": f"TP-{sufijo}{n}",
             "universidad": "Universidad Católica de Colombia", "anio_graduacion": 2015, "sede_principal_id": sede,
             "tipo_vinculacion": "planta", "fecha_ingreso": "2026-01-15"}
    return ver(f"crear doctor de {nombre}", c.post(f"{A}/prestadores/admin/doctores", headers=HA, json=datos), 201).json(), datos


doc_g, datos_g = crear_doctor("Gabriela", general["id"], "1")
doc_n, datos_n = crear_doctor("Nicolás", nueva["id"], "2")
ver("tarjeta profesional repetida (debe fallar)", c.post(f"{A}/prestadores/admin/doctores", headers=HA,
    json={**datos_g, "numero_documento": f"79{n}", "correo": f"otro{n}@correo.com"}), 409)

print("— El doctor crea su contraseña con el enlace del correo")
claves = {}
for d in (datos_g, datos_n):
    enlace = enlace_de_correo(d["correo"], "/restablecer?token=")
    comprobar(f"correo de bienvenida a {d['nombres']}", bool(enlace), "no llegó")
    if enlace:
        token = re.search(r"token=([^&]+)", enlace).group(1)
        ver(f"{d['nombres']} crea su contraseña", c.post(f"{A}/auth/recuperar/confirmar", json={"token": token, "clave": "Doctor123"}), 200)
HG, HN = login(datos_g["correo"], "Doctor123"), login(datos_n["correo"], "Doctor123")
comprobar("los doctores inician sesión", HG and HN)
perfil = ver("perfil del doctor", c.get(f"{A}/prestadores/doctores/me", headers=HG), 200).json()
comprobar("rol y especialidad", perfil.get("especialidad") == "Medicina general")

print("— Agendas (la copia llega a Citas por evento)")
for _ in range(20):
    docs = {str(d["doctor_id"]) for d in c.get(f"{A}/citas/admin/doctores", headers=HA).json()}
    if {doc_g["usuario_id"], doc_n["usuario_id"]} <= docs:
        break
    time.sleep(1)
comprobar("Citas recibió los dos doctores", {doc_g["usuario_id"], doc_n["usuario_id"]} <= docs)
for d in (doc_g, doc_n):
    for dia in range(7):
        r = c.post(f"{A}/citas/admin/doctores/{d['usuario_id']}/turnos", headers=HA,
                   json={"dia_semana": dia, "hora_inicio": "06:00", "hora_fin": "21:00", "punto_atencion_id": sede})
        if r.status_code != 201:
            ver("crear turno", r, 201)
ver("turno cruzado (debe fallar)", c.post(f"{A}/citas/admin/doctores/{doc_g['usuario_id']}/turnos", headers=HA,
    json={"dia_semana": 0, "hora_inicio": "08:00", "hora_fin": "09:00", "punto_atencion_id": sede}), 409)

# ---------------------------------------------------------------- Afiliado
print("— Afiliado activo con un hijo")
CORREO = f"paciente{n}@correo.com"
insc = {"titular": {"tipo_documento": "CC", "numero_documento": f"52{n}", "nombres": "Marta Lucía", "apellidos": "Gómez Ríos",
                    "fecha_nacimiento": "1985-03-20", "sexo": "femenino", "telefono": "3109998877", "direccion": "Vereda El Roble",
                    "departamento": "Boyacá", "ciudad": "Villa de Leyva", "zona": "rural"},
        "afiliacion": {"regimen": "contributivo", "ips_id": "a1b2c3d4-0000-4000-8000-000000000001", "tipo_cotizante": "independiente", "categoria": "B"},
        "beneficiarios": [{"parentesco": "hijo", "tipo_documento": "TI", "numero_documento": f"10{n}", "nombres": "Sofía",
                           "apellidos": "Gómez", "fecha_nacimiento": "2014-06-01", "sexo": "femenino"}],
        "cuenta": {"correo": CORREO, "clave": "Marta1234"},
        "consentimiento": {"autoriza_datos_salud": True, "declara_veracidad": True}}
ver("inscripción", c.post(f"{A}/afiliados/inscripcion", json=insc), 201)
H = login(CORREO, "Marta1234")
me = c.get(f"{A}/afiliados/me", headers=H).json()
ver("cita antes de aprobar (debe fallar)", c.post(f"{A}/citas", headers=H, json={
    "afiliado_id": me["id"], "especialidad_codigo": "medicina_general", "doctor_id": doc_g["usuario_id"],
    "punto_atencion_id": sede, "fecha": HOY.isoformat(), "hora": "10:00", "motivo": "Control general"}), 422)
ver("aprobación", c.post(f"{A}/afiliados/solicitudes/{me['id']}/aprobar", headers=HA), 200)
me = c.get(f"{A}/afiliados/me", headers=H).json()
titular, hija = me["id"], me["beneficiarios"][0]["id"]

print("— Agendar medicina general (sin remisión)")
disponibles = {e["codigo"] for e in c.get(f"{A}/citas/especialidades").json()}
comprobar("especialidades con agenda", {"medicina_general", nueva["codigo"]} <= disponibles, disponibles)
dispo = ver("horarios disponibles", c.get(f"{A}/citas/disponibilidad", headers=H, params={"especialidad": "medicina_general"}), 200).json()
slot = next(h for dia in dispo for h in dia["horarios"] if h["doctor_id"] == doc_g["usuario_id"])
fecha_g = next(dia["fecha"] for dia in dispo if slot in dia["horarios"])
pedido = {"afiliado_id": titular, "especialidad_codigo": "medicina_general", "doctor_id": doc_g["usuario_id"],
          "punto_atencion_id": slot["punto_atencion_id"], "fecha": fecha_g, "hora": slot["hora"], "motivo": "Dolor de cabeza frecuente"}
cita_g = ver("agendar medicina general", c.post(f"{A}/citas", headers=H, json=pedido), 201).json()
comprobar("cuota moderadora categoría B", cita_g["cuota_moderadora"] == 20100, cita_g["cuota_moderadora"])
ver("segunda cita de la misma especialidad (debe fallar)", c.post(f"{A}/citas", headers=H,
    json={**pedido, "hora": "20:20" if slot["hora"] != "20:20" else "20:40"}), 409)
ver("mismo horario para la hija (debe fallar)", c.post(f"{A}/citas", headers=H, json={**pedido, "afiliado_id": hija}), 409)
ver("horario fuera de la agenda (debe fallar)", c.post(f"{A}/citas", headers=H, json={**pedido, "afiliado_id": hija, "hora": "06:07"}), 422)
ver("especialista sin remisión (debe fallar)", c.post(f"{A}/citas", headers=H, json={
    **pedido, "especialidad_codigo": nueva["codigo"], "doctor_id": doc_n["usuario_id"]}), 422)
mias = ver("mis citas", c.get(f"{A}/citas/mias", headers=H), 200).json()
comprobar("la cita aparece en próximas", any(x["id"] == cita_g["id"] for x in mias["proximas"]))

print("— Asignación automática y malla de horarios")
resumen = ver("horas libres sin nombres", c.get(f"{A}/citas/disponibilidad", headers=H, params={
    "especialidad": "medicina_general", "punto_atencion_id": slot["punto_atencion_id"], "resumen": True}), 200).json()
comprobar("el resumen no trae profesionales", resumen and "horarios" not in resumen[0] and resumen[0]["horas"], str(resumen[:1])[:200])
dia_h = resumen[0]
hora_h = next(x["hora"] for x in dia_h["horas"] if (dia_h["fecha"], x["hora"]) != (fecha_g, slot["hora"]))
cita_h = ver("agendar sin elegir profesional", c.post(f"{A}/citas", headers=H, json={
    "afiliado_id": hija, "especialidad_codigo": "medicina_general", "punto_atencion_id": slot["punto_atencion_id"],
    "fecha": dia_h["fecha"], "hora": hora_h, "motivo": "Control de crecimiento"}), 201).json()
comprobar("el sistema asignó un profesional", bool(cita_h.get("doctor")) and cita_h["especialidad_codigo"] == "medicina_general", cita_h.get("doctor"))
malla = ver("malla de la sede", c.get(f"{A}/citas/admin/malla", headers=HA, params={
    "punto_atencion_id": slot["punto_atencion_id"], "desde": fecha_g, "dias": 1}), 200).json()
comprobar("la malla trae la cita y el turno", any(x["id"] == cita_g["id"] for x in malla["citas"])
          and any(t["doctor_id"] == doc_g["usuario_id"] for t in malla["turnos"]))
dia_sem = date.fromisoformat(fecha_g).weekday()
turno_g = next(t for t in malla["turnos"] if t["doctor_id"] == doc_g["usuario_id"] and t["dia_semana"] == dia_sem)
corto = {"dia_semana": dia_sem, **({"hora_inicio": "14:00", "hora_fin": "21:00"} if slot["hora"] < "13:00" else {"hora_inicio": "06:00", "hora_fin": "07:00"})}
r = ver("acortar un turno con citas (debe fallar)", c.put(f"{A}/citas/admin/turnos/{turno_g['id']}", headers=HA, json=corto), 409)
comprobar("el aviso explica qué citas quedarían por fuera", "por fuera" in r.json()["detail"], r.json()["detail"])
ver("quitar un turno con citas (debe fallar)", c.delete(f"{A}/citas/admin/turnos/{turno_g['id']}", headers=HA), 409)
ver("estirar o dejar igual un turno", c.put(f"{A}/citas/admin/turnos/{turno_g['id']}", headers=HA, json={
    "dia_semana": dia_sem, "hora_inicio": turno_g["hora_inicio"], "hora_fin": turno_g["hora_fin"]}), 200)
ver("cancelar la cita de la hija", c.post(f"{A}/citas/{cita_h['id']}/cancelar", headers=H, json={"motivo": "Ya no la necesita"}), 200)

print("— El doctor atiende")
if fecha_g != ahora().date().isoformat():
    movida = sql("E2E_SQL_CITAS", f"UPDATE citas SET fecha = (now() AT TIME ZONE 'America/Bogota')::date WHERE id = '{cita_g['id']}'")
    print(f"· La cita es el {fecha_g}: {'se movió a hoy para la prueba' if movida is not None else 'sin E2E_SQL_CITAS se omite la atención'}")
    puede_atender = movida is not None
else:
    puede_atender = True
agenda = ver("agenda del doctor", c.get(f"{A}/citas/doctor/agenda", headers=HG, params={"desde": HOY.isoformat()}), 200).json()
comprobar("la cita está en su agenda", any(x["id"] == cita_g["id"] for x in agenda))
ver("otro doctor no ve la cita", c.get(f"{A}/citas/doctor/citas/{cita_g['id']}", headers=HN), 404)
ver("otro doctor no abre la historia", c.get(f"{A}/historia/pacientes/{titular}", headers=HN, params={"cita_id": cita_g["id"]}), 403)
ver("un afiliado no registra consultas", c.post(f"{A}/historia/consultas", headers=H, json={}), 403)
if puede_atender:
    detalle = ver("detalle de la cita", c.get(f"{A}/citas/doctor/citas/{cita_g['id']}", headers=HG), 200).json()
    comprobar("puede atender", detalle["puede_atender"])
    vacia = ver("historia vacía", c.get(f"{A}/historia/pacientes/{titular}", headers=HG, params={"cita_id": cita_g["id"]}), 200).json()
    comprobar("sin historia todavía", not vacia["existe"])
    ver("registrar consulta", c.post(f"{A}/historia/consultas", headers=HG, json={
        "cita_id": cita_g["id"], "motivo_consulta": "Cefalea de dos semanas", "enfermedad_actual": "Dolor frontal vespertino",
        "signos_vitales": {"tension_arterial": "150/95", "frecuencia_cardiaca": 88, "temperatura": 36.6},
        "examen_fisico": "Paciente alerta, sin déficit neurológico", "diagnostico_cie10": "i10",
        "diagnostico_desc": "Hipertensión esencial", "tratamiento": "Losartán 50 mg cada 12 horas"}), 201)
    ver("segunda consulta en la misma cita (debe fallar)", c.post(f"{A}/historia/consultas", headers=HG, json={
        "cita_id": cita_g["id"], "motivo_consulta": "x x x", "diagnostico_cie10": "I10", "diagnostico_desc": "abc", "tratamiento": "abc"}), 409)
    ver("registrar alergia", c.post(f"{A}/historia/pacientes/{titular}/alergias", headers=HG, params={"cita_id": cita_g["id"]},
        json={"agente": "Penicilina", "tipo": "medicamento", "severidad": "severa", "reaccion": "Urticaria"}), 201)
    ver("registrar antecedente", c.post(f"{A}/historia/pacientes/{titular}/antecedentes", headers=HG, params={"cita_id": cita_g["id"]},
        json={"tipo": "familiar", "descripcion": "Padre con infarto a los 60 años"}), 201)
    h = c.get(f"{A}/historia/pacientes/{titular}", headers=HG, params={"cita_id": cita_g["id"]}).json()
    comprobar("historia descifrada", h["consultas"][0]["diagnostico"] == "Hipertensión esencial" and h["consultas"][0]["cie10"] == "I10")
    comprobar("alergia y antecedente", len(h["alergias"]) == 1 and len(h["antecedentes"]) == 1)
    cifrado = sql("E2E_SQL_HISTORIA", "SELECT position('Hipertensi' in encode(diagnostico_principal_desc, 'escape')) "
                                      f"FROM consultas WHERE cita_id = '{cita_g['id']}'")
    if cifrado is not None:
        comprobar("en la base el diagnóstico está cifrado", cifrado == "0", cifrado)
    estado_g = next(x for x in c.get(f"{A}/citas/mias", headers=H).json()["historial"] if x["id"] == cita_g["id"])["estado"]
    comprobar("la cita quedó realizada", estado_g == "realizada", estado_g)

    print("— Remisión al especialista")
    rem = {"cita_id": cita_g["id"], "especialidad_codigo": nueva["codigo"], "diagnostico_cie10": "I10",
           "diagnostico_desc": "Hipertensión esencial", "descripcion_clinica": "Control de cifras tensionales elevadas"}
    ver("emitir remisión", c.post(f"{A}/tramites/remisiones", headers=HG, json=rem), 201)
    ver("remisión repetida (debe fallar)", c.post(f"{A}/tramites/remisiones", headers=HG, json=rem), 409)
    ver("remisión a medicina general (debe fallar)", c.post(f"{A}/tramites/remisiones", headers=HG,
        json={**rem, "especialidad_codigo": "medicina_general"}), 422)
    ver("otro doctor no remite en esta cita", c.post(f"{A}/tramites/remisiones", headers=HN, json=rem), 403)
    rems = ver("mis remisiones", c.get(f"{A}/tramites/remisiones/mias", headers=H), 200).json()
    comprobar("remisión vigente", rems and rems[0]["estado"] == "vigente", rems)

    print("— Especialista con remisión: agendar, cancelar y reagendar")
    dispo_n = c.get(f"{A}/citas/disponibilidad", headers=H, params={"especialidad": nueva["codigo"]}).json()
    lejos = [(dia["fecha"], h) for dia in dispo_n for h in dia["horarios"]
             if datetime.fromisoformat(f"{dia['fecha']}T{h['hora']}") > ahora() + timedelta(hours=3)]
    (f1, s1), (f2, s2) = lejos[0], lejos[1]
    pedido_n = {"afiliado_id": titular, "especialidad_codigo": nueva["codigo"], "doctor_id": doc_n["usuario_id"],
                "punto_atencion_id": s1["punto_atencion_id"], "fecha": f1, "hora": s1["hora"], "motivo": "Remisión por hipertensión"}
    cita_n = ver("agendar especialista", c.post(f"{A}/citas", headers=H, json=pedido_n), 201).json()
    comprobar("la cita usa la remisión", bool(cita_n.get("remision_id")))
    comprobar("remisión usada", c.get(f"{A}/tramites/remisiones/mias", headers=H).json()[0]["estado"] == "usada")
    ver("cancelar", c.post(f"{A}/citas/{cita_n['id']}/cancelar", headers=H, json={"motivo": "Viaje de trabajo"}), 200)
    comprobar("al cancelar, la remisión vuelve a estar vigente", c.get(f"{A}/tramites/remisiones/mias", headers=H).json()[0]["estado"] == "vigente")
    cita_n = ver("agendar de nuevo", c.post(f"{A}/citas", headers=H, json=pedido_n), 201).json()
    nueva_cita = ver("reagendar", c.post(f"{A}/citas/{cita_n['id']}/reagendar", headers=H, json={
        "doctor_id": doc_n["usuario_id"], "punto_atencion_id": s2["punto_atencion_id"], "fecha": f2, "hora": s2["hora"]}), 200).json()
    comprobar("la nueva cita conserva la remisión", nueva_cita["remision_id"] == cita_n["remision_id"] and nueva_cita["cita_anterior_id"] == cita_n["id"])
    mias = c.get(f"{A}/citas/mias", headers=H).json()
    comprobar("la anterior ya no aparece como activa", not any(x["id"] == cita_n["id"] for x in mias["proximas"]))

    print("— El afiliado ve su historia y quién la consultó")
    mia = ver("mi historia", c.get(f"{A}/historia/mia", headers=H, params={"afiliado_id": titular}), 200).json()
    comprobar("consulta visible para el paciente", mia["consultas"][0]["tratamiento"].startswith("Losartán"))
    accesos = ver("accesos a mi historia", c.get(f"{A}/historia/mia/accesos", headers=H, params={"afiliado_id": titular}), 200).json()
    comprobar("los accesos quedaron registrados", len(accesos) >= 5 and any(a["rol"] == "doctor" for a in accesos), len(accesos))
    ver("historia de la hija menor", c.get(f"{A}/historia/mia", headers=H, params={"afiliado_id": hija}), 200)

    print("— Bloqueo de agenda: cancela las citas de esos días")
    bloqueo = ver("bloquear agenda", c.post(f"{A}/citas/admin/doctores/{doc_n['usuario_id']}/excepciones", headers=HA,
                  json={"fecha_inicio": f2, "fecha_fin": f2, "motivo": "Congreso médico"}), 201).json()
    comprobar("se canceló la cita del día bloqueado", bloqueo["citas_canceladas"] == 1, bloqueo)
    dispo_bloq = c.get(f"{A}/citas/disponibilidad", headers=H, params={"especialidad": nueva["codigo"], "desde": f2, "dias": 1}).json()
    comprobar("ese día ya no tiene horarios", dispo_bloq == [], dispo_bloq)

# ---------------------------------------------------------------- Certificado
print("— Certificado de afiliación")
cert = ver("expedir certificado", c.post(f"{A}/tramites/certificados", headers=H), 201).json()
comprobar("radicado de certificado", cert["radicado"].startswith("LIB-CER-"), cert["radicado"])
pdf = ver("descargar PDF", c.get(f"{BASE}{cert['url_pdf']}", headers=H), 200)
comprobar("es un PDF", pdf.content[:4] == b"%PDF" and "attachment" in pdf.headers.get("content-disposition", ""))
ver("otro usuario no descarga el PDF", c.get(f"{BASE}{cert['url_pdf']}", headers=HG), 403)
verif = ver("verificar código", c.get(f"{A}/tramites/certificados/verificar/{cert['codigo']}"), 200).json()
comprobar("válido, vigente y con el nombre enmascarado", verif["valido"] and verif["vigente"] and "***" in verif["titular"], verif)
comprobar("código inexistente no es válido", not c.get(f"{A}/tramites/certificados/verificar/ZZZZ-ZZZZ").json()["valido"])

# ---------------------------------------------------------------- PQRSD
print("— PQRSD")
anon = ver("denuncia anónima", c.post(f"{A}/tramites/pqrsd", json={"tipo": "denuncia", "anonima": True,
       "asunto": "Cobro irregular", "descripcion": "En la sede me cobraron un valor que no corresponde a la cuota."}), 201).json()
cons_anon = ver("consulta de la anónima", c.get(f"{A}/tramites/pqrsd/consulta", params={"radicado": anon["radicado"]}), 200).json()
comprobar("la anónima solo muestra el estado", "descripcion" not in cons_anon and cons_anon["estado"] == "pendiente")
q = ver("queja con datos", c.post(f"{A}/tramites/pqrsd", json={"tipo": "queja", "nombre_contacto": "Pedro Pérez",
    "documento_contacto": f"33{n}", "email_contacto": f"pedro{n}@correo.com", "asunto": "Demora en la entrega",
    "descripcion": "Llevo dos semanas esperando un medicamento en la sede de Suba."}), 201).json()
comprobar("radicado y plazo en días hábiles", q["radicado"].startswith("LIB-PQR-") and q["dias_habiles"] == 15, q)
ver("queja sin correo (debe fallar)", c.post(f"{A}/tramites/pqrsd", json={"tipo": "queja", "nombre_contacto": "Pedro",
    "documento_contacto": "123", "asunto": "Demora", "descripcion": "Texto de prueba suficientemente largo."}), 422)
ver("consulta con otro documento (debe fallar)", c.get(f"{A}/tramites/pqrsd/consulta", params={"radicado": q["radicado"], "documento": "999"}), 404)
bandeja = ver("bandeja del administrador", c.get(f"{A}/tramites/admin/pqrsd", headers=HA), 200).json()
item = next(x for x in bandeja["items"] if x["radicado"] == q["radicado"])
ver("un afiliado no ve la bandeja", c.get(f"{A}/tramites/admin/pqrsd", headers=H), 403)
ver("tomar la PQRSD", c.post(f"{A}/tramites/admin/pqrsd/{item['id']}/en-proceso", headers=HA), 200)
ver("responder", c.post(f"{A}/tramites/admin/pqrsd/{item['id']}/responder", headers=HA,
    json={"respuesta": "Revisamos tu caso y el medicamento ya está disponible en la sede de Suba."}), 200)
ver("responder dos veces (debe fallar)", c.post(f"{A}/tramites/admin/pqrsd/{item['id']}/responder", headers=HA,
    json={"respuesta": "Otra respuesta suficientemente larga para validar."}), 409)
final = c.get(f"{A}/tramites/pqrsd/consulta", params={"radicado": q["radicado"], "documento": f"33{n}"}).json()
comprobar("el ciudadano ve la respuesta", final["estado"] == "respondida" and final["respuesta"].startswith("Revisamos"), final.get("estado"))

# ---------------------------------------------------------------- Inactivar doctor
if puede_atender:
    print("— Fórmula médica e incapacidad")
    formula = ver("expedir fórmula", c.post(f"{A}/historia/formulas", headers=HG, json={"cita_id": cita_g["id"], "indicaciones": "Tomar con agua",
        "medicamentos": [{"medicamento": "Losartán 50 mg", "dosis": "1 tableta", "frecuencia": "cada 12 horas", "duracion": "30 días", "cantidad": 60}]}), 201).json()
    ver("segunda fórmula en la misma consulta (debe fallar)", c.post(f"{A}/historia/formulas", headers=HG, json={"cita_id": cita_g["id"],
        "medicamentos": [{"medicamento": "Acetaminofén 500 mg", "dosis": "1 tableta", "frecuencia": "cada 8 horas", "duracion": "3 días", "cantidad": 9}]}), 409)
    ver("otro doctor no expide fórmulas en esta cita", c.post(f"{A}/historia/formulas", headers=HN, json={"cita_id": cita_g["id"],
        "medicamentos": [{"medicamento": "Acetaminofén 500 mg", "dosis": "1", "frecuencia": "cada 8 horas", "duracion": "3 días", "cantidad": 9}]}), 403)
    ver("incapacidad de 40 días (debe fallar)", c.post(f"{A}/historia/incapacidades", headers=HG, json={"cita_id": cita_g["id"], "dias": 40}), 422)
    incap = ver("expedir incapacidad (cotizante contributivo)", c.post(f"{A}/historia/incapacidades", headers=HG,
        json={"cita_id": cita_g["id"], "dias": 3, "tipo": "enfermedad_general"}), 201).json()
    comprobar("la incapacidad cubre 3 días", incap.get("dias") == 3 and incap.get("fecha_fin") > incap.get("fecha_inicio", "9"), incap)
    docs = ver("documentos de la cita", c.get(f"{A}/historia/citas/{cita_g['id']}/documentos", headers=HG), 200).json()
    comprobar("la cita tiene fórmula e incapacidad", bool(docs["formula"] and docs["incapacidad"]))
    mios = ver("mis documentos (paciente)", c.get(f"{A}/historia/mia/documentos", headers=H, params={"afiliado_id": titular}), 200).json()
    comprobar("el paciente ve sus documentos", len(mios["formulas"]) == 1 and len(mios["incapacidades"]) == 1)
    pdf_f = ver("PDF de la fórmula (paciente)", c.get(f"{A}/historia/documentos/formula/{formula['id']}/pdf", headers=H), 200)
    comprobar("la fórmula es un PDF", pdf_f.content[:4] == b"%PDF")
    ver("PDF de la incapacidad (doctor que la expidió)", c.get(f"{A}/historia/documentos/incapacidad/{incap['id']}/pdf", headers=HG), 200)
    ver("otro doctor no descarga el PDF", c.get(f"{A}/historia/documentos/formula/{formula['id']}/pdf", headers=HN), 403)
    v = ver("verificar la fórmula", c.get(f"{A}/historia/verificar/{formula['codigo']}"), 200).json()
    comprobar("auténtica y sin contenido clínico", v["valido"] and "medicamentos" not in v and "diagnostico" not in v and "***" in v["paciente"], v)
    comprobar("código inexistente no es válido", not c.get(f"{A}/historia/verificar/ZZZZ-ZZZZ").json()["valido"])

print("— Portal del doctor: pacientes, remisiones y ausencias")
pacs = ver("mis pacientes", c.get(f"{A}/citas/doctor/pacientes", headers=HG), 200).json()
comprobar("el paciente aparece en su lista", any(x["afiliado_id"] == titular for x in pacs))
comprobar("la búsqueda filtra", not c.get(f"{A}/citas/doctor/pacientes", headers=HG, params={"q": "zzz-no-existe"}).json())
emitidas = ver("remisiones emitidas", c.get(f"{A}/tramites/remisiones/emitidas", headers=HG), 200).json()
comprobar("la remisión aparece en las emitidas", len(emitidas) >= (1 if puede_atender else 0))
ini, fin = (HOY + timedelta(days=40)).isoformat(), (HOY + timedelta(days=42)).isoformat()
aus = ver("solicitar vacaciones", c.post(f"{A}/citas/doctor/ausencias", headers=HG, json={"tipo": "vacaciones", "fecha_inicio": ini,
    "fecha_fin": fin, "motivo": "Vacaciones programadas"}), 201).json()
ver("solicitud que se cruza (debe fallar)", c.post(f"{A}/citas/doctor/ausencias", headers=HG, json={"tipo": "capacitacion",
    "fecha_inicio": fin, "fecha_fin": fin, "motivo": "Congreso médico"}), 409)
ver("ausencia en el pasado (debe fallar)", c.post(f"{A}/citas/doctor/ausencias", headers=HG, json={"tipo": "otro",
    "fecha_inicio": (HOY - timedelta(days=3)).isoformat(), "fecha_fin": HOY.isoformat(), "motivo": "Algo pasado"}), 422)
ver("un afiliado no ve la bandeja de ausencias", c.get(f"{A}/citas/admin/ausencias", headers=H), 403)
cuenta = ver("pendientes en la bandeja", c.get(f"{A}/citas/admin/ausencias/cuenta", headers=HA), 200).json()
comprobar("hay al menos una pendiente", cuenta["pendientes"] >= 1, cuenta)
ver("rechazar sin explicar (debe fallar)", c.post(f"{A}/citas/admin/ausencias/{aus['id']}/rechazar", headers=HA, json={}), 422)
aprob = ver("aprobar las vacaciones", c.post(f"{A}/citas/admin/ausencias/{aus['id']}/aprobar", headers=HA, json={"respuesta": "Buen descanso"}), 200).json()
comprobar("quedó aprobada", aprob["estado"] == "aprobada")
malla_g = c.get(f"{A}/citas/doctor/malla", headers=HG, params={"desde": ini}).json()
comprobar("la agenda quedó bloqueada esos días", any(e["fecha_inicio"] == ini for e in malla_g["excepciones"]))
ver("retirar una solicitud ya aprobada (debe fallar)", c.post(f"{A}/citas/doctor/ausencias/{aus['id']}/cancelar", headers=HG), 409)

print("— Cambiar contraseña")
ver("contraseña actual equivocada (debe fallar)", c.post(f"{A}/auth/cambiar-clave", headers=H, json={"clave_actual": "Otra1234", "clave_nueva": "Nueva2026"}), 422)
ver("contraseña nueva débil (debe fallar)", c.post(f"{A}/auth/cambiar-clave", headers=H, json={"clave_actual": "Marta1234", "clave_nueva": "corta"}), 422)
ver("cambiar contraseña", c.post(f"{A}/auth/cambiar-clave", headers=H, json={"clave_actual": "Marta1234", "clave_nueva": "Nueva2026"}), 204)
ver("entra con la nueva", c.post(f"{A}/auth/login", json={"correo": CORREO, "clave": "Nueva2026"}), 200)
ver("la anterior ya no sirve", c.post(f"{A}/auth/login", json={"correo": CORREO, "clave": "Marta1234"}), 401)

print("— Inactivar un doctor")
ver("inactivar", c.put(f"{A}/prestadores/admin/doctores/{doc_n['id']}", headers=HA, json={"estado": "inactivo"}), 200)
ver("el doctor inactivo ya no entra", c.post(f"{A}/auth/login", json={"correo": datos_n["correo"], "clave": "Doctor123"}), 403)

print()
if fallas:
    print(f"FALLARON {len(fallas)} comprobaciones: {fallas}")
    sys.exit(1)
print("Todas las comprobaciones pasaron.")
