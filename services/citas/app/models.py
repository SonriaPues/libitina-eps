import uuid
from datetime import date, time, datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, Text, SmallInteger, Numeric, Date, Time, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

Id = lambda: mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))  # noqa: E731
Ref = lambda *a, **k: mapped_column(UUID(as_uuid=True), *a, **k)  # noqa: E731
ESTADO = ENUM("pendiente", "confirmada", "reagendada", "cancelada", "realizada", "no_asistio", name="estado_cita", create_type=False)
ACTIVAS = ("pendiente", "confirmada")


class Doctor(Base):
    """Copia local de los doctores de Red de Prestadores (se actualiza por eventos)."""
    __tablename__ = "doctores"
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    nombre_completo: Mapped[str] = mapped_column(String(160))
    especialidad: Mapped[str] = mapped_column(String(100))
    especialidad_codigo: Mapped[str | None] = mapped_column(String(40))
    duracion_cita_min: Mapped[int] = mapped_column(SmallInteger, server_default=text("20"))
    sede_principal_id: Mapped[uuid.UUID | None] = Ref()
    atiende_domicilio: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))


class Turno(Base):
    __tablename__ = "agenda_doctor"
    id: Mapped[uuid.UUID] = Id()
    doctor_id: Mapped[uuid.UUID] = Ref(ForeignKey("doctores.doctor_id"))
    dia_semana: Mapped[int] = mapped_column(SmallInteger)   # 0 = lunes
    hora_inicio: Mapped[time] = mapped_column(Time)
    hora_fin: Mapped[time] = mapped_column(Time)
    punto_atencion_id: Mapped[uuid.UUID] = Ref()
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))


class Excepcion(Base):
    __tablename__ = "excepciones_agenda"
    id: Mapped[uuid.UUID] = Id()
    doctor_id: Mapped[uuid.UUID] = Ref(ForeignKey("doctores.doctor_id"))
    fecha_inicio: Mapped[date] = mapped_column(Date)
    fecha_fin: Mapped[date] = mapped_column(Date)
    motivo: Mapped[str] = mapped_column(String(150))


class Cita(Base):
    __tablename__ = "citas"
    id: Mapped[uuid.UUID] = Id()
    afiliado_id: Mapped[uuid.UUID] = Ref()
    paciente_nombre: Mapped[str] = mapped_column(String(160))
    paciente_documento: Mapped[str] = mapped_column(String(30))
    doctor_id: Mapped[uuid.UUID] = Ref(ForeignKey("doctores.doctor_id"))
    agendada_por_rol: Mapped[str] = mapped_column(ENUM("afiliado", "doctor", "admin", name="rol_usuario", create_type=False))
    agendada_por_id: Mapped[uuid.UUID] = Ref()
    tipo: Mapped[str] = mapped_column(ENUM("consulta_externa", "control", name="tipo_cita", create_type=False), server_default="consulta_externa")
    modalidad: Mapped[str] = mapped_column(ENUM("presencial", "domiciliaria", name="modalidad_cita", create_type=False), server_default="presencial")
    estado: Mapped[str] = mapped_column(ESTADO, server_default="pendiente")
    fecha: Mapped[date] = mapped_column(Date)
    hora_inicio: Mapped[time] = mapped_column(Time)
    hora_fin: Mapped[time] = mapped_column(Time)
    punto_atencion_id: Mapped[uuid.UUID | None] = Ref()
    motivo: Mapped[str] = mapped_column(Text)
    cita_anterior_id: Mapped[uuid.UUID | None] = Ref(ForeignKey("citas.id"))
    cancelada_por: Mapped[uuid.UUID | None] = Ref()
    motivo_cancelacion: Mapped[str | None] = mapped_column(Text)
    especialidad_codigo: Mapped[str | None] = mapped_column(String(40))
    especialidad: Mapped[str | None] = mapped_column(String(100))
    remision_id: Mapped[uuid.UUID | None] = Ref()
    cuota_moderadora: Mapped[Decimal] = mapped_column(Numeric(12, 2), server_default=text("0"))
    titular_usuario_id: Mapped[uuid.UUID | None] = Ref()
    contacto_email: Mapped[str | None] = mapped_column(String(150))
    contacto_nombre: Mapped[str | None] = mapped_column(String(80))
    recordatorio_enviado: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
