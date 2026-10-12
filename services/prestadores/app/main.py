from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .db import get_db
from .models import Ips, PuntoAtencion, PerfilDoctor

app = FastAPI(title="Libitina · Red de Prestadores", version="1.0.0",
              description="IPS, puntos de atención, profesionales y recursos físicos de la red.")


def ips_out(i: Ips) -> dict:
    return {"id": i.id, "nit": i.nit, "nombre": i.nombre, "nivel": i.nivel, "ciudad": i.ciudad, "departamento": i.departamento,
            "direccion": i.direccion, "telefono": i.telefono, "horario": i.horario, "imagen": i.imagen_url, "servicios": i.servicios,
            "latitud": float(i.latitud) if i.latitud is not None else None, "longitud": float(i.longitud) if i.longitud is not None else None}


@app.get("/health", tags=["Salud"])
def salud():
    return {"servicio": "prestadores", "estado": "ok"}


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
    try:
        i = db.get(Ips, ips_id)
    except Exception:  # noqa: BLE001 - id con formato inválido
        i = None
    if not i or not i.activa:
        raise HTTPException(404, "IPS no encontrada.")
    return ips_out(i)


@app.get("/prestadores/puntos-atencion", tags=["Puntos de atención"])
def puntos(ciudad: str = "", db: Session = Depends(get_db)):
    q = select(PuntoAtencion).where(PuntoAtencion.activo)
    if ciudad:
        q = q.where(PuntoAtencion.ciudad == ciudad)
    return [{"id": p.id, "ips_id": p.ips_id, "nombre": p.nombre, "ciudad": p.ciudad, "direccion": p.direccion, "servicios": p.servicios}
            for p in db.scalars(q)]


@app.get("/prestadores/doctores", tags=["Profesionales"])
def doctores(especialidad: str = "", db: Session = Depends(get_db)):
    q = select(PerfilDoctor).where(PerfilDoctor.estado == "activo")
    if especialidad:
        q = q.where(PerfilDoctor.especialidad == especialidad)
    return [{"usuario_id": d.usuario_id, "nombre": d.nombre_completo, "especialidad": d.especialidad, "sede_principal_id": d.sede_principal_id}
            for d in db.scalars(q)]
