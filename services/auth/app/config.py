import os

DATABASE_URL = os.environ["DATABASE_URL"]
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_MINUTOS = int(os.getenv("JWT_MINUTOS", "30"))
REFRESH_DIAS = int(os.getenv("REFRESH_DIAS", "7"))
INTERNAL_TOKEN = os.environ["INTERNAL_TOKEN"]
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
ADMIN_CORREO = os.getenv("ADMIN_CORREO", "admin@libitina.co")
ADMIN_CLAVE = os.getenv("ADMIN_CLAVE", "Admin123")
ADMIN_DOCUMENTO = os.getenv("ADMIN_DOCUMENTO", "1000000000")
MAX_INTENTOS = 5
MINUTOS_BLOQUEO = 15
