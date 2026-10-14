#!/bin/bash
# Actualiza el código y reconstruye solo lo que cambió. Lo usa GitHub Actions
# en cada push a main, y también se puede correr a mano en el servidor.
set -euo pipefail
cd "$(dirname "$0")/../.."
C="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
git pull --ff-only origin main
$C up -d --build --remove-orphans
docker image prune -f >/dev/null

# Espera a que el Gateway reporte todos los servicios en "ok"
for _ in $(seq 1 30); do
  if $C exec -T gateway python -c "import json,urllib.request as u; d=json.load(u.urlopen('http://127.0.0.1:8000/api/v1/health',timeout=4)); exit(0 if all(v=='ok' for v in d['servicios'].values()) else 1)" 2>/dev/null; then
    echo "Despliegue correcto: todos los servicios responden."; exit 0
  fi
  sleep 5
done
echo "Algún servicio no respondió a tiempo. Revisa: $C ps   y   $C logs --tail 50"
exit 1
