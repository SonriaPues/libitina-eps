#!/bin/bash
# Servidor PostgreSQL CLÍNICO: solo la historia clínica, aislada del resto.
set -euo pipefail
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres <<SQL
CREATE USER svc_historia WITH PASSWORD '$SVC_HISTORIA_PASSWORD';
CREATE DATABASE libitina_historia OWNER svc_historia ENCODING 'UTF8';
REVOKE CONNECT ON DATABASE libitina_historia FROM PUBLIC;
GRANT CONNECT ON DATABASE libitina_historia TO svc_historia;
SQL
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d libitina_historia -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql -v ON_ERROR_STOP=1 -U svc_historia -d libitina_historia -f /esquemas/03_historia_clinica.sql
echo ">> libitina_historia lista"
