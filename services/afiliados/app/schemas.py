import re
import uuid
from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

TipoDoc = Literal["CC", "TI", "RC", "CE", "PPT", "PA"]
Sexo = Literal["masculino", "femenino", "otro"]
Etnia = Literal["ninguna", "indigena", "rom", "raizal", "palenquero", "negro_afrocolombiano", "no_responde"]
TipoDiscapacidad = Literal["fisica", "visual", "auditiva", "intelectual", "psicosocial", "sordoceguera", "multiple"]
Parentesco = Literal["conyuge", "companero_permanente", "hijo", "padre", "madre"]
Texto = lambda n, minimo=1: Field(min_length=minimo, max_length=n)  # noqa: E731


def limpiar(v):
    return v.strip() if isinstance(v, str) else v


class Persona(BaseModel):
    tipo_documento: TipoDoc
    numero_documento: str = Field(pattern=r"^[0-9A-Za-z]{3,20}$")
    nombres: str = Texto(80)
    apellidos: str = Texto(80)
    fecha_nacimiento: date
    sexo: Sexo
    pertenencia_etnica: Etnia = "no_responde"
    tiene_discapacidad: Optional[bool] = None       # None = prefiere no responder
    tipo_discapacidad: Optional[TipoDiscapacidad] = None
    _l = field_validator("numero_documento", "nombres", "apellidos", mode="before")(limpiar)

    @model_validator(mode="after")
    def coherencia(self):
        if self.fecha_nacimiento > date.today():
            raise ValueError("La fecha de nacimiento no puede ser futura.")
        if self.tipo_discapacidad and not self.tiene_discapacidad:
            raise ValueError("Indica que tiene discapacidad para registrar el tipo.")
        return self


class Titular(Persona):
    telefono: str = Field(pattern=r"^[0-9]{7,15}$")
    direccion: str = Texto(200, 3)
    departamento: str = Texto(80)
    ciudad: str = Texto(80)
    zona: Literal["urbana", "rural"]


class Beneficiario(Persona):
    id: Optional[uuid.UUID] = None                  # solo al corregir una solicitud
    parentesco: Parentesco
    incapacidad_permanente: bool = False


class DatosAfiliacion(BaseModel):
    regimen: Literal["contributivo", "subsidiado"]
    ips_id: uuid.UUID
    tipo_cotizante: Optional[Literal["dependiente", "independiente", "pensionado"]] = None
    categoria: Optional[Literal["A", "B", "C"]] = None
    empleador_nit: Optional[str] = Field(default=None, pattern=r"^[0-9]{6,12}(-[0-9])?$")
    empleador_nombre: Optional[str] = Field(default=None, max_length=150)
    grupo_sisben: Optional[str] = None

    @model_validator(mode="after")
    def por_regimen(self):
        if self.regimen == "contributivo":
            if not self.tipo_cotizante or not self.categoria:
                raise ValueError("En el régimen contributivo indica el tipo de cotizante y tu rango de ingresos.")
            if self.tipo_cotizante == "dependiente" and not (self.empleador_nit and self.empleador_nombre):
                raise ValueError("Si eres dependiente, escribe el NIT y el nombre de tu empleador.")
            if self.tipo_cotizante != "dependiente":
                self.empleador_nit = self.empleador_nombre = None
            self.grupo_sisben = None
        else:
            if not self.grupo_sisben or not re.fullmatch(r"A[1-5]|B[1-7]", self.grupo_sisben.upper()):
                raise ValueError("El régimen subsidiado es para los grupos A y B del Sisbén (A1 a A5, B1 a B7).")
            self.grupo_sisben = self.grupo_sisben.upper()
            self.tipo_cotizante = self.categoria = self.empleador_nit = self.empleador_nombre = None
        return self


class Cuenta(BaseModel):
    correo: EmailStr
    clave: str


class ConsentimientoIn(BaseModel):
    autoriza_datos_salud: bool
    autoriza_contacto_comercial: bool = False
    declara_veracidad: bool
    canal_notificacion: Literal["email", "sms", "whatsapp"] = "email"

    @model_validator(mode="after")
    def obligatorios(self):
        if not self.autoriza_datos_salud:
            raise ValueError("Para afiliarte debes autorizar el tratamiento de tus datos de salud.")
        if not self.declara_veracidad:
            raise ValueError("Debes declarar que la información es verdadera.")
        return self


class InscripcionIn(BaseModel):
    titular: Titular
    afiliacion: DatosAfiliacion
    beneficiarios: list[Beneficiario] = Field(default_factory=list, max_length=15)
    cuenta: Cuenta
    consentimiento: ConsentimientoIn


class ReenvioIn(BaseModel):
    titular: Titular
    afiliacion: DatosAfiliacion
    beneficiarios: list[Beneficiario] = Field(default_factory=list, max_length=15)


class RechazoIn(BaseModel):
    motivo: str = Field(min_length=10, max_length=1000)
