# Visa & Travel Services Platform — Full Build Prompt

You are a senior full-stack engineer and a world-class product designer. We are building a complete, production-grade web platform from scratch: a premium travel-documents & visa services platform for the Saudi/Gulf market. Design quality is the #1 priority — the client must be genuinely impressed the first second they land. Do NOT produce anything that looks like a generic template, a WordPress theme, or a typical "AI-generated" landing page.

## 1. Brand
- Brand name: [BRAND NAME — Arabic + English]
- Market: Saudi Arabia (serving Saudi citizens and residents), expandable to GCC.
- Positioning: the most transparent, fastest, and most trustworthy visa & travel-docs service. Calm, confident, premium — like a private concierge, not a travel agency flyer.
- This is an original brand. Do not copy names, logos, copy, or layouts from any existing competitor.

## 2. Design direction (critical)
- Aesthetic: "editorial luxury travel" — generous whitespace, strong typographic hierarchy, restrained color, subtle motion, real depth (soft layered shadows, glass only where meaningful).
- Palette (define as CSS variables / Tailwind tokens, with full dark mode):
  - Ink navy (primary text / dark sections) ~ `#0B1B2B`
  - Warm sand/ivory background ~ `#F7F3EC`
  - Accent: muted desert gold ~ `#C8A24A` (used sparingly for CTAs and highlights)
  - Secondary accent: deep teal ~ `#0F5E5A`
  - Semantic: success, warning, danger, info — all accessible (WCAG AA contrast minimum).
- Typography: Arabic-first. Use "IBM Plex Sans Arabic" for UI/body and "Alexandria" (or "Readex Pro") for display headings; Latin pairs: "Inter" body + "Fraunces" or "Instrument Serif" for English display. Fluid type scale with `clamp()`.
- Layout: RTL-first, mirrored perfectly for LTR. Mobile-first — most users are on phones. No horizontal scroll ever.
- Motion: Framer Motion. Subtle, purposeful: staggered reveals on scroll, smooth step transitions in the wizard, number counters, magnetic hover on primary CTAs. Respect `prefers-reduced-motion`.
- Visual signature elements:
  - Hero with an interactive 3D-feel globe or animated route lines between Riyadh and destinations (lightweight — SVG/Canvas or react-globe.gl, lazy-loaded).
  - "Passport stamp" micro-illustrations as a recurring motif.
  - Destination cards with high-quality imagery, country flag, processing time, and "from" price.
  - Order-tracking timeline styled like a boarding pass.
- Iconography: Lucide or Phosphor, consistent stroke.
- Every page must have polished empty, loading (skeletons), and error states.

## 3. Pages (public site)
1. **Home**: hero with a smart search ("I am [Saudi / Resident of nationality X] traveling to [country] for [tourism/study/medical/business]") → instant result card; trust bar (stats, payment logos, commercial registration badge); popular destinations; services grid; how it works (4 steps); transparent pricing explainer; testimonials; FAQ; final CTA.
2. **Visa Finder / Eligibility Checker**: filters by nationality, residency, destination, purpose → shows requirements, documents, embassy fee vs service fee (separated, never hidden), processing time, appointment availability note.
3. **Destination page** (dynamic, per country): overview, visa types, requirements checklist, fees breakdown, timeline, FAQs, related insurance, CTA to apply. SEO-optimized with JSON-LD.
4. **Services**: Visas (tourist, study, medical, business, domestic workers, e-visas), Travel Insurance (Schengen/Turkey, Georgia, USA/Canada, Worldwide), International Driving License, Certified Translation, Document Shipping.
5. **Apply flow** (multi-step wizard): service selection → traveler(s) details (support families/groups) → document upload (drag & drop, camera capture on mobile, passport photo validation guide) → appointment preference → review → payment → confirmation.
6. **Pricing page** — fully transparent.
7. **Track Order** (public, by order number + phone OTP).
8. **Blog / Travel guides** (MDX or CMS).
9. **About, Contact** (map, WhatsApp, phone, email, full address), **Terms, Refund Policy, Privacy Policy** (PDPL compliant).

