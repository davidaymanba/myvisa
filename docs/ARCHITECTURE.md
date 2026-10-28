# myvisa — Architecture & folder structure

pnpm + Turborepo monorepo. One language (TypeScript, strict) end to end; business rules that both sides need live once in `packages/shared`.

Legend: ✅ built in Phase 1 · ⏳ planned (phase number)

```
myvisa/
├── apps/
│   ├── web/                              Next.js 15 (App Router) — public site, client dashboard, admin panel
│   │   ├── public/flags/                 ✅ 257 static flag SVGs (synced by scripts/sync-flags.mjs)
│   │   ├── scripts/sync-flags.mjs        ✅
│   │   └── src/
│   │       ├── app/
│   │       │   ├── globals.css           ✅ design tokens (palette, semantic, type scale, shadows, motion)
│   │       │   ├── icon.svg              ✅
│   │       │   └── [locale]/             ✅ ar (default, no prefix) · en (/en)
│   │       │       ├── layout.tsx        ✅ <html lang dir>, fonts, providers
│   │       │       ├── style-guide/      ✅ living design-system page
│   │       │       ├── (site)/           ✅ P2  layout (header, footer, smooth scroll), route-transition template,
│   │       │       │                            home, destinations, destinations/[slug] (SSG ×20), visa-finder,
│   │       │       │                            services, services/[slug], pricing, about, contact,
│   │       │       │                            terms, refund-policy, privacy  · ⏳ blog (with CMS, P3)
│   │       │       ├── not-found.tsx · [...rest]  ✅ localized 404
│   │       ├── app/sitemap.ts · robots.ts   ✅ hreflang alternates
│   │       │       ├── apply/            ✅ P4  multi-step wizard (service → travellers → documents →
│   │       │       │                            appointment → review → payment → confirmation)
│   │       │       ├── (site)/track/     ✅ P5  public tracking (order no. + phone OTP, split-flap board)
│   │       │       ├── account/          ✅ P5  login (OTP, passport-cover opening) · (dashboard)/ overview,
│   │       │       │                            orders, orders/[id] (timeline, action panel, chat), travelers,
│   │       │       │                            documents (vault), notifications, invoices, invoices/[id], profile
│   │       │       └── admin/            ✅ P6  orders (kanban/table) + order desk, customers, coupons, team & roles,
│   │       │                                    reports, invoices/[id] · earlier plan:  dashboard, orders (kanban/table), documents review,
│   │       │                                    catalog (countries, services, price rules, requirements),
│   │       │                                    coupons, customers, content, staff & roles, audit log
│   │       │                                    ✅ P3 already: login (OTP), overview, destinations + visa/price/
│   │       │                                    requirement/FAQ editor, inbox, testimonials, settings, audit log
│   │       ├── components/
│   │       │   ├── ui/                   ✅ primitives (Radix + cva): button, field, input, select, choice,
│   │       │   │                            badge, card, tabs, accordion, dialog, tooltip, alert, progress,
│   │       │   │                            skeleton, separator, phone-input, otp-input, file-dropzone,
│   │       │   │                            stepper, states, toaster
│   │       │   ├── brand/                ✅ logo, flag, passport-stamp, destination-card, price-breakdown,
│   │       │   │                            boarding-pass, route-arcs, trust-bar, whatsapp-button,
│   │       │   │                            theme-toggle, locale-switcher
│   │       │   ├── motion/               ✅ reveal/stagger, counter, magnetic
│   │       │   ├── providers/            ✅ theme · direction · motion · react-query · toaster
│   │       │   ├── layout/               ✅ site header (floating, auto-theming), footer, page hero
│   │       │   ├── globe/                ✅ canvas globe + generated land-dots.json
│   │       │   ├── home/ destinations/ finder/ pricing/ contact/ legal/   ✅ page composites
│   │       │   ├── apply/ pay/ admin/     ✅ P3–P4 (wizard steps, mock checkout, CMS)
│   │       │   ├── account/              ✅ P5  passport-cover shell, guilloche, order tickets, passport cards,
│   │       │   │                            vault, chat, journey log, ZATCA invoice document
│   │       │   └── track/                ✅ P5  split-flap departures board + OTP tracking
│   │       ├── i18n/                     ✅ routing, navigation, request config
│   │       ├── messages/{ar,en}.json     ✅ type-checked keys (src/global.d.ts)
│   │       ├── lib/                      ✅ cn(), seo; ✅ P3 api/server.ts (ISR + fallback), api/client.ts (CSRF + refresh)
│   │       └── middleware.ts             ✅ locale routing; ✅ admin gate (staff JWT); ⏳ (account) gate
│   │
│   └── api/                              ✅ P3  NestJS REST API (OpenAPI at /docs) — ✅ built: config, common,
│       │                                        infra (prisma, redis, throttler), auth, catalog, settings, content,
│       │                                        contact, consents, audit, revalidate, health · ✅ P4: orders,
│       │                                        documents (presign + scan worker), payments, notifications · ✅ P5:
│       │                                        account (profile, summary, family), vault, messages, tracking,
│       │                                        invoices (ZATCA) · ✅ P6: admin-orders (queue, desk, state machine,
│       │                                        review, refunds), coupons, customers, staff, reports
│       ├── src/
│       │   ├── main.ts                   helmet, CORS, cookie-parser, global ValidationPipe, versioning
│       │   ├── app.module.ts
│       │   ├── config/                   typed env (Zod), per-environment
│       │   ├── common/                   guards (JwtAuth, Roles, Throttler), interceptors (Audit, Logging),
│       │   │                             filters (problem+json), decorators (@CurrentUser, @Roles), crypto
│       │   │                             (AES-GCM envelope + HMAC blind index)
│       │   ├── infra/                    prisma, redis, bullmq queues, s3 storage, sentry, health
│       │   └── modules/
│       │       ├── auth/                 OTP request/verify (Unifonic|Taqnyat adapter), JWT + refresh rotation
│       │       ├── users/  travelers/  addresses/  consents/          (PDPL ledger)
│       │       ├── catalog/              countries, services, price-rules, requirements, eligibility (finder)
│       │       ├── orders/               lifecycle state machine, status events, assignment, SLA
│       │       ├── documents/            presigned upload, virus-scan worker, review
│       │       ├── payments/             Moyasar|Tap adapters, webhooks (idempotent), refunds
│       │       ├── invoices/             ✅ ZATCA Phase 2: XML (UBL 2.1), hash chain, ECDSA stamp, QR TLV · ⏳ reporting (needs onboarding)
│       │       ├── account/  tracking/   ✅ profile/summary/family · public tracking (OTP → 30-min read-only token)
│       │       ├── notifications/        WhatsApp, SMS, email (Resend), in-app — queue-driven templates
│       │       ├── messages/  coupons/  content/ (blog, faq, testimonials)  settings/  audit/  reports/
│       │       └── health/
│       ├── test/                         e2e (supertest) against a disposable Postgres
│       └── Dockerfile
│
├── packages/
│   ├── shared/                           ✅ framework-free logic used by web + api
│   │   └── src/  money.ts · pricing.ts · order-status.ts · phone.ts · digits.ts  (all tested)
│   │       ├── catalog/  types · destinations (20 countries, sample data) · services · helpers (pickVisa, matchVisa…)
│   │       └── content/  legal (terms, refund, privacy — drafts pending legal review)
│   └── db/                               ✅ Prisma 7 schema + prisma.config.ts + createPrismaClient()
│       └── prisma/ schema.prisma · ✅ migrations/ · ✅ seed.ts (src/seed: shared catalog → DB)
│
├── docs/                                 ✅ ARCHITECTURE.md · DESIGN.md
├── ✅ docker-compose.yml                  postgres 17, redis 7, mailpit, S3 (SeaweedFS), clamav (profile "scan")
├── ✅ .github/workflows/ci.yml            P7  lint · typecheck · tests · audit · build · API e2e · Playwright · Docker
├── ✅ e2e/ + playwright.config.ts          P7  browser tests
├── ✅ render.yaml · apps/*/Dockerfile      P7  deployment (see docs/DEPLOYMENT.md)
└── turbo.json · pnpm-workspace.yaml · tsconfig.base.json
```

