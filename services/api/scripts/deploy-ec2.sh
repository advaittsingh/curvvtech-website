#!/usr/bin/env bash
# Deploy Curvvtech API to EC2: AWS CLI (describe instance / SG) + rsync + SSH + Docker Compose.
#
# Prerequisites:
#   - AWS CLI credentials for the SAME account as the instance (aws sts get-caller-identity).
#   - EC2 key pair .pem; chmod 400.
#   - services/api/.env.aws (gitignored): copy from .env.aws.example — DATABASE_URL (RDS/Neon), JWT_*, OPENAI_API_KEY, LANDING_API_KEY, etc.
#
# Usage (from repo root or services/api):
#   export AWS_REGION=ap-south-1
#   export EC2_INSTANCE_ID=i-xxxxxxxx
#   export EC2_SSH_KEY="$PWD/services/api/FOLLOWUP.pem"   # or path to your .pem
#   ./services/api/scripts/deploy-ec2.sh
#
# Or put deploy-only vars in services/api/.deploy.env (see .deploy.env.example):
#   ./scripts/deploy-ec2.sh
#
# Optional:
#   DEPLOY_ENV_FILE=/path/to/.deploy.env   # default: services/api/.deploy.env
#   EC2_ENV_FILE=/path/to/.env.aws         # default: services/api/.env.aws (uploaded to server as .env)
#   AWS_PROFILE=myprofile
#   EC2_SSH_USER=ubuntu          # default ec2-user (Amazon Linux); use ubuntu on Ubuntu AMIs
#   DEPLOY_NGINX=0               # default 1: install/configure Nginx → :3000 + open SG 80/443
#   NGINX_DOMAIN=api.curvvtech.in
#   NGINX_PROXY_TARGET=http://127.0.0.1:3000
#   CERTBOT_EMAIL=you@domain.com # optional non-interactive Let's Encrypt after deploy
#   CONFIGURE_UFW=1              # Ubuntu: add UFW rules when ufw is installed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-$BACKEND_DIR/.deploy.env}"
if [[ -f "$DEPLOY_ENV_FILE" ]]; then
  echo "==> Loading deploy vars from $DEPLOY_ENV_FILE"
  set -a
  # shellcheck source=/dev/null
  source "$DEPLOY_ENV_FILE"
  set +a
fi

REGION="${AWS_REGION:-ap-south-1}"
INSTANCE_ID="${EC2_INSTANCE_ID:?Set EC2_INSTANCE_ID or add it to $DEPLOY_ENV_FILE}"
SSH_KEY="${EC2_SSH_KEY:-"$BACKEND_DIR/FOLLOWUP.pem"}"
REMOTE_DIR="${EC2_REMOTE_DIR:-followup-api}"
SSH_USER="${EC2_SSH_USER:-ec2-user}"
DEPLOY_NGINX="${DEPLOY_NGINX:-1}"
ENV_FILE="${EC2_ENV_FILE:-$BACKEND_DIR/.env.aws}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "  cp \"$BACKEND_DIR/.env.aws.example\" \"$BACKEND_DIR/.env.aws\"   # then edit DATABASE_URL, JWT_*, etc."
  exit 1
fi

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Missing SSH key: $SSH_KEY (set EC2_SSH_KEY)"
  exit 1
fi
chmod 400 "$SSH_KEY" 2>/dev/null || true

echo "==> AWS identity (must match the account that owns $INSTANCE_ID)"
aws sts get-caller-identity --region "$REGION"

echo "==> Describe instance $INSTANCE_ID"
STATE=$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].State.Name' --output text)
PUBLIC_IP=$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
SG_ID=$(aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)

if [[ "$STATE" != "running" ]]; then
  echo "Instance is not running (state=$STATE)"
  exit 1
fi
if [[ -z "$PUBLIC_IP" || "$PUBLIC_IP" == "None" ]]; then
  echo "No public IPv4 on this instance."
  exit 1
fi

echo "    State=$STATE PublicIp=$PUBLIC_IP SecurityGroup=$SG_ID"

echo "==> Ensure TCP 3000 open on $SG_ID (idempotent)"
if aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG_ID" \
  --protocol tcp --port 3000 --cidr 0.0.0.0/0 2>/dev/null; then
  echo "    Added ingress rule for 0.0.0.0/0:3000"
else
  echo "    Rule may already exist (ok)"
fi

if [[ "$DEPLOY_NGINX" == "1" ]]; then
  echo "==> Ensure TCP 80 and 443 open on $SG_ID for Nginx (idempotent)"
  for port in 80 443; do
    if aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG_ID" \
      --protocol tcp --port "$port" --cidr 0.0.0.0/0 2>/dev/null; then
      echo "    Added ingress rule for 0.0.0.0/0:$port"
    else
      echo "    Rule 0.0.0.0/0:$port may already exist (ok)"
    fi
  done
fi

# Paths with spaces (e.g. .../Follow Up/...) must be quoted inside -e for rsync.
RSYNC_RSH="ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15"
SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)

