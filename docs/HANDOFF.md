# Handoff — start of Phase 3 (backend foundation)

Read this first in a new session, then `visa-platform-prompt.md` (the brief), `docs/ARCHITECTURE.md` and `docs/DESIGN.md`.

## Where we are (2026-10-27)

| Phase | Status |
|---|---|
| 1 — Design system, Prisma schema, shared logic | ✅ done |
| 2 — Public website (ar/en), redesigned bold and motion-led at the client's request | ✅ done, approved to move on |
| **3 — Backend foundation** | **⏭ next** |
| 4–7 | not started |

Green as of handoff: `pnpm typecheck`, `pnpm lint`, `pnpm test` (47 tests), `pnpm build` (every page SSG), `pnpm db:validate`. Not a git repo yet; ask the user before running `git init` or committing.

## Working agreements with the client

- They write in Egyptian Arabic. Reply in Egyptian Arabic and keep code and technical terms in English.
- **Design is the top priority.** They want a very distinctive, animated design, never generic. Every new screen, including admin, should feel like the public site. Keep reduced-motion support and correct RTL.
- Stop after each phase for their review. Don't roll into Phase 4.
- Verify UI with screenshots before reporting: run `pnpm build && pnpm --filter @myvisa/web start`, then `pnpm visual-tour http://localhost:3100/ shot 1440 light 900 20` and read the PNGs. Port 3000 on this machine belongs to another app, so ours uses 3100.

## Phase 3 scope (from the brief)

"DB schema, auth, services/pricing API, admin CMS". Concretely:

1. **Infra.** Add a `docker-compose.yml` with Postgres 17, Redis 7, Mailpit, and ClamAV (optional). Add `.env.example` files. Make config typed with Zod.
2. **`apps/api` (NestJS).** The module layout is already planned in `docs/ARCHITECTURE.md`. Include:
   - Swagger at `/docs`
   - helmet and CORS
   - a global ValidationPipe (or Zod pipes)
   - problem+json errors
   - pino logging
   - health checks
   - Sentry hook (no-op until a DSN is set)
3. **Database.** Use Prisma 7 (`packages/db`, `prisma.config.ts`, generator `prisma-client`, which needs a driver adapter such as `@prisma/adapter-pg`). Write the first migration. Write `seed.ts` from the **existing shared catalog** (`DESTINATIONS`, `NATIONALITIES`, `SERVICE_CATEGORIES`, `INSURANCE_PLANS`, `LEGAL_DOCUMENTS`, company settings in `apps/web/src/lib/company.ts`) so the DB and the site start identical.
4. **Auth.**
   - Phone OTP with an SMS provider adapter (Unifonic or Taqnyat). Use a console provider in dev.
   - Store the OTP hashed, with attempt limits and rate limiting in Redis.
   - JWT access token plus rotating refresh token in httpOnly cookies, with family revocation on reuse (see the `Session` model).
   - RBAC roles: CUSTOMER, AGENT, ACCOUNTANT, MANAGER, SUPER_ADMIN. Define the permission matrix in code.
   - CSRF protection for cookie auth.
5. **Catalog/pricing API.** Public read endpoints for destinations, visas, the finder query (`matchVisa`/`pickVisa` semantics from `packages/shared/src/catalog/helpers.ts`), services and pricing. Admin CRUD for countries, services, price rules, requirements, FAQs and settings.
6. **Audit.** An interceptor writes `AuditLog` for every staff mutation. Add a PDPL `Consent` ledger endpoint.
7. **Admin CMS UI** in `apps/web/src/app/[locale]/admin` (protected by middleware):
   - login with OTP
   - catalog editor (countries, visas, price rules with a live `PriceBreakdown` preview, requirements)
   - settings editor (company info, WhatsApp ETA, refund-policy version)
8. **Wire the website to the API**, falling back to the shared catalog at build time:
   - destinations, finder and pricing read from the API (ISR / `revalidateTag`)
   - the contact form posts for real
   - testimonials come from the `Testimonial` table
   - the blog (MDX in `BlogPost`) can land here with the CMS
9. **Tests.** Unit tests for auth, OTP and price rules. E2E for the API with supertest against a disposable DB.

**Ask the user before starting:** which SMS provider to use (Unifonic or Taqnyat). Assume console/dev mode until they have credentials. Payments (Moyasar or Tap) belong to Phase 4.

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
- CR number, VAT number, phone and address are placeholders in `apps/web/src/lib/company.ts`.