## Key decisions

| Decision | Why |
|---|---|
| **Monorepo with `packages/shared`** | VAT/discount maths, order statuses and phone normalisation must be identical on the price the customer sees and the amount we charge. One implementation, unit-tested once. |
| **NestJS API, separate from Next** | Webhooks, queues (BullMQ), ZATCA signing and virus scanning are long-running/back-office concerns; a dedicated API keeps them out of the edge runtime and gives Swagger docs for free. |
| **Money as integer halalas** | No float drift. VAT is computed on the service fee only and rounded once (see `pricing.ts`). |
| **Price snapshots on `Order` / `OrderTraveler`** | Catalog prices change; invoices and refunds must reflect what the customer accepted. |
| **`PriceRule` (service × applicant type × nationality)** | "Saudi" vs "resident of nationality X" changes both eligibility and embassy fee — this is the visa-finder's core query. |
| **`Document` + `OrderDocument`** | One passport scan in the vault can be reused across orders; review status is per order. |
| **Encrypted PII + blind index** | Passport/ID numbers are AES-GCM ciphertext; an HMAC column allows exact lookups without decrypting. |
| **Append-only `Consent`, `AuditLog`, `Invoice`** | PDPL evidence, staff accountability, and ZATCA's "never edit an issued invoice" rule. |
| **Arabic at `/`, English at `/en`, no auto-detect** | Arabic-first brand; many Saudi users run English-language phones but still expect the Arabic site. |
| **Website reads the API with a build-time fallback** | The admin changes prices without a deploy (tag revalidation), yet a down API never breaks a build or a page: the shared catalog is the floor. |
| **Browser → Next → API proxy (`/api/v1/*`)** | Auth cookies stay first-party; no CORS in the browser path; one origin to protect with CSRF checks. |
| **Zod schemas shared by API DTOs and admin forms** | One definition of "valid" (e.g. visa-free ⇒ no fee, publish ⇒ consent) enforced on both sides. |
| **Refresh-token families** | Rotation on every refresh; replaying an old token revokes the whole chain (stolen-token detection). |
| **Direct-to-storage uploads** | Files never pass through the API: it signs a PUT bound to the exact type and size, verifies the object, then a queue worker hashes and virus-scans it. Keeps the API small and uploads fast on phones. |
| **Domain events between orders, payments and notifications** | Payments only report what happened; orders own the state machine; notifications react to status changes. Each can change without touching the others. |
| **Invoices issued under a Postgres advisory lock** | ZATCA's invoice counter (ICV) and previous-invoice-hash chain must never fork, even with several API instances; one lock serialises issuing and the order's invoice is idempotent. |
| **The state machine is shared and enforced twice** | `staffTransitions()` drives the admin buttons and drag targets *and* the API's refusal; the UI can't offer a move the API would reject. Optimistic `updateMany … where status = from` makes two agents racing on one order safe. |
| **CSS for first-paint motion, JS for the rest** | Entrances above the fold are CSS keyframes, so content paints before hydration (LCP); scroll-driven and interactive motion stays in Framer Motion. |
| **CSP without third-party scripts** | No analytics/tag managers in the page; inline scripts are Next's own bootstrap. Uploads may only go to the configured storage origin. |
| **Refunds produce credit notes, never edits** | ZATCA forbids changing an issued invoice: each refund gets a 381 credit note on the same hash chain, referencing the original. |
| **Public tracking never confirms an order exists** | A wrong number/phone pair answers exactly like a right one but sends no SMS; a successful check returns a read-only token scoped to one order, with no names, documents or prices. |
| **Webhook bodies are hints, not truth** | Every payment webhook is stored once and then confirmed by asking the gateway's API, so a forged or replayed webhook can't mark an order paid. |
