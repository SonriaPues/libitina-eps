from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Las tablas las crea bases/esquemas/02_afiliados.sql; aquí solo se mapean."""


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
