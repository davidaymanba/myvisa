# Handoff — all 7 phases done, waiting for the client's review

Read this first in a new session, then `visa-platform-prompt.md` (the brief), `docs/ARCHITECTURE.md` and `docs/DESIGN.md`.

## Where we are (2026-10-28)

| Phase | Status |
|---|---|
| 1 — Design system, Prisma schema, shared logic | ✅ done |
| 2 — Public website (ar/en), bold and motion-led | ✅ done |
| 3 — Backend foundation + admin CMS | ✅ done |
| 4 — Apply wizard, uploads, payments, notifications | ✅ done |
| 5 — Client dashboard + order tracking + ZATCA invoices | ✅ done |
| 6 — Admin operations panel + reports | ✅ done |
| 7 — SEO (+ blog), performance, security hardening, tests, CI, deployment | ✅ done, **waiting for client review** |

Green as of handoff: `pnpm typecheck`, `pnpm lint`, `pnpm test` (68 shared + 56 API unit), `pnpm test:e2e` (75 API e2e on a disposable DB + S3 bucket), `pnpm test:browser` (8 Playwright tests: apply → pay → account → track, admin desk, public/SEO/headers, desktop + mobile), `pnpm build`, `pnpm db:validate`. Browser walkthroughs: `pnpm apply-tour`, `pnpm admin-tour` (now every Phase 6 screen, `FULL=1` for full pages), and `pnpm account-tour` (dashboard + tracking; ar/en, 1440/390, light/dark — no page errors, no horizontal overflow).

Git: the client created a repo with one commit ("add files") during Phase 3. Phase 3–7 work is **uncommitted**; ask before committing.

## Running it locally

```bash
cp -n .env.example .env && cp -n apps/web/.env.example apps/web/.env.local
pnpm install                # also runs `prisma generate`
pnpm infra:up               # postgres :5442, redis :6390, mailpit :8035, S3 (SeaweedFS) :9010 — ports offset; 5432/6379/4000 are taken here
pnpm db:deploy && pnpm db:seed
pnpm db:seed-demo           # demo customer 0500000002: family, 4 orders (delivered / appointment booked / action required / draft), chat, invoices
pnpm --filter @myvisa/api build && pnpm --filter @myvisa/api start    # API :4100, Swagger at /docs
pnpm --filter @myvisa/web build && pnpm --filter @myvisa/web start    # web :3100
```

Admin: http://localhost:3100/admin/login with phone `0500000001` (SEED_ADMIN_PHONE) and the dev code `000000` (OTP_DEV_CODE; refused in production).
Apply: http://localhost:3100/apply (or any "Apply" button) — any Saudi mobile + `000000`; payment goes through the local **mock gateway** (`PAYMENT_PROVIDER=mock`). Emails land in Mailpit: http://localhost:8035.
Dashboard: http://localhost:3100/account with `0500000002` + `000000` (after `db:seed-demo`). The demo agent is `0500000003` (AGENT, "ريم القحطاني"); demo coupons WINTER25 / WELCOME50 / SUMMER10. Tracking: http://localhost:3100/track with an order number from that account + the same phone.

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

## What Phase 4 delivered

