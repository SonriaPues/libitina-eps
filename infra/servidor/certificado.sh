#!/bin/bash
# Obtiene el primer certificado HTTPS de Let's Encrypt. Se ejecuta UNA vez,
# antes del primer despliegue (Nginx todavía no está ocupando el puerto 80).
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a
: "${DOMINIO:?Configura DOMINIO en .env}" "${CORREO_CERTIFICADO:?Configura CORREO_CERTIFICADO en .env}"
C="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$C run --rm -p 80:80 --entrypoint certbot certbot certonly --standalone \
  -d "$DOMINIO" --email "$CORREO_CERTIFICADO" --agree-tos --no-eff-email -n
echo "Certificado listo para $DOMINIO. Se renovará solo."
