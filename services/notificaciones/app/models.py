import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Text, SmallInteger, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

Id = lambda: mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))  # noqa: E731


class Plantilla(Base):
    __tablename__ = "plantillas_correo"
    id: Mapped[uuid.UUID] = Id()
    evento: Mapped[str] = mapped_column(String(60))
    asunto: Mapped[str] = mapped_column(String(200))
    cuerpo_html: Mapped[str] = mapped_column(Text)
    resumen: Mapped[str] = mapped_column(String(255))
    activa: Mapped[bool] = mapped_column(Boolean)


class Notificacion(Base):
    __tablename__ = "notificaciones"
    id: Mapped[uuid.UUID] = Id()
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    email_destino: Mapped[str] = mapped_column(String(150))
    asunto: Mapped[str] = mapped_column(String(200))
    cuerpo_html: Mapped[str] = mapped_column(Text)
    resumen: Mapped[str] = mapped_column(String(255))
    enlace: Mapped[str | None] = mapped_column(String(255))
    estado: Mapped[str] = mapped_column(ENUM("pendiente", "enviado", "fallido", name="estado_envio", create_type=False), server_default="pendiente")
    origen: Mapped[str] = mapped_column(ENUM("autenticacion", "afiliados", "prestadores", "historia_clinica", "tramites", "citas", "admin", name="origen_evento", create_type=False))
    evento: Mapped[str] = mapped_column(String(60))
    referencia_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    leida: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    leida_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    enviado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LogEnvio(Base):
    __tablename__ = "log_envios"
    id: Mapped[uuid.UUID] = Id()
    notificacion_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notificaciones.id"))
    intento: Mapped[int] = mapped_column(SmallInteger)
    resultado: Mapped[str] = mapped_column(ENUM("ok", "error", name="resultado_envio", create_type=False))
    detalle_error: Mapped[str | None] = mapped_column(Text)
