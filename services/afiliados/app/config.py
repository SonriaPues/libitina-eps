import os

DATABASE_URL = os.environ["DATABASE_URL"]
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
JWT_SECRET = os.environ["JWT_SECRET"]
INTERNAL_TOKEN = os.environ["INTERNAL_TOKEN"]
AUTH_URL = os.getenv("AUTH_URL", "http://auth:8000")
PRESTADORES_URL = os.getenv("PRESTADORES_URL", "http://prestadores:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
VERSION_POLITICA = os.getenv("VERSION_POLITICA", "2026.1")