echo "==> Rsync backend -> $SSH_USER@$PUBLIC_IP:~/$REMOTE_DIR/"
rsync -avz --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude dist \
  --exclude FOLLOWUP.pem \
  --exclude '*.pem' \
  --exclude .env \
  --exclude .env.aws \
  -e "$RSYNC_RSH" \
  "$BACKEND_DIR/" "$SSH_USER@$PUBLIC_IP:~/$REMOTE_DIR/"

echo "==> Upload $ENV_FILE -> ~/$REMOTE_DIR/.env"
scp "${SSH_OPTS[@]}" "$ENV_FILE" "$SSH_USER@$PUBLIC_IP:~/$REMOTE_DIR/.env"

echo "==> Install Docker & Compose on instance (if needed), build, migrate, start"
# Quoted heredoc: all shell runs on EC2; pass REMOTE_DIR and PUBLIC_IP in the remote environment.
ssh "${SSH_OPTS[@]}" "$SSH_USER@$PUBLIC_IP" \
  env REMOTE_DIR="$REMOTE_DIR" PUBLIC_IP="$PUBLIC_IP" \
  bash -s <<'REMOTE'
set -euo pipefail
cd "$HOME/$REMOTE_DIR"

if ! grep -q '^DATABASE_URL=' .env 2>/dev/null || grep -q '^DATABASE_URL=$' .env 2>/dev/null; then
  echo "ERROR: Set DATABASE_URL in ${HOME}/${REMOTE_DIR}/.env (RDS or Neon) before deploy."
  exit 1
fi
# docker-compose.stack.yml has no local Postgres - localhost URLs always fail on EC2
if grep -E '^DATABASE_URL=.*(@localhost|@127\.0\.0\.1|:localhost:|:127\.0\.0\.1:)' .env >/dev/null 2>&1; then
  echo "ERROR: DATABASE_URL points at localhost. On EC2 use your RDS or Neon URL in ${HOME}/${REMOTE_DIR}/.env."
  exit 1
fi

if command -v docker &>/dev/null && sudo docker info &>/dev/null; then
  echo "Docker already running."
elif command -v apt-get &>/dev/null; then
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io
elif command -v dnf &>/dev/null; then
  sudo dnf install -y docker
elif command -v yum &>/dev/null; then
  sudo yum install -y docker
else
  echo "No apt-get/dnf/yum; install Docker manually on this AMI."
  exit 1
fi

sudo systemctl enable docker 2>/dev/null || true
sudo systemctl start docker

# Prefer standalone docker-compose when present (Amazon Linux often has no `docker compose` v2 plugin).
if command -v docker-compose &>/dev/null && sudo docker-compose version &>/dev/null; then
  DC="sudo $(command -v docker-compose)"
elif sudo docker compose version &>/dev/null; then
  DC="sudo docker compose"
else
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64) DA=x86_64 ;;
    aarch64) DA=aarch64 ;;
    *) echo "Unsupported arch: $ARCH"; exit 1 ;;
  esac
  COMPOSE_VER="v2.29.7"
  echo "Installing docker-compose ${COMPOSE_VER} for linux-${DA}"
  sudo curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VER}/docker-compose-linux-${DA}" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  DC="sudo /usr/local/bin/docker-compose"
fi

echo "Using compose: $DC"
$DC -f docker-compose.stack.yml build --no-cache
$DC -f docker-compose.stack.yml run --rm api node scripts/migrate.mjs
# Do not add `up --build` here: it can hit BuildKit cache and skip a fresh COPY src after `build --no-cache`.
# Docker Compose v1 on EC2 can leave the running container on a stale image even after `build --no-cache`;
# stop + rm + up guarantees the new `followup-api-api:latest` is what listens on :3000.
$DC -f docker-compose.stack.yml stop api 2>/dev/null || true
$DC -f docker-compose.stack.yml rm -f api 2>/dev/null || true
$DC -f docker-compose.stack.yml up -d --no-deps api

echo ""
echo "API: http://${PUBLIC_IP}:3000/health"
REMOTE

if [[ "$DEPLOY_NGINX" == "1" ]]; then
  echo ""
  echo "==> Nginx reverse proxy (DEPLOY_NGINX=1)"
  # shellcheck disable=SC2029
  ssh "${SSH_OPTS[@]}" "$SSH_USER@$PUBLIC_IP" \
    "cd \"\$HOME/$REMOTE_DIR\" && sudo env \
      NGINX_DOMAIN=\"${NGINX_DOMAIN:-api.curvvtech.in}\" \
      NGINX_PROXY_TARGET=\"${NGINX_PROXY_TARGET:-http://127.0.0.1:3000}\" \
      CERTBOT_EMAIL=\"${CERTBOT_EMAIL:-}\" \
      CONFIGURE_UFW=\"${CONFIGURE_UFW:-}\" \
      bash deploy/setup-nginx-ubuntu.sh"
fi

echo ""
echo "Done. Test: curl -sS http://$PUBLIC_IP:3000/health"
if [[ "$DEPLOY_NGINX" == "1" ]]; then
  echo "       curl -sS http://${NGINX_DOMAIN:-api.curvvtech.in}/health  (after DNS → $PUBLIC_IP)"
  if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
    echo "       curl -sS https://${NGINX_DOMAIN:-api.curvvtech.in}/health"
  fi
fi
