#!/bin/bash
# Obtiene el primer certificado HTTPS de Let's Encrypt. Se ejecuta UNA vez,
# antes del primer despliegue (Nginx todavía no está ocupando el puerto 80).
set -euo pipefail
cd "$(dirname "$0")/../.."
# Lee solo las dos variables necesarias (el .env tiene valores con espacios y "<>", no se puede cargar con "source")
leer() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- || true; }
DOMINIO=$(leer DOMINIO); CORREO_CERTIFICADO=$(leer CORREO_CERTIFICADO)
[ -n "$DOMINIO" ] || { echo "Configura DOMINIO en .env"; exit 1; }
[ -n "$CORREO_CERTIFICADO" ] || { echo "Configura CORREO_CERTIFICADO en .env"; exit 1; }
C="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$C run --rm -p 80:80 --entrypoint certbot certbot certonly --standalone \
  -d "$DOMINIO" --email "$CORREO_CERTIFICADO" --agree-tos --no-eff-email -n
echo "Certificado listo para $DOMINIO. Se renovará solo."
