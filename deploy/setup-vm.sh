#!/usr/bin/env bash
# One-time setup on an Oracle Cloud Always Free VM (Ubuntu 22.04/24.04).
# Usage (on the VM as a sudo-capable user):
#   curl -fsSL ... | bash   OR   bash deploy/setup-vm.sh
set -euo pipefail

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=""
else
  SUDO="sudo"
fi

echo "==> Installing Docker Engine + Compose plugin"
$SUDO apt-get update -y
$SUDO apt-get install -y ca-certificates curl gnupg git

if ! command -v docker >/dev/null 2>&1; then
  $SUDO install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
  $SUDO apt-get update -y
  $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

if ! getent group docker >/dev/null; then
  $SUDO groupadd docker
fi
if [[ -n "${SUDO_USER:-}" ]]; then
  $SUDO usermod -aG docker "$SUDO_USER"
elif [[ "${EUID}" -ne 0 ]]; then
  $SUDO usermod -aG docker "$USER"
fi

echo "==> Opening host firewall for HTTP/HTTPS (Oracle also needs Security List rules)"
if command -v firewall-cmd >/dev/null 2>&1; then
  $SUDO firewall-cmd --permanent --add-service=http || true
  $SUDO firewall-cmd --permanent --add-service=https || true
  $SUDO firewall-cmd --reload || true
elif command -v ufw >/dev/null 2>&1; then
  $SUDO ufw allow OpenSSH || true
  $SUDO ufw allow 80/tcp || true
  $SUDO ufw allow 443/tcp || true
  $SUDO ufw --force enable || true
else
  # Default Oracle Ubuntu images often use iptables directly.
  $SUDO iptables -I INPUT -p tcp --dport 80 -j ACCEPT || true
  $SUDO iptables -I INPUT -p tcp --dport 443 -j ACCEPT || true
  if command -v netfilter-persistent >/dev/null 2>&1; then
    $SUDO netfilter-persistent save || true
  fi
fi

echo "==> Docker installed. Log out/in (or newgrp docker) so docker works without sudo."
echo "Next:"
echo "  1. Clone the repo into ~/project (or your path)"
echo "  2. cp .env.example .env && edit DOMAIN + secrets"
echo "  3. docker compose up -d --build"
echo "  4. In OCI Console → VCN → Security List: ingress TCP 80 and 443"
echo "  5. Point DOMAIN DNS A record to this VM public IP"
echo "  6. Google Cloud Console OAuth redirect: https://\$DOMAIN/api/auth/callback/google"
