# myvisa — ماي فيزا

Transparent visa & travel-documents platform for the Saudi market. Arabic-first, RTL, mobile-first.

**Status: Phase 3 complete.** On top of the public website (Phase 2) and design system (Phase 1) there is now a NestJS API (phone-OTP auth, RBAC, catalog/pricing, settings, contact inbox, PDPL consents, audit log), a PostgreSQL database seeded from the shared catalog, and an admin CMS at `/admin`. The site reads from the API and falls back to the shared catalog when it is down.

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
pnpm infra:up                                     # postgres :5442 · redis :6390 · mailpit :8035
pnpm db:deploy && pnpm db:seed                    # schema + catalog + first SUPER_ADMIN
pnpm dev                                          # web :3100 and API :4100 (watch mode)
```

- Website: http://localhost:3100 (Arabic) · http://localhost:3100/en
- Admin: http://localhost:3100/admin/login — phone `0500000001`, dev code `000000` (printed in the API log)
- API docs (Swagger): http://localhost:4100/docs · health: http://localhost:4100/health
- Design system: http://localhost:3100/style-guide

## Scripts (from the repo root)

| Command | What it does |
|---|---|
| `pnpm dev` | Web + API in watch mode |
| `pnpm build` | Production build (web + API) |
| `pnpm typecheck` · `pnpm lint` | Every package |
| `pnpm test` | Unit tests: shared business rules, OTP, SMS adapters, price-rule resolution, env |
| `pnpm test:e2e` | API e2e (supertest) against the disposable `myvisa_test` database |
| `pnpm infra:up` / `infra:down` | Docker services |
| `pnpm db:migrate` | Create/apply a migration in development |
| `pnpm db:deploy` · `db:seed` · `db:reset` | Apply migrations · load the shared catalog · wipe and re-migrate |
| `pnpm db:validate` | Validate the Prisma schema |
| `pnpm visual-tour <url> <prefix>` · `pnpm admin-tour <base> <dir>` | Screenshot QA (public pages / signed-in admin) |

## Layout

```
apps/web          Next.js 15 — public site, admin CMS (/admin); dashboard comes in Phase 5
apps/api          NestJS 12 REST API (/api/v1, Swagger at /docs)
packages/shared   pricing, money, phone, RBAC, settings, API contracts (Zod), catalog, legal content
packages/db       Prisma 7 schema, migrations, client factory, seed
docs/             ARCHITECTURE.md · DESIGN.md
```

More detail:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): full folder structure, including the planned NestJS API, and the reasoning behind it.
- [docs/DESIGN.md](docs/DESIGN.md): colour, type, motion, and the signature elements.
