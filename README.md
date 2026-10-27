# myvisa — ماي فيزا

Transparent visa & travel-documents platform for the Saudi market. Arabic-first, RTL, mobile-first.

**Status: Phase 2 complete.** The public website is built: home, destinations (20), visa finder, services, pricing, about, contact and legal pages, in Arabic and English. Phase 1 delivered the design system, the Prisma schema and the shared business logic.

> ⚠️ Before launch, replace the placeholders:
> - Catalog visa rules and fees are sample data that operations must verify.
> - Testimonials, ratings and headline stats are placeholders. Replace them with real ones.
> - The legal pages are drafts pending review by a Saudi-licensed lawyer.
> - CR, VAT and contact details are placeholders (`apps/web/src/lib/company.ts`).

The full brief is in [`visa-platform-prompt.md`](visa-platform-prompt.md).

## Requirements

- Node ≥ 22
- pnpm 10+ (the repo pins `pnpm@12`; `corepack enable` picks it up)

## Getting started

```bash
pnpm install
pnpm dev                 # web on http://localhost:3100
```

- Arabic (default): http://localhost:3100
- English: http://localhost:3100/en
- Design system: http://localhost:3100/style-guide

## Scripts (from the repo root)

| Command | What it does |
|---|---|
| `pnpm dev` | Run all apps in dev mode |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` in every package |
| `pnpm lint` | ESLint |
| `pnpm test` | Unit tests (Vitest): pricing, phone, order status, catalog integrity, visa matching |
| `pnpm db:validate` | Validate the Prisma schema (no database needed) |
| `pnpm --filter @myvisa/web flags:sync` | Re-copy flag SVGs into `apps/web/public/flags` |
| `pnpm --filter @myvisa/web globe:build` | Regenerate the globe's land-dot data |

## Layout

```
apps/web          Next.js 15 — public site (done), dashboard and admin (Phases 5–6)
packages/shared   pricing, money, phone, order status, catalog, legal content (used by web and API)
packages/db       Prisma schema
docs/             ARCHITECTURE.md · DESIGN.md
```

More detail:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): full folder structure, including the planned NestJS API, and the reasoning behind it.
- [docs/DESIGN.md](docs/DESIGN.md): colour, type, motion, and the signature elements.
