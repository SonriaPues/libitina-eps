import uuid
from datetime import date, time
from typing import Optional
from pydantic import BaseModel, Field, model_validator


class AgendarIn(BaseModel):
    afiliado_id: uuid.UUID                 # el titular o uno de sus beneficiarios
    especialidad_codigo: str = Field(max_length=40)
    doctor_id: uuid.UUID
    punto_atencion_id: uuid.UUID
    fecha: date
    hora: time
    motivo: str = Field(min_length=5, max_length=500)


class ReagendarIn(BaseModel):
    doctor_id: uuid.UUID
    punto_atencion_id: uuid.UUID
    fecha: date
    hora: time


class CancelarIn(BaseModel):
    motivo: str = Field(min_length=5, max_length=500)


class TurnoIn(BaseModel):
    dia_semana: int = Field(ge=0, le=6)
    hora_inicio: time
    hora_fin: time
    punto_atencion_id: uuid.UUID

    @model_validator(mode="after")
    def orden(self):
        if self.hora_fin <= self.hora_inicio:
            raise ValueError("La hora de fin debe ser posterior a la de inicio.")
        if self.hora_inicio.hour < 6 or self.hora_fin.hour > 21 or (self.hora_fin.hour == 21 and self.hora_fin.minute > 0):
            raise ValueError("Los turnos van entre las 6:00 a. m. y las 9:00 p. m.")
        return self


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