## 4. Client dashboard
- Phone OTP login (+ optional email/Google).
- My orders with status timeline (Received → Documents Review → Appointment Booked → Submitted to Embassy → Decision → Delivered).
- Upload missing documents, chat/messages with the agent, notifications.
- Saved travelers (family members), saved documents vault (encrypted).
- Invoices (ZATCA-compliant e-invoices, PDF download).

## 5. Admin / Operations panel
- Dashboard KPIs (orders, revenue, conversion, SLA breaches) with charts.
- Order management: kanban + table views, assign to agent, internal notes, status changes that auto-notify the client.
- Document review with approve/reject + reason.
- Services & pricing CMS: countries, visa types, requirements, embassy fees, service fees, processing times — all editable without code.
- Coupons & promotions, customers CRM, roles & permissions (Super Admin, Manager, Agent, Accountant), audit log.
- Content management for blog, FAQs, testimonials.

## 6. Tech stack
- **Frontend**: Next.js 15 (App Router) + TypeScript (strict), Tailwind CSS v4, shadcn/ui (heavily customized to the brand — not the default look), Framer Motion, next-intl (ar default, en), React Hook Form + Zod, TanStack Query.
- **Backend**: NestJS (TypeScript) REST API with OpenAPI/Swagger docs — OR Next.js route handlers + server actions if you justify it. Prefer NestJS for clean separation.
- **Database**: PostgreSQL + Prisma ORM. Redis for caching, rate limiting and queues (BullMQ).
- **Auth**: phone OTP (SMS provider: Unifonic or Taqnyat), JWT access + refresh tokens with httpOnly cookies, RBAC.
- **Payments**: Moyasar or Tap Payments (Mada, Visa, Mastercard, Apple Pay, STC Pay) with webhooks and idempotency.
- **File storage**: S3-compatible (AWS S3 / Cloudflare R2), signed URLs, virus scanning, server-side encryption.
- **Notifications**: WhatsApp Business API, SMS, transactional email (Resend), in-app.
- **Invoicing**: ZATCA Phase 2 compatible e-invoice generation (QR code).
- **Observability**: Sentry, structured logging, health checks.
- **DevOps**: Docker + docker-compose for local, environment-based config, CI with GitHub Actions (lint, typecheck, tests, build). Deploy targets: Vercel (frontend) + Railway/Render/AWS (API + DB).

## 7. Quality bar
- Lighthouse 95+ on performance, accessibility, best practices, SEO (mobile).
- Full SEO: metadata per page, sitemap, robots, hreflang ar/en, OpenGraph images, JSON-LD (Organization, Service, FAQPage, BreadcrumbList).
- Security: input validation everywhere (Zod/class-validator), rate limiting, CSRF protection, secure headers, encrypted PII, audit logs, PDPL (Saudi Personal Data Protection Law) consent handling.
- Tests: unit tests for business logic, e2e (Playwright) for the apply + payment flows.
- Clean architecture, typed end to end, no `any`, meaningful folder structure, README with setup steps, seed script with realistic sample data (at least 15 destinations).

## 8. Trust & transparency (our competitive edge)
- Always show the price split: embassy/government fee vs our service fee.
- Clear, fair refund policy page, and display the policy summary before payment.
- Show commercial registration number, VAT number, real address, and verified badges in the footer.
- Real-time WhatsApp support button with estimated response time.

## 9. How to work
Build in phases and stop after each phase for my review:
- **Phase 1**: Design system (tokens, typography, components, dark mode, RTL) + a style-guide page.
- **Phase 2**: Public website (home, visa finder, destination pages, services, static pages).
- **Phase 3**: Backend foundation (DB schema, auth, services/pricing API, admin CMS).
- **Phase 4**: Apply wizard + document upload + payments + notifications.
- **Phase 5**: Client dashboard + order tracking.
- **Phase 6**: Admin operations panel + reports.
- **Phase 7**: SEO, performance, security hardening, tests, deployment.

Start with Phase 1. Before writing code, give me: (a) the full folder structure for frontend and backend, (b) the Prisma database schema, (c) a short design rationale with the color and type system. Then build Phase 1.
