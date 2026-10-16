#!/bin/bash
# Carga los datos de demostración en el servidor:   bash infra/demo/cargar.sh datos-demo.json
set -euo pipefail
cd "$(dirname "$0")/../.."
ARCHIVO="${1:?Indica el archivo JSON, ej.: bash infra/demo/cargar.sh datos-demo.json}"
leer() { grep -E "^$1=" .env | tail -1 | cut -d= -f2-; }
C="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
[ -f docker-compose.prod.yml ] && [ -n "$(leer DOMINIO)" ] || C="docker compose"
$C exec -T -e INTERNAL_TOKEN="$(leer INTERNAL_TOKEN)" -e ADMIN_CORREO="$(leer ADMIN_CORREO)" -e ADMIN_CLAVE="$(leer ADMIN_CLAVE)" \
  gateway python -c "$(cat infra/demo/sembrar.py)" < "$ARCHIVO"