- **Wizard `/apply`** (own layout, noindex): visa (destination rail, purpose/applicant pills, visa tickets with live price, travel dates) → inline phone OTP gate → travellers (up to 9, MRZ-name validation, passport-expiry warning, live per-traveller quote) → documents (per traveller + per order, drag/drop, camera, XHR progress, scan status, photo guide) → appointment (only when the visa needs one) → review (edit links, coupon, `PriceBreakdown`, refund summary, 3 mandatory PDPL consents + marketing) → payment → `/apply/confirmation` (polls payment, stamp + boarding pass). Sticky "boarding pass" summary with animated total; resumable via `?order=&step=`. All site "Apply" CTAs (hero, visa tabs, finder, sticky bar) now open it with the right preselection.
- **Orders API** (`modules/orders`): quote, draft create/replace (travellers matched by passport so their uploads survive edits), submit (re-prices with coupon, writes 5 `Consent` rows, stores `refundPolicyVersion`, → PENDING_PAYMENT; zero-total → RECEIVED), cancel, owner-only `GET /orders/:id/travelers` for editing. Passport numbers AES-256-GCM encrypted + HMAC blind index (`common/pii.service.ts`); travellers also saved to the family vault (`Traveler`). State machine `ORDER_TRANSITIONS` in shared. `payment.succeeded` → RECEIVED + coupon redemption + `order.status_changed`.
- **Documents API** (`modules/documents`): presign (validates requirement/traveller/type/size) → browser PUT to S3 → `complete` (HEAD-verifies size) → BullMQ scan worker (SHA-256 + ClamAV INSTREAM when `CLAMAV_HOST` is set; infected files deleted) → short-lived signed view URLs.
- **Payments** (`modules/payments`): Moyasar (Invoices API) · Tap (Charges API) · mock gateway, chosen by `PAYMENT_PROVIDER`; `Idempotency-Key` per order; webhooks stored once per (provider, eventId) and always re-verified against the gateway API; amount mismatch → FAILED. Mock checkout page `/pay/mock` (dev only, refused by the API in production).
- **Notifications** (`modules/notifications`): one `Notification` row + BullMQ job per channel (in-app, SMS, WhatsApp Cloud API templates, email via SMTP/Resend), bilingual templates `order.received` and `payment.failed`; adding a status template is one registry entry.
- **Infra:** SeaweedFS (S3 API) in compose (MinIO images are no longer freely pullable), BullMQ queues (`infra/queue.ts`), domain events (`common/events.ts`).

## What Phase 5 delivered

- **API** (no schema change; everything fits the Phase 1 schema):
  - `modules/account`: `GET/PUT /me/profile` (marketing consent is a ledger row only when it changes), `GET /me/summary` (dashboard counters + badges), saved travellers CRUD `/me/travelers` (masked in lists, full passport only on `GET /me/travelers/:id`, duplicate passport → `traveler_exists`, soft delete).
  - Vault (`documents/vault.controller.ts`): `GET/POST /me/documents`, `…/:id/complete`, `…/:id/url`, `DELETE` (files used by an order only leave the vault), and `POST /orders/:id/documents/attach` to reuse a stored, clean file for a requirement. Removing an order upload no longer deletes a file that's in the vault or another order.
  - `modules/messages`: one thread per order (`GET/POST /orders/:id/messages`, `GET /messages/:id/attachment`); reading marks the other side read; staff with `orders:write` reply as STAFF → `message.created` → in-app + WhatsApp `message.received`.
  - Orders: `GET /orders/:id/timeline` (events with customer notes, appointment, shipments, decision, invoices), `POST /orders/:id/resubmit` (ACTION_REQUIRED → DOCUMENTS_REVIEW once no required slot relies on a rejected file). `OrderView.statusNote` = note on the latest status change.
  - Notifications: `GET /me/notifications` (cursor pages, rendered in the browsing locale, with an in-site `href`), `POST /me/notifications/:id/read`, `read-all`. New templates `order.update` (wording per status, carries the staff note) and `message.received`; `STATUS_TEMPLATES` now covers every customer-facing status. Customers aren't messaged about their own actions.
  - `modules/tracking`: `POST /track/request` (same answer and no SMS when number/phone don't match; per-IP cap), `POST /track/verify` → view + 30-min read-only JWT (audience `myvisa-track`, can't be used as a session), `GET /track` with `x-track-token`. No names, passports, documents or prices in the view.
  - `modules/invoices` (ZATCA): on PENDING_PAYMENT → RECEIVED an invoice is issued (retried by the `invoices` queue on failure) under a Postgres advisory lock: sequential `INV-YYYY-NNNNNN`, ICV, previous-invoice-hash chain (first = spec PIH), UBL 2.1 simplified-invoice XML stored in S3, SHA-256 hash, ECDSA secp256k1 stamp, TLV QR (tags 1–8; tag 9 when a CSID cert is configured). Lines split our service fee (S, 15%) from government fees (O, out of scope, VATEX-SA-OOS). `GET /me/invoices`, `GET /invoices/:id` (owner, or staff with `finance:read`), `GET /invoices/:id/xml`.
  - RBAC: new `orders:read`, `orders:write`, `finance:read` (agent: orders; accountant: orders read + finance; manager: all).
  - `src/scripts/seed-demo.ts` (built to `dist/scripts/seed-demo.js`, `pnpm db:seed-demo`).
