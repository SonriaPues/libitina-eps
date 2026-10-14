#!/bin/sh
# Restaura una base desde un respaldo. Se ejecuta en el servidor:
#   ./infra/respaldos/restaurar.sh 2026-10-12 libitina_afiliados
# Reemplaza los datos actuales de ESA base por los del respaldo.
set -eu
[ $# -eq 2 ] || { echo "Uso: $0 <fecha AAAA-MM-DD> <base>"; exit 1; }
FECHA=$1; BASE=$2
HOST=db-general; CLAVE_VAR=CLAVE_GENERAL
[ "$BASE" = "libitina_historia" ] && { HOST=db-clinica; CLAVE_VAR=CLAVE_CLINICA; }
printf "Se reemplazarán los datos de %s con el respaldo del %s. Escribe SI para continuar: " "$BASE" "$FECHA"
read r; [ "$r" = "SI" ] || { echo "Cancelado."; exit 0; }
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T respaldos sh -c \
  "PGPASSWORD=\$$CLAVE_VAR pg_restore -h $HOST --clean --if-exists --no-owner --role=svc_${BASE#libitina_} -d $BASE /respaldos/diarios/$FECHA/$BASE.dump"
echo "Restauración terminada. Reinicia los servicios: docker compose -f docker-compose.yml -f docker-compose.prod.yml restart"
