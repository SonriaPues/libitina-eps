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


class Medicamento(BaseModel):
    medicamento: str = Field(min_length=2, max_length=150)        # nombre genérico y concentración
    presentacion: str = Field(default="Tableta", max_length=60)
    dosis: str = Field(min_length=1, max_length=60)                # ej.: 1 tableta
    frecuencia: str = Field(min_length=2, max_length=60)           # ej.: cada 12 horas
    duracion: str = Field(min_length=2, max_length=60)             # ej.: 30 días
    via: str = Field(default="Oral", max_length=30)
    cantidad: int = Field(ge=1, le=999)


class FormulaIn(BaseModel):
    cita_id: uuid.UUID
    medicamentos: list[Medicamento] = Field(min_length=1, max_length=10)
    indicaciones: Optional[str] = Field(default=None, max_length=1000)


class IncapacidadIn(BaseModel):
    cita_id: uuid.UUID
    tipo: Literal["enfermedad_general", "accidente_comun", "accidente_laboral", "enfermedad_laboral"] = "enfermedad_general"
    fecha_inicio: Optional[date] = None        # por defecto, el día de la consulta
    dias: int = Field(ge=1, le=30)
    observaciones: Optional[str] = Field(default=None, max_length=500)
