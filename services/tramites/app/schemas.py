import re
import uuid
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class RemisionIn(BaseModel):
    cita_id: uuid.UUID
    especialidad_codigo: str = Field(max_length=40)
    diagnostico_cie10: str = Field(pattern=r"^[A-Za-z][0-9]{2}(\.?[0-9A-Za-z]{1,4})?$")
    diagnostico_desc: str = Field(min_length=3, max_length=200)
    descripcion_clinica: str = Field(min_length=10, max_length=2000)
    urgente: bool = False

    @field_validator("diagnostico_cie10")
    @classmethod
    def mayusculas(cls, v):
        return v.upper()


class UsarRemisionIn(BaseModel):
    cita_id: uuid.UUID
    cita_anterior_id: Optional[uuid.UUID] = None


class PqrsdIn(BaseModel):
    tipo: Literal["peticion", "queja", "reclamo", "sugerencia", "denuncia"]
    anonima: bool = False
    nombre_contacto: Optional[str] = Field(default=None, max_length=150)
    documento_contacto: Optional[str] = Field(default=None, max_length=20)
    email_contacto: Optional[EmailStr] = None
    telefono_contacto: Optional[str] = Field(default=None, max_length=20)
    asunto: str = Field(min_length=5, max_length=200)
    descripcion: str = Field(min_length=20, max_length=5000)

    @model_validator(mode="after")
    def contacto(self):
        if self.anonima:   # anónima: no se guarda ningún dato de contacto
            self.nombre_contacto = self.documento_contacto = self.email_contacto = self.telefono_contacto = None
            return self
        if not (self.nombre_contacto and self.nombre_contacto.strip() and self.email_contacto):
            raise ValueError("Escribe tu nombre y tu correo para enviarte la respuesta, o radícala como anónima.")
        if not self.documento_contacto or not re.fullmatch(r"[0-9A-Za-z]{3,20}", self.documento_contacto):
            raise ValueError("Escribe tu número de documento: lo necesitarás para consultar la respuesta.")
        self.nombre_contacto = self.nombre_contacto.strip()
        return self


class RespuestaIn(BaseModel):
    respuesta: str = Field(min_length=20, max_length=5000)
