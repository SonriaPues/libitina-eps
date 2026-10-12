import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, SmallInteger, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

TipoDocumento = ENUM("CC", "TI", "RC", "CE", "PPT", "PA", name="tipo_documento", create_type=False)
Rol = ENUM("afiliado", "doctor", "admin", name="rol_usuario", create_type=False)
TipoToken = ENUM("verificacion_email", "recuperacion_contrasena", name="tipo_token", create_type=False)
Id = lambda: mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))  # noqa: E731


class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[uuid.UUID] = Id()
    tipo_documento: Mapped[str] = mapped_column(TipoDocumento)
    numero_documento: Mapped[str] = mapped_column(String(20))
    nombres: Mapped[str] = mapped_column(String(80))
    apellidos: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(150))
    password_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(Rol, server_default="afiliado")
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    email_verificado: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    intentos_fallidos: Mapped[int] = mapped_column(SmallInteger, server_default=text("0"))
    bloqueado_hasta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ultimo_acceso: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    @property
    def nombre(self) -> str:
        return f"{self.nombres} {self.apellidos}"


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id: Mapped[uuid.UUID] = Id()
    usuario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    token_hash: Mapped[str] = mapped_column(String(128))
    user_agent: Mapped[str | None] = mapped_column(String(255))
    ip_origen: Mapped[str | None] = mapped_column(String(45))
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revocado: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))


class TokenVerificacion(Base):
    __tablename__ = "tokens_verificacion"
    id: Mapped[uuid.UUID] = Id()
    usuario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    token_hash: Mapped[str] = mapped_column(String(128))
    tipo: Mapped[str] = mapped_column(TipoToken)
    usado: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
