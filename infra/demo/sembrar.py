"""Carga doctores (con turnos) y afiliados aprobados de demostración.

Lee un JSON por la entrada estándar (lo genera quien prepara la demo; NO se sube al repositorio porque
trae contraseñas). Usa las API de cada servicio desde la red interna, así que se aplican las mismas
reglas de negocio que en la página. Se puede correr varias veces: lo que ya existe no se duplica.

    bash infra/demo/cargar.sh datos-demo.json
"""
import json
import os
import re
import sys
import time

import httpx

URL = {s: os.getenv(f"{s.upper()}_URL", f"http://{s}:8000") for s in ("auth", "afiliados", "prestadores", "citas")}
INTERNO = {"X-Internal-Token": os.environ["INTERNAL_TOKEN"]}
c = httpx.Client(timeout=60)


def ok(r, *codigos):
    if r.status_code not in (codigos or (200, 201)):
        sys.exit(f"Error {r.status_code} en {r.request.method} {r.request.url}: {r.text[:400]}")
    return r.json() if r.content else None


def fijar_clave(usuario_id, clave):
    enlace = ok(c.post(f"{URL['auth']}/internal/usuarios/{usuario_id}/enlace-clave", headers=INTERNO))["enlace_clave"]
    token = re.search(r"token=([^&]+)", enlace).group(1)
    ok(c.post(f"{URL['auth']}/auth/recuperar/confirmar", json={"token": token, "clave": clave}))
    ok(c.patch(f"{URL['auth']}/internal/usuarios/{usuario_id}", headers=INTERNO, json={"email_verificado": True}))


datos = json.load(sys.stdin)
r = ok(c.post(f"{URL['auth']}/auth/login", json={"correo": os.environ["ADMIN_CORREO"], "clave": os.environ["ADMIN_CLAVE"]}))
H = {"Authorization": f"Bearer {r['access_token']}"}

# ---------------- Doctores ----------------
especialidades = {e["codigo"]: e for e in ok(c.get(f"{URL['prestadores']}/prestadores/especialidades",
                                                    params={"incluir_inactivas": True}))}
puntos = {p["ips_id"]: p["id"] for p in ok(c.get(f"{URL['prestadores']}/prestadores/puntos-atencion"))}
existentes = {d["email"]: d for d in ok(c.get(f"{URL['prestadores']}/prestadores/admin/doctores", headers=H))}
nuevos = 0
for d in datos["doctores"]:
    esp = especialidades[d["especialidad"]]
    if not esp["activa"]:
        ok(c.put(f"{URL['prestadores']}/prestadores/especialidades/{esp['id']}", headers=H, json={"activa": True}))
        esp["activa"] = True
    if d["correo"] in existentes:
        d["id"] = existentes[d["correo"]]["usuario_id"]
    else:
        cuerpo = {k: d[k] for k in ("tipo_documento", "numero_documento", "nombres", "apellidos", "correo", "tarjeta_profesional",
                                    "universidad", "anio_graduacion", "tipo_vinculacion", "fecha_ingreso")}
        cuerpo |= {"especialidad_id": esp["id"], "sede_principal_id": puntos[d["ips_id"]]}
        d["id"] = ok(c.post(f"{URL['prestadores']}/prestadores/admin/doctores", headers=H, json=cuerpo))["usuario_id"]
        nuevos += 1
    fijar_clave(d["id"], d["clave"])
print(f"Doctores: {nuevos} nuevos, {len(datos['doctores']) - nuevos} ya existían (contraseñas actualizadas).")

# Turnos: el doctor llega a Citas por un evento; se espera a que aparezca.
turnos = 0
for d in datos["doctores"]:
    for _ in range(60):
        r = c.get(f"{URL['citas']}/citas/admin/doctores/{d['id']}/agenda", headers=H)
        if r.status_code == 200:
            break
        time.sleep(2)
    else:
        sys.exit(f"{d['correo']} no llegó a Citas. Revisa que el contenedor citas-worker esté corriendo.")
    actuales = {(t["dia_semana"], t["hora_inicio"]) for t in r.json()["turnos"]}
    for t in d["turnos"]:
        if (t["dia_semana"], t["hora_inicio"]) not in actuales:
            ok(c.post(f"{URL['citas']}/citas/admin/doctores/{d['id']}/turnos", headers=H,
                      json={**t, "punto_atencion_id": puntos[d["ips_id"]]}), 201)
            turnos += 1
print(f"Turnos: {turnos} nuevos.")

# ---------------- Afiliados ----------------
nuevos = 0
for a in datos["afiliados"]:
    r = c.post(f"{URL['afiliados']}/afiliados/inscripcion", json=a["inscripcion"])
    if r.status_code == 201:
        nuevos += 1
    elif r.status_code != 409:
        ok(r)
pendientes = ok(c.get(f"{URL['afiliados']}/afiliados/solicitudes", headers=H, params={"estado": "pendiente"}))
correos = {a["inscripcion"]["cuenta"]["correo"]: a["inscripcion"]["cuenta"]["clave"] for a in datos["afiliados"]}
aprobados = 0
for s in pendientes:
    if s["email"] in correos:
        ok(c.post(f"{URL['afiliados']}/afiliados/solicitudes/{s['id']}/aprobar", headers=H))
        aprobados += 1
for s in ok(c.get(f"{URL['afiliados']}/afiliados/solicitudes", headers=H, params={"estado": "activo"})):
    if s["email"] in correos:
        fijar_clave(s["usuario_id"], correos[s["email"]])
print(f"Afiliados: {nuevos} nuevos, {aprobados} aprobados ahora.")
print("Listo. Las cuentas de demostración no reciben correos (dominio sin envío).")
