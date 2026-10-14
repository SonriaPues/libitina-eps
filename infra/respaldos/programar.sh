#!/bin/sh
# Hace un respaldo al día: a partir de HORA_RESPALDO (UTC), o apenas la máquina
# se encienda si ese día todavía no se ha hecho (por si estuvo apagada a esa hora).
echo "Respaldo diario desde las ${HORA_RESPALDO}:00 UTC"
while :; do
  HOY=$(date -u +%F)
  if [ "$(date -u +%H | sed 's/^0//')" -ge "$(echo "$HORA_RESPALDO" | sed 's/^0//')" ] && [ "$(cat /respaldos/.ultimo 2>/dev/null)" != "$HOY" ]; then
    sh /scripts/respaldar.sh && echo "$HOY" > /respaldos/.ultimo
  fi
  sleep 600
done
