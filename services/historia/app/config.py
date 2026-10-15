import os

DATABASE_URL = os.environ["DATABASE_URL"]
JWT_SECRET = os.getenv("JWT_SECRET", "")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
CITAS_URL = os.getenv("CITAS_URL", "http://citas:8000")
AFILIADOS_URL = os.getenv("AFILIADOS_URL", "http://afiliados:8000")
# Clave de cifrado de los textos clínicos (pgcrypto). Vive solo aquí, nunca en la base.
CLAVE_CIFRADO = os.environ["CLAVE_CIFRADO_HISTORIA"]
