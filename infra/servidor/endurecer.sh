#!/bin/bash
# Endurece la máquina virtual (recomendación R2 del informe de seguridad). Se puede ejecutar más de una vez.
#   bash infra/servidor/endurecer.sh
# 1. Firewall: solo entran SSH (22), HTTP (80) y HTTPS (443).
# 2. SSH: solo con llave, sin contraseña y sin entrar como root.
# 3. fail2ban: bloquea por 1 hora una IP que falle 5 veces el acceso SSH en 10 minutos.
# 4. Actualizaciones de seguridad automáticas (no cambia la versión de Ubuntu ni reinicia la máquina).
set -euo pipefail

echo "== 1/4 Firewall (ufw)"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ufw fail2ban unattended-upgrades >/dev/null
sudo ufw default deny incoming >/dev/null
sudo ufw default allow outgoing >/dev/null
sudo ufw allow 22/tcp comment 'SSH' >/dev/null      # primero SSH, para no quedar por fuera
sudo ufw allow 80/tcp comment 'HTTP' >/dev/null
sudo ufw allow 443/tcp comment 'HTTPS' >/dev/null
sudo ufw --force enable >/dev/null
sudo ufw status | sed -n '1,12p'

echo "== 2/4 SSH solo con llave"
if ! grep -qs . ~/.ssh/authorized_keys; then
  echo "No hay llaves en ~/.ssh/authorized_keys: NO se desactiva el acceso con contraseña para no dejarte por fuera." >&2
else
  sudo tee /etc/ssh/sshd_config.d/99-libitina.conf >/dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
MaxAuthTries 4
LoginGraceTime 30
X11Forwarding no
EOF
  sudo sshd -t                                        # valida la configuración antes de aplicarla
  sudo systemctl reload ssh 2>/dev/null || sudo systemctl reload sshd
  echo "SSH: solo llave, sin root."
fi

echo "== 3/4 fail2ban"
sudo tee /etc/fail2ban/jail.d/libitina.local >/dev/null <<'EOF'
[sshd]
enabled  = true
backend  = systemd
maxretry = 5
findtime = 10m
bantime  = 1h
EOF
sudo systemctl enable --now fail2ban >/dev/null
sudo systemctl restart fail2ban
sleep 2
sudo fail2ban-client status sshd | sed -n '1,4p'

echo "== 4/4 Actualizaciones de seguridad automáticas"
sudo tee /etc/apt/apt.conf.d/20auto-upgrades >/dev/null <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
sudo tee /etc/apt/apt.conf.d/52libitina-upgrades >/dev/null <<'EOF'
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF
sudo systemctl enable --now unattended-upgrades >/dev/null
echo "Listo. Puertos abiertos: 22, 80 y 443. Revisa con: sudo ufw status · sudo fail2ban-client status sshd"
