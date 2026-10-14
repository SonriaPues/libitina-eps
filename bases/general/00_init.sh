#!/bin/bash
# Servidor PostgreSQL GENERAL: 6 bases, un usuario por servicio.
# Lo ejecuta la imagen oficial de postgres una sola vez, al crear el volumen.
set -euo pipefail
ESQ=/esquemas

crear() { # base usuario clave script
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres <<SQL
CREATE USER $2 WITH PASSWORD '$3';
CREATE DATABASE $1 OWNER $2 ENCODING 'UTF8';
REVOKE CONNECT ON DATABASE $1 FROM PUBLIC;
GRANT CONNECT ON DATABASE $1 TO $2;
SQL
  if [ -n "${5:-}" ]; then psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1" -c "CREATE EXTENSION IF NOT EXISTS $5;"; fi
  psql -v ON_ERROR_STOP=1 -U "$2" -d "$1" -f "$ESQ/$4"
  echo ">> $1 lista"
}

crear libitina_auth           svc_auth           "$SVC_AUTH_PASSWORD"           01_auth.sql
crear libitina_afiliados      svc_afiliados      "$SVC_AFILIADOS_PASSWORD"      02_afiliados.sql
crear libitina_tramites       svc_tramites       "$SVC_TRAMITES_PASSWORD"       04_tramites.sql
crear libitina_citas          svc_citas          "$SVC_CITAS_PASSWORD"          05_citas.sql btree_gist
crear libitina_notificaciones svc_notificaciones "$SVC_NOTIFICACIONES_PASSWORD" 06_notificaciones.sql
crear libitina_prestadores    svc_prestadores    "$SVC_PRESTADORES_PASSWORD"    07_prestadores.sql
