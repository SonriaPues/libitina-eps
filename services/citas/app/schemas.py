import uuid
from datetime import date, time
from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator


class AgendarIn(BaseModel):
    afiliado_id: uuid.UUID                 # el titular o uno de sus beneficiarios
    especialidad_codigo: str = Field(max_length=40)
    doctor_id: Optional[uuid.UUID] = None   # sin doctor: se asigna el profesional libre con menos citas ese día
    punto_atencion_id: uuid.UUID
    fecha: date
    hora: time
    motivo: str = Field(min_length=5, max_length=500)


class ReagendarIn(BaseModel):
    doctor_id: Optional[uuid.UUID] = None
    punto_atencion_id: uuid.UUID
    fecha: date
    hora: time


class CancelarIn(BaseModel):
    motivo: str = Field(min_length=5, max_length=500)


class TurnoCambio(BaseModel):
    """Mover o estirar un turno (desde la malla del administrador)."""
    dia_semana: int = Field(ge=0, le=6)
    hora_inicio: time
    hora_fin: time

    @model_validator(mode="after")
    def orden(self):
        return validar_rango(self)


class TurnoIn(TurnoCambio):
    punto_atencion_id: uuid.UUID


def validar_rango(t):
    if t.hora_fin <= t.hora_inicio:
        raise ValueError("La hora de fin debe ser posterior a la de inicio.")
    if t.hora_inicio.hour < 6 or t.hora_fin.hour > 21 or (t.hora_fin.hour == 21 and t.hora_fin.minute > 0):
        raise ValueError("Los turnos van entre las 6:00 a. m. y las 9:00 p. m.")
    return t


class ExcepcionIn(BaseModel):
    fecha_inicio: date
    fecha_fin: date
    motivo: str = Field(min_length=3, max_length=150)

    @model_validator(mode="after")
    def orden(self):
        if self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha final no puede ser anterior a la inicial.")
        return self


class DoctorCopia(BaseModel):
    doctor_id: uuid.UUID
    nombre_completo: str
    especialidad: str
    especialidad_codigo: str
    duracion_cita_min: int
    sede_principal_id: Optional[uuid.UUID] = None
    activo: bool


class AusenciaIn(BaseModel):
    tipo: Literal["vacaciones", "incapacidad", "capacitacion", "calamidad", "otro"]
    fecha_inicio: date
    fecha_fin: date
    motivo: str = Field(min_length=5, max_length=500)

    @model_validator(mode="after")
    def orden(self):
        if self.fecha_fin < self.fecha_inicio:
            raise ValueError("La fecha final no puede ser anterior a la inicial.")
        if (self.fecha_fin - self.fecha_inicio).days > 59:
            raise ValueError("Solicita como máximo 60 días seguidos.")
        return self


class RespuestaAusenciaIn(BaseModel):
    respuesta: Optional[str] = Field(default=None, max_length=500)
