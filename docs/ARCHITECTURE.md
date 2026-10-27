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
│   │       │       ├── apply/            ⏳ P4  multi-step wizard (service → travellers → documents →
│   │       │       │                            appointment → review → payment → confirmation)
│   │       │       ├── track/            ⏳ P5  public tracking (order no. + phone OTP)
│   │       │       ├── (account)/        ⏳ P5  login (OTP), orders, orders/[id], travellers, vault,
│   │       │       │                            invoices, messages, notifications, settings
│   │       │       └── admin/            ⏳ P6  dashboard, orders (kanban/table), documents review,
│   │       │                                    catalog (countries, services, price rules, requirements),
│   │       │                                    coupons, customers, content, staff & roles, audit log
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
│   │       │   └── wizard/ tracking/ admin/   ⏳ P4–P6
│   │       ├── i18n/                     ✅ routing, navigation, request config
│   │       ├── messages/{ar,en}.json     ✅ type-checked keys (src/global.d.ts)
│   │       ├── lib/                      ✅ cn(); ⏳ api client (typed from OpenAPI), auth helpers, seo
│   │       └── middleware.ts             ✅ locale routing; ⏳ auth guard for (account)/admin
│   │
│   └── api/                              ⏳ P3  NestJS REST API (OpenAPI at /docs)
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
│       │       ├── invoices/             ZATCA Phase 2: XML (UBL 2.1), hash chain, QR TLV, PDF, reporting
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
│   └── db/                               ✅ Prisma 7 schema (35 models) + prisma.config.ts
│       └── prisma/ schema.prisma · ⏳ migrations/ · ⏳ seed.ts (15+ destinations, P3)
│
├── docs/                                 ✅ ARCHITECTURE.md · DESIGN.md
├── ⏳ docker-compose.yml                  P3  postgres 17, redis 7, mailpit, clamav
├── ⏳ .github/workflows/ci.yml            P7  lint · typecheck · test · build · playwright
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
