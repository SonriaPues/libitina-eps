"""Migraciones de la base de ESTE microservicio.

Al arrancar, el servicio aplica en orden los archivos de app/migraciones/*.sql que
aún no estén registrados en la tabla schema_migraciones. Cada archivo corre en su
propia transacción: si falla, no queda a medias y el servicio no arranca.

Así una base que ya tiene datos (por ejemplo, la de Azure) se actualiza sin
borrarla. Los scripts de bases/esquemas/ solo crean la versión inicial.
"""
import logging
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.engine import Engine

log = logging.getLogger("migraciones")
CARPETA = Path(__file__).parent / "migraciones"
CANDADO = 727274  # evita que dos copias del servicio migren a la vez


def aplicar(engine: Engine) -> None:
    archivos = sorted(CARPETA.glob("*.sql"))
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as candado:
        candado.execute(text("SELECT pg_advisory_lock(:k)"), {"k": CANDADO})
        try:
            with engine.begin() as c:
                c.execute(text("CREATE TABLE IF NOT EXISTS schema_migraciones ("
                               "version VARCHAR(120) PRIMARY KEY, aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now())"))
                hechas = set(c.execute(text("SELECT version FROM schema_migraciones")).scalars())
            for archivo in archivos:
                if archivo.name in hechas:
                    continue
                with engine.begin() as c:
                    # Cursor del driver sin parámetros: admite varias sentencias, $$ y el signo %
                    with c.connection.dbapi_connection.cursor() as cur:
                        cur.execute(archivo.read_text(encoding="utf-8"))
                    c.execute(text("INSERT INTO schema_migraciones (version) VALUES (:v)"), {"v": archivo.name})
                log.info("Migración aplicada: %s", archivo.name)
        finally:
            candado.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": CANDADO})