- **Web**:
  - `/account` (middleware gate: any valid access token, else `/account/login?next=`; login first tries a silent refresh). Shell = passport cover (teal leather, gold foil, rotating guilloche, page numbers, badges) on desktop; tab bar + "more" sheet on mobile.
  - Pages: overview (greeting + entry stamp, action banner, counters, most urgent order as a boarding pass, drafts, latest updates, family), orders (ticket stubs, filters), order page (cinematic hero, boarding pass with real milestone dates, action panel with rejected files + inline upload + "from vault" + resubmit, draft/pending panel with cancel, journey log, documents by traveller with review state, travellers, chat, payment/invoice/appointment/shipping), family (passport data-page cards with MRZ, add/edit/delete dialog), vault (filters by owner, upload dialog with type/owner/expiry), notifications (grouped by day, mark read), invoices (receipt cards) + printable bilingual tax invoice with QR and XML download, profile.
  - `/track` (public, in sitemap): split-flap departures board that flips to the real order, OTP form, boarding pass + journey log, auto-refresh with the token (sessionStorage).
  - Wizard: travellers step offers the saved family as one-tap chips; confirmation links to the order in the account. Header has an account icon; menu/footer link to tracking and the account.
  - Messages: `messages/account/*` (withheld from public pages like `admin`) and `messages/track/*`.

## What Phase 6 delivered

