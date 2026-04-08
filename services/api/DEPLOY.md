# Deploying FollowUp API on AWS

Stateless Node service: **ECS Fargate** (or EC2) behind an **Application Load Balancer**, **Amazon RDS for PostgreSQL**, **Secrets Manager** for credentials, optional **S3** for profile uploads.

## Environment variables (production)

| Variable | Source | Notes |
|----------|--------|--------|
| `DATABASE_URL` | RDS + Secrets Manager | Connection string; prefer **RDS Proxy** when scaling tasks |
| `OPENAI_API_KEY` | Secrets Manager | Required for lead parsing and Ask AI |
| `JWT_SECRET` | Secrets Manager | HS256 access token signing secret |
| `JWT_REFRESH_SECRET` | Secrets Manager | Reserved / rotation (set alongside JWT_SECRET; both required in prod) |
| `SKIP_AUTH` | — | Must be **`false`** or unset in production |
| `ACCESS_CAP` | Parameter Store | Max users with `access_allowed` (default `1000`) |
| `LANDING_API_KEY` | Secrets Manager | Shared secret for `Follow-up Website Landing` → `POST /v1/public/*` |
| `S3_BUCKET` | — | User asset uploads |
| `AWS_REGION` / `S3_REGION` | — | Region for S3 client |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Task role (preferred) or Secrets Manager | S3 presigned URLs; **prefer IAM task role** and omit static keys |
| `CORS_ORIGINS` | Parameter Store | Comma-separated allowed origins (optional) |
| `PORT` | `3000` | ALB target port |
| `LOG_LEVEL` | `info` | Structured JSON logs → CloudWatch |

## Health checks

- **Liveness:** `GET /health` → `{ "ok": true }`
- **Readiness:** `GET /ready` → checks PostgreSQL (`200` / `503`)

Point ALB health checks at `/health` or `/ready` as you prefer.

## First deploy

1. Create RDS PostgreSQL, note connection string.
2. Run migrations once (from CI, bastion, or one-off task):

   ```bash
   DATABASE_URL="postgresql://..." node scripts/migrate.mjs
   ```

3. Ensure migrations include password columns (`005_password_jwt_auth.sql`) and users can sign up via `POST /auth/signup`.
4. Build and push the image from this folder:

   ```bash
   docker build -t followup-api .
   ```

5. Define ECS task definition with secrets/env from Secrets Manager / SSM, run service behind ALB.

## Mobile app

Set `EXPO_PUBLIC_API_URL` to the public HTTPS API URL. The app signs in against `/auth/login` (no Cognito env vars).

## Marketing site

Set server-only `FOLLOWUP_API_URL` and `FOLLOWUP_LANDING_API_KEY` (same value as API `LANDING_API_KEY`) so Next.js API routes proxy to `GET/POST /v1/public/...`.

## EC2 single-host deploy (Docker + AWS CLI)

Use this when you have one EC2 instance (e.g. Amazon Linux 2023) and want Postgres + API on the same machine.

1. **AWS CLI** must target the **same AWS account** as the instance. Check:

   ```bash
   aws sts get-caller-identity --region ap-south-1
   ```

   If the `Account` does not match the account that owns the instance, run `aws configure` or set `AWS_PROFILE` to a profile for that account.

2. **SSH key**: PEM file for the instance key pair (e.g. `FOLLOWUP.pem`), `chmod 400`.

3. **AWS env file (source of truth):** In `services/api/`, copy `cp .env.aws.example .env.aws` and fill **`DATABASE_URL`** (RDS or Neon), **`OPENAI_API_KEY`**, **`JWT_SECRET`** + **`JWT_REFRESH_SECRET`** when `SKIP_AUTH=false`, **`LANDING_API_KEY`**, WhatsApp vars, etc. **`deploy-ec2.sh` uploads `services/api/.env.aws` to `~/followup-api/.env` on every deploy** (your local `.env` is never rsynced). Optional: copy **`.deploy.env.example` → `.deploy.env`** with `EC2_INSTANCE_ID` and `EC2_SSH_KEY` so you can run `./scripts/deploy-ec2.sh` without exporting vars each time. Local dev: `cp .env.example .env` for Docker Postgres. Localhost `DATABASE_URL` is rejected on the server — there is no Postgres container in `docker-compose.stack.yml`.

