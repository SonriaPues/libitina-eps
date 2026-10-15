import os

DATABASE_URL = os.environ["DATABASE_URL"]
JWT_SECRET = os.getenv("JWT_SECRET", "")
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
AUTH_URL = os.getenv("AUTH_URL", "http://auth:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
