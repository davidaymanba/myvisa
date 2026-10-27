# Handoff — Phase 3 done, waiting for the client's review

Read this first in a new session, then `visa-platform-prompt.md` (the brief), `docs/ARCHITECTURE.md` and `docs/DESIGN.md`.

## Where we are (2026-10-27)

| Phase | Status |
|---|---|
| 1 — Design system, Prisma schema, shared logic | ✅ done |
| 2 — Public website (ar/en), bold and motion-led | ✅ done |
| 3 — Backend foundation + admin CMS | ✅ done, **waiting for client review** |
| **4 — Apply wizard, uploads, payments, notifications** | ⏭ next (don't start without the go-ahead) |
| 5–7 | not started |

Green as of handoff: `pnpm typecheck`, `pnpm lint`, `pnpm test` (59 shared + 20 API unit), `pnpm test:e2e` (30 API e2e on a disposable DB), `pnpm build`, `pnpm db:validate`.

Git: the client created a repo with one commit ("add files") during Phase 3. Phase 3 work is **uncommitted**; ask before committing.

## Running it locally

```bash
cp -n .env.example .env && cp -n apps/web/.env.example apps/web/.env.local
pnpm install                # also runs `prisma generate`
pnpm infra:up               # postgres :5442, redis :6390, mailpit :8035 (ports offset; 5432/6379/4000 are taken on this machine)
pnpm db:deploy && pnpm db:seed
pnpm --filter @myvisa/api build && pnpm --filter @myvisa/api start    # API :4100, Swagger at /docs
pnpm --filter @myvisa/web build && pnpm --filter @myvisa/web start    # web :3100
```

Admin: http://localhost:3100/admin/login with phone `0500000001` (SEED_ADMIN_PHONE) and the dev code `000000` (OTP_DEV_CODE; refused in production).

## What Phase 3 delivered

- **Infra:** `docker-compose.yml` (Postgres 17, Redis 7, Mailpit, ClamAV behind `--profile scan`), `.env.example` files, Zod-validated env (`apps/api/src/config/env.ts`) that refuses dev shortcuts in production.
- **DB:** first migration; schema aligned with the shared catalog (VISA_FREE kind, AMERICAS region, destination fields on `Country`, bilingual `Testimonial`, `ContactMessage`). `pnpm db:seed` loads `packages/shared` into the DB (idempotent: catalog overwritten, settings/testimonials only created when missing). An e2e test proves `GET /api/v1/catalog` deep-equals `DESTINATIONS`.
- **API (`apps/api`, NestJS 12, bundled by tsup + SWC):** problem+json errors with stable `code`s, pino, helmet, CORS, Zod DTOs from shared schemas (nestjs-zod), Swagger at `/docs`, `/health` + `/health/live`, Sentry (no-op without DSN), Redis-backed rate limiting.
  - Auth: phone OTP (hashed in Redis, 5 attempts, 60s resend cooldown, hourly cap, per-IP cap; audit row in `OtpChallenge`), SMS adapters for **Unifonic and Taqnyat** chosen by `SMS_PROVIDER` (console in dev), HS256 access JWT (15 min) + rotating refresh token in httpOnly cookies, family revocation on reuse (10 s grace for parallel tabs), CSRF = Origin check + double-submit `mv_csrf` cookie / `x-csrf-token` header.
  - RBAC matrix in `packages/shared/src/rbac.ts`; role and active flag re-read from the DB on every authenticated call.
  - Catalog: public `GET /catalog`, `/catalog/finder`, `/catalog/destinations/:slug`; admin CRUD for countries, services, price rules (VISA_FREE ⇒ no service fee, no duplicate live rule), requirements (+ reorder), FAQs; settings; testimonials (publishing needs `consentedAt`); contact inbox; PDPL consent ledger (`POST /consents`, `GET /consents/me`).
  - `AuditInterceptor` logs every staff mutation with before/after. Edits drop the Redis cache and call the web app's `/api/revalidate` (tags `catalog` · `settings` · `testimonials`).
- **Website:** reads catalog/settings/testimonials through `apps/web/src/lib/api/server.ts` (ISR 5 min + tags) and falls back to the shared data when the API is down, so builds never depend on it. `/api/v1/*` is proxied to the API by a Next rewrite (cookies stay first-party). Contact form posts for real (honeypot, 5/hour/IP). `lib/company.ts` is gone (values live in `DEFAULT_SETTINGS`).
- **Admin (`/admin`, `/en/admin`):** middleware gate (staff JWT) → login (RUH→OPS boarding-pass card, silent refresh, stamp on success) · overview (counters, audit feed) · destinations grid · destination editor (cinematic hero; visas as tickets; price rules with live `PriceBreakdown`; document checklist with reorder; FAQs; full profile form with save bar) · inbox · testimonials · settings · audit log. Admin strings live in `apps/web/src/messages/admin/{ar,en}.json` and are only sent to the client under `/admin`.

## Left open on purpose

- Blog/MDX CMS: not built (BlogPost model exists).
- Service-category marketing pages, legal texts and the hero route arcs are still static from `packages/shared`.
- Staff management UI (`staff:manage`) — create staff by setting `User.role` in the DB for now.

## Phase 4 starting points

Apply wizard + uploads (S3/R2 presigned, ClamAV), Moyasar or Tap (ask the client), notifications (WhatsApp/SMS/email via queues), price snapshot on `Order` using `calculatePrice` + `resolvePriceRule` (`apps/api/src/modules/catalog/catalog.mapper.ts`), consent capture before payment using the `legal.*Version` settings.

## Hard-won gotchas (don't rediscover these)

- **pnpm 12 blocks build scripts.** Approve them with `pnpm approve-builds <pkg>` (written to `allowBuilds` in `pnpm-workspace.yaml`). Prisma, esbuild, swc, @parcel/watcher and unrs-resolver are already approved.
- **Prisma 7:** the datasource URL lives in `packages/db/prisma.config.ts`, not in the schema. Money is integer halalas everywhere.
- **tailwind-merge** must know the custom type scale (`apps/web/src/lib/utils.ts`). Otherwise `text-body` silently removes the text-colour class.
- **`SplitReveal`:** split by words only, never letters, because letters break Arabic joins. Keep the space *between* the inline-blocks. Gradient text goes in `wordClassName`.
- **Radix hidden inputs** overflow in RTL. They are neutralised in `globals.css`; keep that rule.
- **Absolute globe:** `HeroExperience` must not sit inside a positioned wrapper, because the globe positions against the `<section>`.
- **Dark sections:** add `data-surface="dark"` and `className="dark"`. The header re-themes itself automatically.
- **Scroll areas inside Lenis** need `data-lenis-prevent`.
- **next-intl messages are type-checked** (`src/global.d.ts`). Edit both `ar.json` and `en.json` together; the keys must match.
- **Arabic copy uses Latin digits.** Prices are formatted with `formatMoney` (`ar-SA-u-nu-latn`).
- **`VISA_FREE` options carry no service fee.** A test enforces this.
- **Locale routing:** Arabic is the default at `/`, English at `/en`. `localeDetection` is off on purpose.
- **API bundling:** workspace packages ship TS source, so the API is bundled by tsup (`noExternal: @myvisa/*`); tsup switches to SWC because `emitDecoratorMetadata` is on — without it Nest DI breaks. Vitest uses `unplugin-swc` for the same reason.
- **Prisma 7 client** is generated into `packages/db/src/generated` (gitignored) by `postinstall`. The API depends on `@prisma/client`/`@prisma/adapter-pg` directly because the bundled db code resolves them from `apps/api`.
- **OTP limits bite during QA:** 5 codes per phone per hour. In dev clear them with `docker compose exec redis sh -c "redis-cli --scan --pattern 'otp:*' | xargs -r redis-cli del"`. `scripts/admin-tour.mjs` signs in and screenshots admin pages.
- **Next layouts must type `params.locale` as `string`** (cast to `Locale` inside), or `next build` fails the LayoutProps check.
- **Stopping `next start`:** the process is named `next-server`, so `pkill -f "next start"` misses it; kill by port (`lsof -iTCP:3100`).
- **Cookies:** refresh cookie path is `/api/v1/auth` and `SameSite=Strict`; the web middleware only sees `mv_at`. In production set `COOKIE_DOMAIN` and add every site origin (www, previews) to `CORS_ORIGINS`, or the CSRF Origin check blocks their writes.

## Open items the client must handle before launch

- Testimonials, ratings and headline stats are **placeholders** (search `PLACEHOLDER`). Replace them with real, consented data.
- Visa rules and fees are sample data. The agent flagged these as uncertain: China waiver status, Thailand 60 vs 30 days, Azerbaijan visa on arrival, Japan eVISA eligibility, US fee changes, Switzerland's visa-centre provider.
- Legal pages are drafts. A lawyer should review:
  - consent for sensitive data
  - cross-border transfer consent
  - the liability cap and courier loss
  - retention periods
  - the "Arabic prevails" clause
  - when "review started" begins, which decides the 50% refund
- CR number, VAT number, phone and address are placeholders — edit them in **Admin → Settings**.
- Testimonials are seeded as placeholders (flagged in the admin). Replace with real, consented reviews or unpublish them.
- Production secrets: `JWT_ACCESS_SECRET` (same value in API and web), `HASH_PEPPER`, `REVALIDATE_SECRET`, SMS credentials, `SENTRY_DSN`.
