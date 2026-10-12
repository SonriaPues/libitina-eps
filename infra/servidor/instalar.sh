#!/bin/bash
# Prepara una máquina virtual Ubuntu 24.04 de Azure para Libitina EPS. Se ejecuta UNA vez:
#   curl -fsSL https://raw.githubusercontent.com/<usuario>/libitina-eps/main/infra/servidor/instalar.sh | bash -s -- <url-del-repositorio>
set -euo pipefail
REPO=${1:?Uso: instalar.sh <url del repositorio de GitHub>}
DIR=/opt/libitina-eps

echo "== 1/4 Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

echo "== 2/4 Memoria de intercambio (2 GB de respaldo por si la RAM se llena)"
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "== 3/4 Código"
sudo mkdir -p "$DIR" && sudo chown "$USER" "$DIR"
[ -d "$DIR/.git" ] || git clone "$REPO" "$DIR"

echo "== 4/4 Secretos (.env con claves aleatorias)"
cd "$DIR"
if [ ! -f .env ]; then
  cp .env.example .env
  for v in POSTGRES_SUPERCLAVE POSTGRES_SUPERCLAVE_CLINICA SVC_AUTH_PASSWORD SVC_AFILIADOS_PASSWORD SVC_PRESTADORES_PASSWORD \
           SVC_NOTIFICACIONES_PASSWORD SVC_TRAMITES_PASSWORD SVC_CITAS_PASSWORD SVC_HISTORIA_PASSWORD JWT_SECRET INTERNAL_TOKEN CLAVE_CIFRADO_HISTORIA; do
    sed -i "s|^$v=.*|$v=$(openssl rand -hex 32)|" .env
  done
  sed -i "s|^ADMIN_CLAVE=.*|ADMIN_CLAVE=Lib$(openssl rand -hex 6)9|" .env
  chmod 600 .env
fi
echo
echo "Listo. Ahora:"
echo "  1. Cierra la sesión SSH y vuelve a entrar (para usar docker sin sudo)."
echo "  2. Edita $DIR/.env: DOMINIO, FRONTEND_URL, CORREO_CERTIFICADO y el bloque de Gmail."
echo "  3. Ejecuta: cd $DIR && ./infra/servidor/certificado.sh && ./infra/servidor/desplegar.sh"
echo "La clave del administrador quedó en .env (ADMIN_CLAVE)."
