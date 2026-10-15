import os

DATABASE_URL = os.environ["DATABASE_URL"]
JWT_SECRET = os.getenv("JWT_SECRET", "")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
AFILIADOS_URL = os.getenv("AFILIADOS_URL", "http://afiliados:8000")
CITAS_URL = os.getenv("CITAS_URL", "http://citas:8000")
PRESTADORES_URL = os.getenv("PRESTADORES_URL", "http://prestadores:8000")

DIAS_VIGENCIA_REMISION = 90
DIAS_VIGENCIA_CERTIFICADO = 30
DIAS_HABILES_PQRSD = 15          # Ley 1755 de 2015
DIAS_HABILES_DENUNCIA = 30
