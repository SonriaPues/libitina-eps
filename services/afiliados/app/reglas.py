"""Reglas de afiliación del régimen contributivo y subsidiado (Decreto 780 de 2016)."""
from datetime import date
from fastapi import HTTPException


def edad(nacimiento: date, hoy: date | None = None) -> int:
    hoy = hoy or date.today()
    return hoy.year - nacimiento.year - ((hoy.month, hoy.day) < (nacimiento.month, nacimiento.day))


def validar_titular(t):
    if edad(t.fecha_nacimiento) < 18:
        raise HTTPException(422, "El titular de la afiliación debe ser mayor de edad.")
    if t.tipo_documento in ("RC", "TI"):
        raise HTTPException(422, "El titular debe identificarse con cédula, cédula de extranjería, PPT o pasaporte.")


def validar_grupo(titular, beneficiarios):
    """Devuelve la lista de errores del grupo familiar; vacía si todo está bien."""
    errores = []
    parejas = [b for b in beneficiarios if b.parentesco in ("conyuge", "companero_permanente")]
    hijos = [b for b in beneficiarios if b.parentesco == "hijo"]
    padres = [b for b in beneficiarios if b.parentesco in ("padre", "madre")]
    if len(parejas) > 1:
        errores.append("Solo puedes afiliar a un cónyuge o compañero permanente.")
    if padres and (parejas or hijos):
        errores.append("Los padres solo pueden ser beneficiarios si no tienes cónyuge ni hijos afiliados.")
    if len([p for p in padres if p.parentesco == "padre"]) > 1 or len([p for p in padres if p.parentesco == "madre"]) > 1:
        errores.append("Solo puedes afiliar a un padre y a una madre.")
    documentos = {(titular.tipo_documento, titular.numero_documento)}
    for b in beneficiarios:
        nombre = f"{b.nombres} {b.apellidos}"
        clave = (b.tipo_documento, b.numero_documento)
        if clave in documentos:
            errores.append(f"El documento {b.tipo_documento} {b.numero_documento} está repetido en la solicitud.")
        documentos.add(clave)
        if b.parentesco == "hijo" and edad(b.fecha_nacimiento) >= 25 and not b.incapacidad_permanente:
            errores.append(f"{nombre}: los hijos de 25 años o más solo pueden ser beneficiarios con incapacidad permanente.")
        if b.parentesco == "hijo" and b.fecha_nacimiento <= titular.fecha_nacimiento:
            errores.append(f"{nombre}: la fecha de nacimiento no es coherente con el parentesco hijo.")
        if b.parentesco in ("padre", "madre") and b.fecha_nacimiento >= titular.fecha_nacimiento:
            errores.append(f"{nombre}: la fecha de nacimiento no es coherente con el parentesco {b.parentesco}.")
        if b.parentesco in ("conyuge", "companero_permanente") and edad(b.fecha_nacimiento) < 18:
            errores.append(f"{nombre}: el cónyuge o compañero debe ser mayor de edad.")
    if errores:
        raise HTTPException(422, " ".join(errores))


def ocultar(texto: str) -> str:
    """'Rodríguez Pérez' → 'R*** P***' (consulta pública)."""
    return " ".join(p[0] + "***" for p in texto.split() if p)