- **API**
  - `modules/admin-orders` (`orders:read` to see, `orders:write` to act): queue `GET /admin/orders` (views open · mine · unassigned · overdue · closed · all; search by order number, phone, name, or an exact passport number through the blind index; sorted by SLA; per-status counts for the board), order desk `GET /admin/orders/:id`, `POST …/status` (shared `staffTransitions`; guard rails: ACTION_REQUIRED needs a customer note, DECISION_ISSUED needs a decision, leaving review needs every required file approved, APPOINTMENT_BOOKED needs the appointment, REFUNDED only via a refund; optimistic concurrency; whoever moves an unassigned order owns it; emits `order.status_changed` with the note → customer notification), `…/assign`, `…/notes` (internal), `POST /admin/order-documents/:id/review` (approve / reject with reason; the first review moves RECEIVED → DOCUMENTS_REVIEW), `PUT …/appointment`, shipments, `GET /admin/agents`.
  - Refunds (`payments:refund` — accountant, manager, super admin): `POST /admin/orders/:id/refunds` → gateway refund (Moyasar via the invoice's captured payment, Tap Refunds API, mock) → ZATCA **credit note** (type 381, BillingReference to the invoice, reason, same ICV/hash chain, refund spread over the original lines so VAT is credited only where charged) → order REFUNDED when nothing is left.
  - SLA per status in shared (`SLA_HOURS`, `slaDueAt`, `OUR_TURN`): RECEIVED 4 h, DOCUMENTS_REVIEW 24 h, DECISION_ISSUED 72 h; none while the customer/centre/embassy holds the order.
  - `modules/coupons` (list for `catalog:read`, write for `pricing:write`), `modules/customers` (CRM list/search + profile with orders, family, consent ledger), `modules/staff` (`staff:manage`: invite by phone — promotes an existing account —, change role, switch off; nobody changes themselves; switching someone off unassigns their open orders and ends their sessions), `modules/reports` (`GET /admin/reports/live` for `orders:read`; `overview` and `orders.csv` for `finance:read`: KPIs vs the previous period in Riyadh days, daily series, funnel, statuses, top destinations, agent workload; CSV with BOM for Excel).
  - RBAC: new `payments:refund`. Every staff mutation is in the audit log.
- **Admin UI** (`/admin`, new nav: orders, customers, reports, coupons, team): order board (kanban by status, drag a card only onto statuses the state machine allows, the move dialog asks for the customer note / decision) or table with pagination; order desk (dark header with customer contact + assignment, "next step" buttons, document review with inline reject reason, appointment and shipping, travellers, journey log, the customer chat from the staff side, internal notes, payments with refunds and credit-note links, invoices at `/admin/invoices/:id`); customers list + profile; coupons as ticket cards + editor (services picker, dates, limits); team cards + live permission matrix from the shared RBAC; reports (hero "collected" figure, KPI tiles with deltas, daily column chart with tooltip and table view, revenue split, funnel, destinations, workload). Overview gained the live operations strip. Chart colours were validated with the dataviz palette checker for light and dark.

## What Phase 7 delivered

- **Travel guides (blog):** API `modules/blog` (public `GET /blog`, `GET /blog/:slug`, published only and cached; admin CRUD under `content:read/write`, the publish date is stamped once, slug conflicts → `slug_taken`, edits revalidate the `blog` tag). Admin editor `/admin/blog` with a live Markdown preview in both languages. Public `/blog` (latest guide featured, tag filter) and `/blog/[slug]` (cinematic cover, reading progress, TOC with scroll-spy, copy link, related guides, CTA, JSON-LD BlogPosting + BreadcrumbList; English pages of Arabic-only guides are `noindex` with a canonical to the Arabic). Markdown is rendered with `react-markdown` + GFM, **no raw HTML and no images**, so an editor account can't inject scripts. Three starter guides are seeded (and are the offline fallback) — **sample content, have an expert review it**.
- **SEO:** default OG share card (`app/[locale]/opengraph-image.tsx`, Latin text — the OG renderer can't shape Arabic), `pageMetadata` always names an image, the sitemap includes the guides (an English alternate only when it exists) and `/blog` + `/track`, and robots disallows `/admin`, `/account`, `/apply`, `/pay`, `/api` (they're `noindex` too).
- **Performance:** first-paint entrances are now CSS, not JavaScript (`FadeIn`, `SplitReveal trigger="mount"`, the destination photo, the home search card), so content shows before hydration; each page's main text block (`FadeIn lcp`) is painted with the first frame and only eases into place. `/visa-finder` and `/track` server-render a full fallback (no layout shift: the finder's CLS went 0.418 → 0.001). Lighthouse mobile with real (devtools) throttling on `next start` (final run): home 87 · destination 94 · visa finder 98 · pricing 93 · guide 97 · tracking 85; accessibility 100 and SEO 100 everywhere, best practices 96–100. Lighthouse's *simulated* mode scores lower (≈75–85) because it counts the whole JS bundle against any element that appears after scripts start — the hero headline's word reveal is the reason; we kept it as the brand's signature.
- **Security:** Content-Security-Policy (no third-party scripts, no `unsafe-eval` outside dev, `frame-ancestors 'none'`, uploads only to `UPLOAD_ORIGIN`), HSTS + `upgrade-insecure-requests` on https, COOP, a tighter Permissions-Policy; Zod runs jitless in the browser (`packages/shared/src/zod.ts`) so it never trips the CSP; pnpm overrides for patched `postcss`/`multer` (`pnpm audit --prod` → only a low, unreachable `deepmerge` advisory with no fix); Swagger off in production unless `API_DOCS=true`; the API refuses a non-https `WEB_URL` in production; JSON body limit 512 KB; `/.well-known/security.txt` (**placeholder contact — confirm the mailbox**).
- **Tests & CI:** Playwright (`playwright.config.ts`, `e2e/`, `pnpm test:browser`); `.github/workflows/ci.yml` runs lint, typecheck, Prisma validation, unit tests, the audit, the build, the API e2e suite against docker-compose Postgres/Redis/S3, the Playwright suite against the running stack, and both Docker image builds.
- **Deployment:** `apps/api/Dockerfile` (includes the db package with the Prisma CLI, so the same image runs migrations), `apps/web/Dockerfile` (Next standalone when `NEXT_OUTPUT_STANDALONE=1`), `.dockerignore`, `render.yaml` (API + Postgres + Redis on Render), `infra/storage/cors.json` (bucket CORS for direct uploads), and **`docs/DEPLOYMENT.md`** (topology, secrets, one-time setup, each release, post-deploy checklist, operations). The Docker images were **not built on this machine** (its Docker VM has 1.9 GB and `pnpm install` is OOM-killed); CI builds them on GitHub's runners.
- QA helpers: `scripts/csp-check.mjs` (CSP violations per page), `scripts/request-watch.mjs` (runaway requests).

## After launch (not built, by decision)

Server-side invoice PDF for email attachments (today: print-to-PDF), ZATCA reporting once the client is onboarded, email/Google sign-in for customers, realtime chat (today: polled every 15 s), and a nonce-based CSP (would make every page render dynamically).

