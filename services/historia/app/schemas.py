import uuid
from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator

CIE10 = r"^[A-Za-z][0-9]{2}(\.?[0-9A-Za-z]{1,4})?$"


class SignosVitales(BaseModel):
    tension_arterial: Optional[str] = Field(default=None, pattern=r"^[0-9]{2,3}/[0-9]{2,3}$")
    frecuencia_cardiaca: Optional[int] = Field(default=None, ge=20, le=250)
    frecuencia_respiratoria: Optional[int] = Field(default=None, ge=5, le=80)
    temperatura: Optional[float] = Field(default=None, ge=30, le=45)
    saturacion: Optional[int] = Field(default=None, ge=50, le=100)
    peso_kg: Optional[float] = Field(default=None, gt=0, le=400)
    talla_cm: Optional[float] = Field(default=None, gt=20, le=250)


class ConsultaIn(BaseModel):
    cita_id: uuid.UUID
    motivo_consulta: str = Field(min_length=3, max_length=2000)
    enfermedad_actual: Optional[str] = Field(default=None, max_length=5000)
    signos_vitales: SignosVitales = SignosVitales()
    examen_fisico: Optional[str] = Field(default=None, max_length=5000)
    diagnostico_cie10: str = Field(pattern=CIE10)
    diagnostico_desc: str = Field(min_length=3, max_length=200)
    tratamiento: str = Field(min_length=3, max_length=5000)
    observaciones: Optional[str] = Field(default=None, max_length=2000)
    proxima_cita: Optional[date] = None

    @field_validator("diagnostico_cie10")
    @classmethod
    def mayusculas(cls, v):
        return v.upper()


class AntecedenteIn(BaseModel):
    tipo: Literal["personal", "familiar", "quirurgico", "farmacologico", "toxicologico", "ginecobstetrico"]
    descripcion: str = Field(min_length=3, max_length=2000)
    fecha_diagnostico: Optional[date] = None


class AlergiaIn(BaseModel):
    agente: str = Field(min_length=2, max_length=150)
    tipo: Literal["medicamento", "alimento", "ambiental", "otro"]
    severidad: Literal["leve", "moderada", "severa"]
    reaccion: Optional[str] = Field(default=None, max_length=500)
