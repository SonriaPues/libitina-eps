import os

DATABASE_URL = os.environ["DATABASE_URL"]
JWT_SECRET = os.getenv("JWT_SECRET", "")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
AFILIADOS_URL = os.getenv("AFILIADOS_URL", "http://afiliados:8000")
