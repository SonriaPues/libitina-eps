import uuid
from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class EspecialidadIn(BaseModel):
    nombre: str = Field(min_length=3, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    requiere_remision: bool = True
    duracion_cita_min: int = Field(default=20, ge=10, le=120)


class EspecialidadCambio(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=3, max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    requiere_remision: Optional[bool] = None
    duracion_cita_min: Optional[int] = Field(default=None, ge=10, le=120)
    activa: Optional[bool] = None


class DoctorIn(BaseModel):
    tipo_documento: Literal["CC", "CE", "PPT", "PA"]
    numero_documento: str = Field(pattern=r"^[0-9A-Za-z]{5,20}$")
    nombres: str = Field(min_length=1, max_length=80)
    apellidos: str = Field(min_length=1, max_length=80)
    correo: EmailStr
    especialidad_id: uuid.UUID
    tarjeta_profesional: str = Field(pattern=r"^[0-9A-Za-z-]{4,30}$")
    universidad: str = Field(min_length=3, max_length=150)
    anio_graduacion: int = Field(ge=1960, le=2100)
    sede_principal_id: Optional[uuid.UUID] = None
    tipo_vinculacion: Literal["planta", "contratista"] = "planta"
    fecha_ingreso: date

    @field_validator("nombres", "apellidos", "universidad", "numero_documento", "tarjeta_profesional", mode="before")
    @classmethod
    def limpiar(cls, v):
        return v.strip() if isinstance(v, str) else v


class DoctorCambio(BaseModel):
    especialidad_id: Optional[uuid.UUID] = None
    sede_principal_id: Optional[uuid.UUID] = None
    estado: Optional[Literal["activo", "vacaciones", "inactivo"]] = None
    tipo_vinculacion: Optional[Literal["planta", "contratista"]] = None
    universidad: Optional[str] = Field(default=None, min_length=3, max_length=150)