4. **Security group ports**: the deploy script opens **3000** to `0.0.0.0/0` (direct API). By default it also runs **Nginx** (`DEPLOY_NGINX=1`) and opens **80** and **443**. After HTTPS works, you can remove **3000** from the world if traffic only goes through Nginx.

5. **Run deploy** from `services/api/`:

   ```bash
   cd services/api
   export AWS_REGION=ap-south-1
   export EC2_INSTANCE_ID=i-094f567f617ee7ae5
   export EC2_SSH_KEY="$PWD/FOLLOWUP.pem"
   ./scripts/deploy-ec2.sh
   ```

   **Nginx is included by default** after Docker is up: it runs `deploy/setup-nginx-ubuntu.sh` on the instance (Ubuntu, Debian, or Amazon Linux). To skip: `export DEPLOY_NGINX=0`.

   Optional (same shell as deploy):

   - `EC2_SSH_USER=ubuntu` — if the AMI uses `ubuntu` instead of `ec2-user`.
   - `NGINX_DOMAIN=api.curvvtech.in` / `NGINX_PROXY_TARGET=http://127.0.0.1:3000`
   - `CERTBOT_EMAIL=you@example.com` — non-interactive Let’s Encrypt (needs DNS pointing at the instance and ports 80/443 open).
   - `CONFIGURE_UFW=1` — on Ubuntu, add UFW rules when `ufw` is installed.

6. **Verify**: `curl -sS http://<public-ip>:3000/health` and `/ready`. With Nginx + DNS: `curl -sS http://api.<domain>/health`; with Certbot: `https://...`.

Re-run `./scripts/deploy-ec2.sh` after code changes; it rsyncs, rebuilds images, runs migrations, restarts containers, and reapplies Nginx when `DEPLOY_NGINX=1`.

## Nginx + HTTPS (manual or same as deploy)

Configs are written to `/etc/nginx/conf.d/` (map + `10-followup-api.conf`). Reference snippets: `deploy/nginx-*.conf.example`.

To configure only Nginx on a server (without full deploy):

```bash
cd /path/to/services/api
sudo CERTBOT_EMAIL=you@example.com CONFIGURE_UFW=1 bash deploy/setup-nginx-ubuntu.sh
```

Auto-renewal: Certbot’s systemd timer or cron; check with `sudo certbot renew --dry-run`.

## WhatsApp inbound (webhook)

Saving **Phone number ID** in the mobile app only stores mapping in Postgres. **Inbound** customer messages appear in Inbox only after **Meta POSTs** to your API.

1. **Callback URL** (Meta → *Your App* → WhatsApp → **Configuration**): must be the **public** URL Nginx serves, e.g.  
   `https://api.yourdomain.com/webhook/whatsapp`  
   Use **HTTPS** once TLS works (Meta requires a valid certificate for production webhooks). Path must be exactly `/webhook/whatsapp`.

2. **Verify token**: must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in server `.env`.

3. **Subscribe** webhook field **`messages`** (and `message_status` if you want delivery ticks).

4. **`WHATSAPP_APP_SECRET`**: must match **Meta → App settings → Basic → App secret**. In production, `REQUIRE_WHATSAPP_SIGNATURE` defaults to `true`; a wrong or empty secret yields **403** on POST and Meta will not ingest into your app. For a **short local test only**, you can set `REQUIRE_WHATSAPP_SIGNATURE=false` (do not leave this in production).

5. **Logs**: after deploy, `docker logs followup-api-api-1` should show `WhatsApp webhook POST received` on every delivery. If you never see that line, Meta is not reaching this host (wrong URL, DNS, TLS, or firewall). Nginx: `sudo grep POST /webhook/whatsapp /var/log/nginx/access.log | tail`.
