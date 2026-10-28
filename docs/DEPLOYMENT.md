# Deploying myvisa

This is the production runbook: what runs where, the one-time setup, each release, and what to check afterwards. Read [`ARCHITECTURE.md`](ARCHITECTURE.md) first if you're new to the codebase.

## What runs where

| Piece | Recommended host | Notes |
|---|---|---|
| Website (`apps/web`, Next.js 15) | **Vercel** | Or the Docker image `apps/web/Dockerfile` on any container host. |
| API (`apps/api`, NestJS) + queue workers | **Render** (`render.yaml`) | Docker image `apps/api/Dockerfile`. Railway, Fly.io or AWS ECS work the same way. |
| PostgreSQL 17 | Render Postgres | Point-in-time recovery needs a paid plan — use one. |
| Redis 7 | Render Key Value | `maxmemory-policy noeviction` (BullMQ jobs must never be evicted). |
| Document storage | **Cloudflare R2** (or AWS S3) | Private bucket, presigned URLs only. |
| Virus scanning | ClamAV (`clamav/clamav:stable`) as a private service | The API refuses to start in production without `CLAMAV_HOST`. |
| Email | Resend | Verify the sending domain (SPF + DKIM). |
| SMS | Unifonic or Taqnyat | Register the sender name with the provider before launch. |
| Payments | Moyasar or Tap | Pick one (`PAYMENT_PROVIDER`). |
| WhatsApp | Meta WhatsApp Cloud API | Templates must be approved in Meta Business Manager first. |
| Errors | Sentry | `SENTRY_DSN` on the API. |

Domains: the site on `myvisa.sa` (and `www`), the API on `api.myvisa.sa`. Browsers never call the API directly: the website proxies `/api/v1/*` to `API_URL`. So the auth cookies stay first-party, and CORS only matters for webhooks and server-to-server calls.

## One-time setup

### 1. Secrets

Generate each one once and keep it in a password manager or a secrets manager. Never commit them.

| Variable | Where | How to generate |
|---|---|---|
| `JWT_ACCESS_SECRET` | API **and** web (same value) | `openssl rand -base64 48` |
| `HASH_PEPPER` | API | `openssl rand -base64 32` |
| `DATA_ENCRYPTION_KEY` | API | `openssl rand -base64 32` — **if this key is lost, stored passport numbers can't be read. Back it up separately.** |
| `BLIND_INDEX_KEY` | API | `openssl rand -base64 32` (different from the above) |
| `REVALIDATE_SECRET` | API **and** web (same value) | `openssl rand -hex 24` |

### 2. Document storage (R2)

1. Create a private bucket (for example `myvisa-documents`). Never make it public.
2. Create an API token scoped to that bucket and set `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION=auto`, `S3_FORCE_PATH_STYLE=false` and `S3_AUTO_CREATE_BUCKET=false`.
3. Apply CORS so browsers can upload directly to the bucket with presigned URLs. Without it, every upload fails.
   ```bash
   aws s3api put-bucket-cors --bucket myvisa-documents --cors-configuration file://infra/storage/cors.json --endpoint-url "$S3_ENDPOINT"
   ```
   List every site origin in it, including preview domains if you use them.
4. On the website, set `UPLOAD_ORIGIN` to the bucket's endpoint origin. The Content-Security-Policy only lets the browser connect to that origin.

R2 encrypts data at rest, so use `S3_SSE=none` there. On AWS S3, use `S3_SSE=AES256`.

### 3. API on Render

1. In Render, create a **Blueprint** from this repository. `render.yaml` sets up Postgres, Redis and the API service.
2. Fill in every variable marked `sync: false`. `PAYMENT_PROVIDER` must be `moyasar` or `tap`, and `SMS_PROVIDER` must be `unifonic` or `taqnyat`. The API refuses to start with development shortcuts in production: the dev OTP code, console SMS, the mock gateway, placeholder secrets, no ClamAV, or a site URL that isn't https.
3. Add the ClamAV private service (`clamav/clamav:stable`, port 3310) and set `CLAMAV_HOST` to its internal hostname.
4. Point `api.myvisa.sa` at the service.
5. Migrations run automatically before each deploy (`preDeployCommand`).
6. Load the catalog once, after the first deploy. Use the service's **Shell**:
   ```bash
   cd db && SEED_ADMIN_PHONE=+9665XXXXXXXX node --import tsx prisma/seed.ts
   ```
   This creates the destinations, prices, settings and the first super admin. It's safe to re-run: the catalog is overwritten, but settings, testimonials and guides are kept.

