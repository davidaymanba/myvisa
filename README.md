# myvisa — ماي فيزا

Transparent visa & travel-documents platform for the Saudi market. Arabic-first, RTL, mobile-first.

**Status: all seven phases complete.** A bilingual (Arabic-first), motion-led website with a visa finder, destination pages and travel guides; an apply wizard with direct-to-storage uploads, virus scanning, payments and notifications; a customer account with order tracking, a family vault and ZATCA invoices; public tracking by order number; and an operations panel (order board and desk, refunds with credit notes, customers, coupons, team & roles, reports, content). Hardened (CSP, HSTS, encrypted PII, audit log), tested (unit, API e2e, Playwright) and ready to deploy — see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

> ⚠️ Before launch, replace the placeholders:
> - Catalog visa rules and fees are sample data that operations must verify.
> - Testimonials, ratings and headline stats are placeholders. Replace them with real ones.
> - The legal pages are drafts pending review by a Saudi-licensed lawyer.
> - CR, VAT and contact details are placeholders (edit them in Admin → Settings).

The full brief is in [`visa-platform-prompt.md`](visa-platform-prompt.md).

## Requirements

- Node ≥ 22, pnpm (the repo pins `pnpm@12`; `corepack enable` picks it up)
- Docker (Postgres, Redis, Mailpit)

## Getting started

```bash
cp .env.example .env                              # API, DB, docker compose
cp apps/web/.env.example apps/web/.env.local      # web
pnpm install                                      # also generates the Prisma client
pnpm infra:up                                     # postgres :5442 · redis :6390 · mailpit :8035 · S3 :9010
pnpm db:deploy && pnpm db:seed                    # schema + catalog + first SUPER_ADMIN
pnpm db:seed-demo                                 # optional: demo customer 0500000002 with a family, orders, chat, invoices
pnpm dev                                          # web :3100 and API :4100 (watch mode)
```

- Website: http://localhost:3100 (Arabic) · http://localhost:3100/en
- Admin: http://localhost:3100/admin/login — phone `0500000001` (super admin) or `0500000003` (demo agent, after `db:seed-demo`), dev code `000000`
- Apply: http://localhost:3100/apply — any Saudi mobile, code `000000`, payment through the local mock gateway
- Customer dashboard: http://localhost:3100/account — phone `0500000002` (after `db:seed-demo`), code `000000`
- Track an order: http://localhost:3100/track — order number + the phone on the order
- Emails (Mailpit): http://localhost:8035
- API docs (Swagger): http://localhost:4100/docs · health: http://localhost:4100/health
- Design system: http://localhost:3100/style-guide

## Scripts (from the repo root)

| Command | What it does |
|---|---|
| `pnpm dev` | Web + API in watch mode |
| `pnpm build` | Production build (web + API) |
| `pnpm typecheck` · `pnpm lint` | Every package |
| `pnpm test` | Unit tests: shared business rules, OTP, SMS adapters, price-rule resolution, env |
| `pnpm test:browser` | Playwright: apply → pay → account → track, admin desk, public pages + SEO + security headers (needs the stack running; `CHROME_PATH` to use a local Chrome) |
| `pnpm test:e2e` | API e2e (supertest) against the disposable `myvisa_test` database and S3 bucket: auth, catalog, orders + uploads, payments, notifications, account (invoices, messages, tracking, family, vault, resubmit), admin operations (queue, state machine, review, refunds + credit notes, coupons, customers, staff, reports) |
| `pnpm infra:up` / `infra:down` | Docker services |
| `pnpm db:migrate` | Create/apply a migration in development |
| `pnpm db:deploy` · `db:seed` · `db:reset` | Apply migrations · load the shared catalog · wipe and re-migrate |
| `pnpm db:seed-demo` | Demo customer (0500000002) with saved family, four orders at different stages, an agent conversation, notifications and invoices. Runs once. |
| `pnpm db:validate` | Validate the Prisma schema |
| `pnpm visual-tour <url> <prefix>` · `pnpm admin-tour <base> <dir>` · `pnpm apply-tour <base> <dir>` · `pnpm account-tour <base> <dir>` | Screenshot QA (public pages / signed-in admin / the whole apply flow / the customer dashboard and public tracking) |

## Layout

```
apps/web          Next.js 15 — public site + guides (/blog), apply wizard (/apply), tracking (/track), customer account (/account), operations panel (/admin)
apps/api          NestJS 12 REST API (/api/v1, Swagger at /docs)
packages/shared   pricing, money, phone, RBAC, settings, API contracts (Zod), catalog, legal content
packages/db       Prisma 7 schema, migrations, client factory, seed
e2e/              Playwright browser tests (playwright.config.ts at the root)
docs/             ARCHITECTURE.md · DESIGN.md · DEPLOYMENT.md · HANDOFF.md
.github/          CI: lint · typecheck · tests · audit · build · API e2e · Playwright · Docker images
```

More detail:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): full folder structure, including the planned NestJS API, and the reasoning behind it.
- [docs/DESIGN.md](docs/DESIGN.md): colour, type, motion, and the signature elements.
