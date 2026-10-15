import uuid
from datetime import date, datetime
from sqlalchemy import String, Boolean, Text, SmallInteger, Date, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

Id = lambda: mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))  # noqa: E731
Ref = lambda *a, **k: mapped_column(UUID(as_uuid=True), *a, **k)  # noqa: E731


class Tramite(Base):
    """Tabla madre: todo trámite tiene radicado (lo genera un trigger) e historial de estados."""
    __tablename__ = "tramites"
    __mapper_args__ = {"eager_defaults": True}
    id: Mapped[uuid.UUID] = Id()
    radicado: Mapped[str | None] = mapped_column(String(30), server_default=text("NULL"))
    tipo: Mapped[str] = mapped_column(ENUM("afiliacion", "certificado", "portabilidad", "actualizacion_datos", "pqrsd",
                                           "autorizacion_medica", "solicitud_recurso", name="tipo_tramite", create_type=False))
    estado: Mapped[str] = mapped_column(ENUM("pendiente", "en_proceso", "aprobado", "rechazado", "cancelado", "cerrado",
                                             name="estado_tramite", create_type=False), server_default="pendiente")
    solicitante_id: Mapped[uuid.UUID | None] = Ref()
    solicitante_rol: Mapped[str] = mapped_column(ENUM("afiliado", "doctor", "admin", "anonimo", name="rol_usuario", create_type=False))
    afiliado_id: Mapped[uuid.UUID | None] = Ref()
    asignado_a: Mapped[uuid.UUID | None] = Ref()
    datos: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'"))
    observaciones: Mapped[str | None] = mapped_column(Text)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))


class Pqrsd(Base):
    __tablename__ = "pqrsd"
    id: Mapped[uuid.UUID] = Id()
    tramite_id: Mapped[uuid.UUID] = Ref(ForeignKey("tramites.id"))
    tipo: Mapped[str] = mapped_column(ENUM("peticion", "queja", "reclamo", "sugerencia", "denuncia", name="tipo_pqrsd", create_type=False))
    canal: Mapped[str] = mapped_column(ENUM("web", "telefono", "presencial", "correo", name="canal_pqrsd", create_type=False), server_default="web")
    anonima: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    nombre_contacto: Mapped[str | None] = mapped_column(String(150))
    documento_contacto: Mapped[str | None] = mapped_column(String(20))
    email_contacto: Mapped[str | None] = mapped_column(String(150))
    telefono_contacto: Mapped[str | None] = mapped_column(String(20))
    asunto: Mapped[str] = mapped_column(String(200))
    descripcion: Mapped[str] = mapped_column(Text)
    fecha_limite: Mapped[date] = mapped_column(Date)
    respuesta: Mapped[str | None] = mapped_column(Text)
    respondida_por: Mapped[uuid.UUID | None] = Ref()
    respondida_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Autorizacion(Base):
    """Remisiones a especialistas = autorizaciones de tipo consulta_especializada."""
    __tablename__ = "autorizaciones_medicas"
    id: Mapped[uuid.UUID] = Id()
    tramite_id: Mapped[uuid.UUID] = Ref(ForeignKey("tramites.id"))
    afiliado_id: Mapped[uuid.UUID] = Ref()
    doctor_id: Mapped[uuid.UUID] = Ref()
    tipo: Mapped[str] = mapped_column(ENUM("procedimiento", "medicamento", "examen", "hospitalizacion", "terapia",
                                           "consulta_especializada", name="tipo_autorizacion", create_type=False))
    descripcion_servicio: Mapped[str] = mapped_column(String(200))
    cantidad: Mapped[int] = mapped_column(SmallInteger, server_default=text("1"))
    descripcion_clinica: Mapped[str] = mapped_column(Text)
    diagnostico_cie10: Mapped[str] = mapped_column(String(10))
    diagnostico_desc: Mapped[str] = mapped_column(String(200))
    urgente: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    fecha_vencimiento: Mapped[date | None] = mapped_column(Date)
    especialidad_codigo: Mapped[str | None] = mapped_column(String(40))
    cita_origen_id: Mapped[uuid.UUID | None] = Ref()
    cita_uso_id: Mapped[uuid.UUID | None] = Ref()


class Certificado(Base):
    __tablename__ = "certificados"
    id: Mapped[uuid.UUID] = Id()
    tramite_id: Mapped[uuid.UUID] = Ref(ForeignKey("tramites.id"))
    afiliado_id: Mapped[uuid.UUID] = Ref()
    tipo: Mapped[str] = mapped_column(String(40), server_default="afiliacion")
    codigo_verificacion: Mapped[str] = mapped_column(String(20))
    archivo_url: Mapped[str] = mapped_column(Text)
    generado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    vigente_hasta: Mapped[date] = mapped_column(Date)
