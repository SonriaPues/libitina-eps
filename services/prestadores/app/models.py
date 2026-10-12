import uuid
from sqlalchemy import String, Boolean, Text, SmallInteger, Numeric, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

Id = lambda: mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))  # noqa: E731


class Ips(Base):
    __tablename__ = "ips"
    id: Mapped[uuid.UUID] = Id()
    nit: Mapped[str] = mapped_column(String(20))
    nombre: Mapped[str] = mapped_column(String(150))
    nivel: Mapped[str] = mapped_column(ENUM("primaria", "secundaria", "terciaria", name="nivel_ips", create_type=False))
    direccion: Mapped[str | None] = mapped_column(Text)
    ciudad: Mapped[str] = mapped_column(String(80))
    departamento: Mapped[str] = mapped_column(String(80))
    telefono: Mapped[str | None] = mapped_column(String(20))
    horario: Mapped[str | None] = mapped_column(String(120))
    imagen_url: Mapped[str | None] = mapped_column(String(255))
    latitud = mapped_column(Numeric(9, 6))
    longitud = mapped_column(Numeric(9, 6))
    servicios: Mapped[list] = mapped_column(JSONB)
    activa: Mapped[bool] = mapped_column(Boolean)


class PuntoAtencion(Base):
    __tablename__ = "puntos_atencion"
    id: Mapped[uuid.UUID] = Id()
    ips_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("ips.id"))
    nombre: Mapped[str] = mapped_column(String(150))
    ciudad: Mapped[str] = mapped_column(String(80))
    direccion: Mapped[str] = mapped_column(Text)
    servicios: Mapped[list] = mapped_column(JSONB)
    activo: Mapped[bool] = mapped_column(Boolean)


class PerfilDoctor(Base):
    __tablename__ = "perfiles_doctor"
    id: Mapped[uuid.UUID] = Id()
    usuario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    nombre_completo: Mapped[str] = mapped_column(String(160))
    especialidad: Mapped[str] = mapped_column(String(100))
    sede_principal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    estado: Mapped[str] = mapped_column(ENUM("activo", "vacaciones", "inactivo", name="estado_doctor", create_type=False))
