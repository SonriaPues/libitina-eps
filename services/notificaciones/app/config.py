import os

DATABASE_URL = os.environ["DATABASE_URL"]
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
JWT_SECRET = os.getenv("JWT_SECRET", "")
SMTP_HOST = os.getenv("SMTP_HOST", "mailpit")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
SMTP_USUARIO = os.getenv("SMTP_USUARIO", "")
SMTP_CLAVE = os.getenv("SMTP_CLAVE", "")
SMTP_TLS = os.getenv("SMTP_TLS", "false").lower() == "true"
CORREO_REMITENTE = os.getenv("CORREO_REMITENTE", "Libitina EPS <no-responder@libitina.co>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
# Correos de estos dominios se registran (campanita) pero no se envían: cuentas de demostración.
DOMINIOS_SIN_ENVIO = {d.strip().lower() for d in os.getenv("DOMINIOS_SIN_ENVIO", "demo.libitina.co").split(",") if d.strip()}