## Left open on purpose

- Service-category marketing pages, legal texts and the hero route arcs are still static from `packages/shared`.

- ZATCA **reporting/clearance** to the Fatoora API: needs the client's onboarding (CSR → compliance CSID → production CSID). Until then invoices stay `PENDING`. Before switching on, validate our XML with the ZATCA SDK and set `ZATCA_EGS_PRIVATE_KEY` / `ZATCA_EGS_CERTIFICATE`. The invoice "PDF" is the browser's print-to-PDF of `/account/invoices/:id` (server-side PDF for email attachments can come in Phase 7).
- Email/Google sign-in for customers (brief says optional) — not built; phone OTP only.
- Chat is polled (15 s), not pushed; SSE/websocket can come later if volume needs it.
- Real gateway keys: decide Moyasar vs Tap and add `MOYASAR_SECRET_KEY` + `MOYASAR_WEBHOOK_SECRET` (or `TAP_SECRET_KEY`); the webhook URL is `${API_PUBLIC_URL}/api/v1/payments/webhooks/<provider>`.
- WhatsApp templates `order_received` / `payment_failed` must be approved in Meta Business Manager before `WHATSAPP_PROVIDER=meta`.

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
- **React 19 + new Chrome:** `scrollIntoView`/`scrollTo` now return Promises — never write `useEffect(() => el.scrollIntoView())` (React calls the Promise as a cleanup → "destroy is not a function"). Use a block body.
- **next-intl `t.rich`** only takes functions for `<tag>` chunks; a function passed for a plain `{placeholder}` renders nothing. Wrap LTR values in Arabic text with `\u2066…\u2069` instead.
- **SeaweedFS** needs `-volume.max>0` or every PUT fails with "No writable volumes". The API creates buckets itself in dev (`S3_AUTO_CREATE_BUCKET`).
- **Feature message files:** `messages/<area>/{ar,en}.json` (admin, apply, pay) are merged as namespaces by `i18n/request.ts`; only `admin` is withheld from public pages. Keep ar/en keys identical.
- **next-intl `relativeTime` needs a `now`** (`useNow()`), or it throws ENVIRONMENT_FALLBACK in the browser.
- **Full-page screenshots and `whileInView`:** sections that reveal on scroll stay invisible unless the page is scrolled first (`account-tour.mjs` scrolls before each shot).
- **Scripts that boot Nest (`seed-demo`) must `process.exit`** — BullMQ connections keep the event loop alive after `app.close()`.
- **A `motion.span` highlight with `-z-10` inside a button disappears behind a parent that has its own background** — give the button `isolate`.
- **Bar lengths must come from a full-scale track** (`width: x%` inside a `flex-1` box), never `calc(x% - label)`, or small values vanish.
- **Never animate the LCP element from `opacity: 0` with JavaScript** — use the CSS `animate-*-in` utilities, and `FadeIn lcp` for a page's main text block.
- **`useSearchParams` on a static page renders nothing on the server** — give the `Suspense` a full fallback (see `VisaFinderFallback`, `TrackExperienceFallback`), or the page jumps on hydration.
- **Zod must be imported from `packages/shared/src/zod.ts` inside shared** (it switches Zod to jitless in browsers for the CSP).
- **`next/og` (satori) can't take `background: gradient, color`** — use `backgroundColor` + `backgroundImage`. It also can't shape Arabic.
- **`account` messages are withheld from public pages** — anything shown on `/track` must use the `track` namespace.
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
- Review the three starter travel guides (sample content) and confirm `security@myvisa.sa` exists (security.txt).
- ZATCA onboarding (see above) and confirm the seller address/CR/VAT in Admin → Settings — they print on every invoice.
- Production secrets: `JWT_ACCESS_SECRET` (same value in API and web), `HASH_PEPPER`, `DATA_ENCRYPTION_KEY` (32 bytes; losing it makes stored passport numbers unreadable — keep it in a KMS/secret manager), `BLIND_INDEX_KEY`, `REVALIDATE_SECRET`, payment, SMS, email and WhatsApp credentials, `SENTRY_DSN`, S3/R2 bucket + keys, a ClamAV service.