### 4. Website on Vercel

1. Import the repository, set the **root directory** to `apps/web` and the framework to Next.js. Vercel detects pnpm from the lockfile.
2. Environment variables (Production):
   - `API_URL=https://api.myvisa.sa`
   - `NEXT_PUBLIC_SITE_URL=https://myvisa.sa` — must be https. It turns on HSTS and `upgrade-insecure-requests`.
   - `UPLOAD_ORIGIN=https://<account>.r2.cloudflarestorage.com`
   - `JWT_ACCESS_SECRET` and `REVALIDATE_SECRET`, with the same values as the API.

   `API_URL`, the site URL and the upload origin are read at **build** time, so redeploy after changing them.
3. Add the domains `myvisa.sa` and `www.myvisa.sa`.
4. On the API, set `WEB_REVALIDATE_URL=https://myvisa.sa/api/revalidate` so admin edits refresh the site within seconds.

### 5. Third parties

- **Payment gateway webhook:** `https://api.myvisa.sa/api/v1/payments/webhooks/<moyasar|tap>`. Every webhook is re-checked against the gateway's API before anything is trusted.
- **WhatsApp:** get these templates approved — `order_received`, `payment_failed`, `order_update` and `message_received` — then set `WHATSAPP_PROVIDER=meta`.
- **ZATCA (Fatoora):** complete onboarding (CSR → compliance CSID → production CSID). Set `ZATCA_EGS_PRIVATE_KEY` and `ZATCA_EGS_CERTIFICATE`, and validate a sample invoice XML with the ZATCA SDK. Until then invoices are hashed and chained but unsigned, and stay "pending report".
- **Admin → Settings:** enter the real CR number, VAT number, address and phone. They're printed on every invoice.

## Each release

1. Merge to `main` once CI is green. CI runs lint, typecheck, unit tests, the API e2e suite against real Postgres/Redis/S3, the Playwright browser tests, a dependency audit, and both Docker image builds.
2. Render builds the API image, runs migrations, then switches traffic once `/health` passes. Vercel builds the website.
3. Migrations must be backward-compatible with the previous release while both versions run: add columns as nullable first, and remove old ones in a later release.

**Rollback:** in Render and Vercel, redeploy the previous successful build. Database migrations are not rolled back automatically. Write a forward fix.

## After deploying

- [ ] `https://api.myvisa.sa/health` returns `ok` (database and Redis are up).
- [ ] Admin sign-in at `/admin/login` with the super-admin phone. The SMS arrives from the registered sender.
- [ ] Place a real order with a small amount. The payment webhook arrives and the order becomes "received". The invoice appears in the account, and the QR code scans in the Fatoora app. The WhatsApp, SMS and email messages arrive.
- [ ] Refund that order from the order desk. The refund appears in the gateway dashboard, and a credit note is issued.
- [ ] Upload a file. Then upload the [EICAR test file](https://www.eicar.org/download-anti-malware-testfile/), which must be rejected by the virus scan.
- [ ] `https://myvisa.sa/robots.txt` and `/sitemap.xml` are reachable. Submit the sitemap in Google Search Console.
- [ ] Response headers on the site include `content-security-policy` and `strict-transport-security`.
- [ ] Run Lighthouse (mobile) on `/`, a destination page and a guide.
- [ ] Set up an uptime monitor on `/health` and a Sentry alert rule.

## Operations

- **Backups:** turn on Postgres point-in-time recovery. Keep a copy of `DATA_ENCRYPTION_KEY` outside the platform, because a restored database is useless without it. Consider R2 bucket replication.
- **Logs:** the API logs JSON (pino) to stdout, with cookies and auth headers redacted.
- **Staff:** add staff in Admin → Team & roles, by phone number. Switching someone off ends their sessions and returns their open orders to the queue.
- **API docs:** Swagger is off in production. Set `API_DOCS=true` only on a staging API.
- **Key rotation:** rotating `JWT_ACCESS_SECRET` signs everyone out, and must be changed on the API and the web at the same time. Do **not** rotate `DATA_ENCRYPTION_KEY` or `BLIND_INDEX_KEY` without a re-encryption migration.
