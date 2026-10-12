# El contexto de construcción es la raíz del repositorio (ver docker-compose.yml),
# porque esta imagen incluye el front compilado, igual que el Gateway de CarneOne.

# Etapa 1: compilar el front
FROM node:20-alpine AS front
WORKDIR /front
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# En producción el front llama a la API en la misma dirección: /api/v1
ENV VITE_USE_MOCK=false VITE_API_URL=/api/v1
RUN npm run build

# Etapa 2: Gateway
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 FRONT_DIR=/srv/front
WORKDIR /srv
COPY services/gateway/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/gateway/app ./app
COPY --from=front /front/dist ./front
RUN useradd --no-create-home --uid 10001 libitina
USER libitina
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=4)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
