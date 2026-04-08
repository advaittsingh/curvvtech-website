#!/usr/bin/env bash
# Nginx reverse proxy + optional Certbot for EC2 (Ubuntu, Debian, Amazon Linux 2 / 2023).
# Invoked by scripts/deploy-ec2.sh when DEPLOY_NGINX=1, or run manually:
#   sudo bash deploy/setup-nginx-ubuntu.sh
#
# Environment (optional):
#   NGINX_DOMAIN=api.curvvtech.in
#   NGINX_PROXY_TARGET=http://127.0.0.1:3000
#   CERTBOT_EMAIL=you@domain.com   # non-interactive Let's Encrypt (needs DNS + port 80)
#   CONFIGURE_UFW=1                  # Ubuntu: UFW rules if ufw is installed
#
# AWS: security group must allow TCP 80 and 443 (deploy-ec2.sh adds them when DEPLOY_NGINX=1).

set -euo pipefail

require_sudo() {
  if [[ "${EUID:-}" -ne 0 ]]; then
    echo "Run with sudo: sudo bash $0" >&2
    exit 1
  fi
}

require_sudo

NGINX_DOMAIN="${NGINX_DOMAIN:-api.curvvtech.in}"
NGINX_PROXY_TARGET="${NGINX_PROXY_TARGET:-http://127.0.0.1:3000}"
MAP_CONF="/etc/nginx/conf.d/00-map-connection-upgrade.conf"
SERVER_CONF="/etc/nginx/conf.d/10-followup-api.conf"

if [[ -f /etc/os-release ]]; then
  # shellcheck source=/dev/null
  . /etc/os-release
else
  echo "Cannot detect OS (missing /etc/os-release)" >&2
  exit 1
fi

install_packages() {
  case "${ID:-}" in
    ubuntu | debian)
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -qq
      apt-get install -y -qq nginx certbot python3-certbot-nginx
      ;;
    amzn)
      if command -v dnf &>/dev/null; then
        dnf install -y nginx
        dnf install -y certbot python3-certbot-nginx 2>/dev/null || {
          echo "Note: certbot not installed from repos (optional). Install for HTTPS: dnf install -y certbot python3-certbot-nginx" >&2
        }
      else
        yum install -y nginx
        yum install -y certbot python3-certbot-nginx 2>/dev/null || true
      fi
      ;;
    *)
      echo "Unsupported OS ID=$ID (need ubuntu, debian, or amzn). Install nginx + certbot manually." >&2
      exit 1
      ;;
  esac
}

disable_default_vhost() {
  case "${ID:-}" in
    ubuntu | debian)
      rm -f /etc/nginx/sites-enabled/default
      ;;
    amzn)
      if [[ -f /etc/nginx/conf.d/default.conf ]]; then
        mv -f /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak.$(date +%s) 2>/dev/null || \
          mv -f /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
      fi
      ;;
  esac
}

install_packages
install -d -m 755 /etc/nginx/conf.d

cat >"$MAP_CONF" <<'MAPEOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
MAPEOF
chmod 644 "$MAP_CONF"

cat >"$SERVER_CONF" <<SITEEOF
server {
    listen 80;
    server_name ${NGINX_DOMAIN};

    client_max_body_size 20m;

    location / {
        proxy_pass ${NGINX_PROXY_TARGET};
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;

        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
SITEEOF
chmod 644 "$SERVER_CONF"

disable_default_vhost

# Remove legacy Ubuntu-only paths from older runs of this script
rm -f "/etc/nginx/sites-enabled/${NGINX_DOMAIN}" 2>/dev/null || true

nginx -t
systemctl enable nginx 2>/dev/null || true
systemctl start nginx 2>/dev/null || true
systemctl reload nginx

echo "Nginx configured: http://${NGINX_DOMAIN}/ → ${NGINX_PROXY_TARGET}"

# Deploy overwrites conf.d with HTTP-only; re-attach existing Let's Encrypt cert so HTTPS survives redeploys.
reapply_https_if_cert_exists() {
  command -v certbot >/dev/null 2>&1 || return 0
  certbot certificates 2>/dev/null | grep -qF "Certificate Name: ${NGINX_DOMAIN}" || return 0
  local le_email="${CERTBOT_EMAIL:-dev@local.followup}"
  echo "Re-applying TLS for ${NGINX_DOMAIN} (existing certificate → nginx ssl server block)."
  if certbot --nginx -d "${NGINX_DOMAIN}" --non-interactive --agree-tos -m "${le_email}" --redirect; then
    nginx -t && systemctl reload nginx
    echo "HTTPS: https://${NGINX_DOMAIN}/"
  else
    echo "Certbot could not re-apply TLS; check /var/log/letsencrypt/letsencrypt.log" >&2
  fi
}
reapply_https_if_cert_exists

if [[ "${CONFIGURE_UFW:-}" == "1" ]]; then
  if command -v ufw >/dev/null 2>&1; then
    ufw allow OpenSSH 2>/dev/null || true
    ufw allow 'Nginx Full' 2>/dev/null || true
    echo "UFW rules added (OpenSSH, Nginx Full). Run 'sudo ufw status' and enable if needed."
  fi
fi

if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
  if ! command -v certbot >/dev/null 2>&1; then
    echo "CERTBOT_EMAIL is set but certbot is not installed; skipping TLS issuance." >&2
  elif certbot certificates 2>/dev/null | grep -qF "Certificate Name: ${NGINX_DOMAIN}"; then
    echo "Certificate already present for ${NGINX_DOMAIN} (re-applied above if nginx was reset)."
  else
    if certbot --nginx -d "${NGINX_DOMAIN}" --non-interactive --agree-tos -m "${CERTBOT_EMAIL}" --redirect; then
      nginx -t
      systemctl reload nginx
      echo "HTTPS enabled for https://${NGINX_DOMAIN}/"
    else
      echo "Certbot failed (DNS, firewall, or rate limit). Nginx HTTP proxy is still active." >&2
    fi
  fi
  certbot renew --dry-run || true
  echo "Certbot auto-renew: systemctl list-timers | grep -i certbot || true"
else
  echo ""
  echo "Next: point DNS A record ${NGINX_DOMAIN} to this host, then obtain TLS:"
  echo "  sudo certbot --nginx -d ${NGINX_DOMAIN}"
  echo "Or deploy with CERTBOT_EMAIL=you@example.com for non-interactive issuance."
fi

echo ""
echo "Security: ensure EC2 security group allows TCP 80 and 443. You may remove public access to port 3000 if only Nginx reaches the app."
