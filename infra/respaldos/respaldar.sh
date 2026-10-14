#!/bin/sh
# Respaldo de las 7 bases con pg_dump (formato comprimido de PostgreSQL).
# Retención: 7 copias diarias + 4 semanales (domingos), como en CarneOne.
set -eu
DIA=$(date -u +%F)
DESTINO=/respaldos/diarios/$DIA
mkdir -p "$DESTINO" /respaldos/semanales

volcar() { # host clave base
  PGPASSWORD="$2" pg_dump -h "$1" -Fc -f "$DESTINO/$3.dump" "$3"
  echo "  $3: $(du -h "$DESTINO/$3.dump" | cut -f1)"
}

echo "Respaldo $DIA"
for b in libitina_auth libitina_afiliados libitina_prestadores libitina_notificaciones libitina_tramites libitina_citas; do
  volcar db-general "$CLAVE_GENERAL" "$b"
done
volcar db-clinica "$CLAVE_CLINICA" libitina_historia

# Los domingos se guarda una copia semanal
if [ "$(date -u +%u)" = "7" ]; then cp -r "$DESTINO" "/respaldos/semanales/$DIA"; fi

# Retención
ls -1d /respaldos/diarios/*/   2>/dev/null | sort -r | tail -n +8 | xargs -r rm -rf
ls -1d /respaldos/semanales/*/ 2>/dev/null | sort -r | tail -n +5 | xargs -r rm -rf
echo "Respaldo terminado"
