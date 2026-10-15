import os

DATABASE_URL = os.environ["DATABASE_URL"]
JWT_SECRET = os.getenv("JWT_SECRET", "")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
AFILIADOS_URL = os.getenv("AFILIADOS_URL", "http://afiliados:8000")
PRESTADORES_URL = os.getenv("PRESTADORES_URL", "http://prestadores:8000")
TRAMITES_URL = os.getenv("TRAMITES_URL", "http://tramites:8000")

DIAS_ANTICIPACION = 30          # se agenda hasta 30 días adelante
MINUTOS_MINIMOS_PARA_AGENDAR = 30
HORAS_MINIMAS_PARA_CANCELAR = 2
