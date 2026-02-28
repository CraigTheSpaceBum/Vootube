#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/setup.sh — NostrFlux VPS Setup
#
# Ubuntu 22.04 / 24.04 LTS
# Run as root: bash setup.sh nostrflux.yourdomain.com admin@yourdomain.com
#
# What this installs:
#   Node.js 20, nginx (plain — no rtmp module needed), certbot
#   Creates system user, installs app, generates keys, starts service.
#
# NostrFlux does NOT install any streaming server.
# Users bring their own: Owncast, nginx-rtmp, Cloudflare Stream, etc.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${1:-nostrflux.yourdomain.com}"
EMAIL="${2:-admin@yourdomain.com}"
INSTALL_DIR="/opt/nostrflux"
WEB_DIR="/var/www/nostrflux"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
info()  { echo -e "${G}[✓]${N} $*"; }
warn()  { echo -e "${Y}[!]${N} $*"; }
error() { echo -e "${R}[✗]${N} $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || error "Run as root: sudo bash setup.sh $DOMAIN $EMAIL"

info "NostrFlux Setup — $DOMAIN"
info "Client-only mode: no video hosting, no RTMP"

# 1. System packages
info "Updating packages..."
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y nginx certbot python3-certbot-nginx curl

# 2. Node.js 20
if ! node --version 2>/dev/null | grep -q 'v2[0-9]'; then
  info "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
info "Node: $(node --version)"

# 3. System user
id -u nostrflux &>/dev/null || useradd --system --home "$INSTALL_DIR" --shell /bin/false nostrflux

# 4. Directories
info "Creating directories..."
mkdir -p "$INSTALL_DIR" "$WEB_DIR" "$INSTALL_DIR/logs"
chown -R nostrflux:nostrflux "$INSTALL_DIR"
chown -R www-data:www-data "$WEB_DIR"

# 5. Copy app files
info "Installing NostrFlux..."
cp -r "$PROJECT_DIR"/. "$INSTALL_DIR/"
chown -R nostrflux:nostrflux "$INSTALL_DIR"
cd "$INSTALL_DIR"
sudo -u nostrflux npm install --omit=dev

# 6. .env setup
if [[ ! -f "$INSTALL_DIR/.env" ]]; then
  cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
  sed -i "s/nostrflux.yourdomain.com/$DOMAIN/g" "$INSTALL_DIR/.env"
  sed -i "s/yourdomain.com/$DOMAIN/g"           "$INSTALL_DIR/.env"
fi

# 7. Generate Nostr keys if needed
if grep -q 'your_hex_private_key_here' "$INSTALL_DIR/.env"; then
  info "Generating Nostr keypair..."
  KEY_OUTPUT=$(sudo -u nostrflux node "$INSTALL_DIR/scripts/generate-keys.js" 2>&1)
  PRIV=$(echo "$KEY_OUTPUT" | grep 'NOSTR_PRIVATE_KEY=' | cut -d= -f2)
  PUB=$(echo "$KEY_OUTPUT" | grep 'NOSTR_PUBLIC_KEY='  | cut -d= -f2)
  sed -i "s/your_hex_private_key_here/$PRIV/" "$INSTALL_DIR/.env"
  sed -i "s/your_hex_public_key_here/$PUB/"   "$INSTALL_DIR/.env"
  warn "Nostr keys generated. Back up .env securely!"
fi

# 8. nginx
info "Configuring nginx..."
cp "$PROJECT_DIR/config/nginx.conf" /etc/nginx/nginx.conf
sed -i "s/nostrflux.yourdomain.com/$DOMAIN/g" /etc/nginx/nginx.conf
nginx -t || error "nginx config invalid"

# 9. SSL
info "Requesting SSL certificate for $DOMAIN..."
systemctl start nginx 2>/dev/null || true
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" || {
  warn "certbot failed — ensure DNS for $DOMAIN points to this server's IP."
  warn "Re-run after DNS propagates: certbot --nginx -d $DOMAIN"
}

# 10. Firewall
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp 80/tcp 443/tcp
  ufw --force enable
  info "Firewall: ports 22, 80, 443 open"
  info "Note: port 1935 (RTMP) NOT opened — NostrFlux doesn't ingest streams"
fi

# 11. systemd
info "Installing systemd service..."
cp "$PROJECT_DIR/systemd/nostrflux.service" /etc/systemd/system/
sed -i "s|/opt/nostrflux|$INSTALL_DIR|g" /etc/systemd/system/nostrflux.service
systemctl daemon-reload
systemctl enable --now nostrflux
systemctl reload nginx

echo ""
info "══════════════════════════════════════════════"
info " NostrFlux is running!"
info "══════════════════════════════════════════════"
echo ""
echo "  Frontend:   https://$DOMAIN"
echo "  API:        https://$DOMAIN/api"
echo "  Health:     https://$DOMAIN/health"
echo "  NIP-05:     https://$DOMAIN/.well-known/nostr.json"
echo ""
warn "Next steps:"
warn "  1. Edit $INSTALL_DIR/.env"
warn "     → Set LIGHTNING_ADDRESS to your wallet (e.g. you@getalby.com)"
warn "     → Set NIP05_NAMES to map usernames to pubkeys"
warn "     → Set CORS_ORIGINS to your frontend URL"
warn "  2. Restart: systemctl restart nostrflux"
warn "  3. Monitor: journalctl -u nostrflux -f"
echo ""
info "Users stream from their OWN servers (Owncast, Cloudflare, etc.)"
info "and submit those URLs when going live. NostrFlux handles only Nostr."
echo ""
