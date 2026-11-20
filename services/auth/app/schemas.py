import re
import uuid
from typing import Literal
from pydantic import BaseModel, EmailStr, Field, field_validator


# Palabras que aparecen en las listas de contraseñas filtradas más usadas, o que un atacante probaría primero
# contra esta EPS. Se rechazan solas o con números y símbolos al final (Password1, Libitina2026!, Qwerty123).
PALABRAS_COMUNES = {
    "password", "passw0rd", "contraseña", "contrasena", "clave", "qwerty", "qwertyuiop", "asdfgh", "asdfghjk", "zxcvbn",
    "abc", "abcd", "abcde", "abcdef", "abcdefg", "abcdefgh", "admin", "administrador", "root", "usuario", "user",
    "welcome", "bienvenido", "bienvenida", "hola", "holamundo", "letmein", "iloveyou", "teamo", "test", "prueba",
    "libitina", "libitinaeps", "eps", "salud", "colombia", "bogota", "medellin", "cali", "dragon", "monkey",
    "football", "futbol", "baseball", "superman", "batman", "princess", "sunshine", "master", "shadow", "michael",
    "jesus", "dios", "familia", "amor", "secreto", "secret", "cambiame", "changeme", "default", "temporal",
}
SECUENCIAS = ("12345678", "87654321", "11111111", "00000000", "123456789", "1234567890", "qwerty", "asdfgh")


def validar_clave(v: str) -> str:
    if len(v) < 8 or not re.search(r"[A-Z]", v) or not re.search(r"\d", v):
        raise ValueError("La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.")
    baja = v.lower()
    raiz = re.sub(r"[\d\W_]+$", "", baja)           # Password123! → password
    if raiz in PALABRAS_COMUNES or any(s in baja for s in SECUENCIAS) or len(set(baja)) <= 3:
        raise ValueError("Esa contraseña es demasiado común y fácil de adivinar. Usa una combinación propia.")
    return v


class LoginIn(BaseModel):
    correo: EmailStr
    clave: str


class UsuarioOut(BaseModel):
    id: uuid.UUID
    correo: str
    rol: str
    nombre: str
    email_verificado: bool


class SesionOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


class RefreshIn(BaseModel):
    refresh_token: str


class CorreoIn(BaseModel):
    correo: EmailStr


class NuevaClaveIn(BaseModel):
    token: str
    clave: str
    _v = field_validator("clave")(validar_clave)


class UsuarioInterno(BaseModel):
    tipo_documento: Literal["CC", "TI", "RC", "CE", "PPT", "PA"]
    numero_documento: str = Field(min_length=3, max_length=20)
    nombres: str = Field(min_length=1, max_length=80)
    apellidos: str = Field(min_length=1, max_length=80)
    correo: EmailStr
    clave: str | None = None          # sin clave: el usuario la crea con un enlace (doctores)
    rol: Literal["afiliado", "doctor"] = "afiliado"

    @field_validator("clave")
    @classmethod
    def _v(cls, v):
        return validar_clave(v) if v is not None else v


class CambioInterno(BaseModel):
    activo: bool | None = None
    email_verificado: bool | None = None
    nombres: str | None = Field(default=None, min_length=1, max_length=80)
    apellidos: str | None = Field(default=None, min_length=1, max_length=80)


class CambioClaveIn(BaseModel):
    clave_actual: str = Field(min_length=1, max_length=200)
    clave_nueva: str
    _v = field_validator("clave_nueva")(validar_clave)
