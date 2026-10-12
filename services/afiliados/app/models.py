import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, Date, DateTime, Numeric, SmallInteger, Text, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

E = lambda nombre, *v: ENUM(*v, name=nombre, create_type=False)  # noqa: E731
TIPO_DOC = E("tipo_documento", "CC", "TI", "RC", "CE", "PPT", "PA")
ESTADO = E("estado_afiliado", "pendiente", "rechazado", "activo", "inactivo", "suspendido", "retirado", "fallecido")
Id = lambda: mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))  # noqa: E731
Ref = lambda *a, **k: mapped_column(UUID(as_uuid=True), *a, **k)  # noqa: E731


class Regimen(Base):
    __tablename__ = "regimenes"
    id: Mapped[uuid.UUID] = Id()
    codigo: Mapped[str] = mapped_column(String(20))
    nombre: Mapped[str] = mapped_column(String(60))
    descripcion: Mapped[str | None] = mapped_column(Text)


class Afiliado(Base):
    __tablename__ = "afiliados"
    id: Mapped[uuid.UUID] = Id()
    usuario_id: Mapped[uuid.UUID | None] = Ref()
    tipo_documento: Mapped[str] = mapped_column(TIPO_DOC)
    numero_documento: Mapped[str] = mapped_column(String(20))
    nombres: Mapped[str] = mapped_column(String(80))
    apellidos: Mapped[str] = mapped_column(String(80))
    fecha_nacimiento: Mapped[date] = mapped_column(Date)
    sexo: Mapped[str] = mapped_column(E("sexo", "masculino", "femenino", "otro"))
    telefono: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(150))
    direccion: Mapped[str | None] = mapped_column(Text)
    ciudad: Mapped[str] = mapped_column(String(80))
    departamento: Mapped[str] = mapped_column(String(80))
    zona: Mapped[str] = mapped_column(E("zona_residencia", "urbana", "rural"), server_default="urbana")
    pertenencia_etnica: Mapped[str] = mapped_column(E("pertenencia_etnica", "ninguna", "indigena", "rom", "raizal", "palenquero", "negro_afrocolombiano", "no_responde"), server_default="no_responde")
    tiene_discapacidad: Mapped[bool | None] = mapped_column(Boolean)
    tipo_discapacidad: Mapped[str | None] = mapped_column(E("tipo_discapacidad", "fisica", "visual", "auditiva", "intelectual", "psicosocial", "sordoceguera", "multiple"))
    incapacidad_permanente: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    regimen_id: Mapped[uuid.UUID] = Ref(ForeignKey("regimenes.id"))
    ips_id: Mapped[uuid.UUID | None] = Ref()
    tipo_afiliado: Mapped[str] = mapped_column(E("tipo_afiliado", "cotizante", "beneficiario"), server_default="cotizante")
    cotizante_id: Mapped[uuid.UUID | None] = Ref(ForeignKey("afiliados.id"))
    parentesco: Mapped[str | None] = mapped_column(E("parentesco", "conyuge", "companero_permanente", "hijo", "padre", "madre", "otro"))
    tipo_cotizante: Mapped[str | None] = mapped_column(E("tipo_cotizante", "dependiente", "independiente", "pensionado"))
    categoria: Mapped[str | None] = mapped_column(E("categoria_ibc", "A", "B", "C"))
    ibc: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    grupo_sisben: Mapped[str | None] = mapped_column(String(4))
    empleador_nit: Mapped[str | None] = mapped_column(String(20))
    empleador_nombre: Mapped[str | None] = mapped_column(String(150))
    estado: Mapped[str] = mapped_column(ESTADO, server_default="pendiente")
    motivo_rechazo: Mapped[str | None] = mapped_column(Text)
    fecha_afiliacion: Mapped[date | None] = mapped_column(Date)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    eliminado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Novedad(Base):
    __tablename__ = "novedades_afiliado"
    id: Mapped[uuid.UUID] = Id()
    afiliado_id: Mapped[uuid.UUID] = Ref(ForeignKey("afiliados.id"))
    estado_anterior: Mapped[str | None] = mapped_column(ESTADO)
    estado_nuevo: Mapped[str] = mapped_column(ESTADO)
    motivo: Mapped[str] = mapped_column(Text)
    registrado_por: Mapped[uuid.UUID | None] = Ref()
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))


class Consentimiento(Base):
    __tablename__ = "consentimientos"
    id: Mapped[uuid.UUID] = Id()
    afiliado_id: Mapped[uuid.UUID] = Ref(ForeignKey("afiliados.id"))
    version_politica: Mapped[str] = mapped_column(String(10))
    autoriza_datos_salud: Mapped[bool] = mapped_column(Boolean)
    autoriza_contacto_comercial: Mapped[bool] = mapped_column(Boolean)
    declara_veracidad: Mapped[bool] = mapped_column(Boolean)
    canal_notificacion: Mapped[str] = mapped_column(String(20))
    ip_origen: Mapped[str | None] = mapped_column(String(45))
    vigente: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))


class Tarifa(Base):
    __tablename__ = "tarifas"
    id: Mapped[uuid.UUID] = Id()
    anio: Mapped[int] = mapped_column(SmallInteger)
    regimen: Mapped[str] = mapped_column(String(20))
    categoria: Mapped[str | None] = mapped_column(E("categoria_ibc", "A", "B", "C"))
    cuota_moderadora: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    porcentaje_copago: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    tope_evento: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    tope_anual: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))


class Medicamento(Base):
    __tablename__ = "medicamentos"
    id: Mapped[uuid.UUID] = Id()
    nombre_generico: Mapped[str] = mapped_column(String(150))
    concentracion: Mapped[str | None] = mapped_column(String(60))
    forma_farmaceutica: Mapped[str | None] = mapped_column(String(60))
    grupo: Mapped[str | None] = mapped_column(String(60))
    cubierto_pbs: Mapped[bool] = mapped_column(Boolean)
    requiere_autorizacion: Mapped[bool] = mapped_column(Boolean)
    activo: Mapped[bool] = mapped_column(Boolean)


class ServicioPbs(Base):
    __tablename__ = "servicios_pbs"
    id: Mapped[uuid.UUID] = Id()
    categoria: Mapped[str] = mapped_column(String(60))
    nombre: Mapped[str] = mapped_column(String(150))
    descripcion: Mapped[str | None] = mapped_column(Text)
    requiere_autorizacion: Mapped[bool] = mapped_column(Boolean)
    activo: Mapped[bool] = mapped_column(Boolean)
