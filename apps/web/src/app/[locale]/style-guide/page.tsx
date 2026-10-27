import { sar } from "@myvisa/shared";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarCheck,
  Camera,
  CreditCard,
  FileText,
  Globe,
  GraduationCap,
  Landmark,
  Languages,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Phone,
  Plane,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Stamp,
  Stethoscope,
  Truck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { use, type ReactNode } from "react";
import { DestinationCard } from "@/components/brand/destination-card";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { Logo } from "@/components/brand/logo";
import { PassportStamp } from "@/components/brand/passport-stamp";
import { PriceBreakdown } from "@/components/brand/price-breakdown";
import { RouteArcs } from "@/components/brand/route-arcs";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { TrustBar } from "@/components/brand/trust-bar";
import { WhatsAppButton } from "@/components/brand/whatsapp-button";
import { Counter } from "@/components/motion/counter";
import { Reveal } from "@/components/motion/reveal";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { AccordionDemo, DialogDemo, TabsDemo, TooltipDemo } from "./_components/overlays-demo";
import { LoadingButtonDemo, ProgressDemo, SkeletonDemo, StatesDemo, ToastDemo } from "./_components/feedback-demo";
import { FormsDemo } from "./_components/forms-demo";
import { CountersDemo, MagneticDemo, StaggerDemo } from "./_components/motion-demo";
import { BoardingPassDemo, StepperDemo } from "./_components/signature-demo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "ar" | "en", namespace: "styleGuide" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

// Placeholder support number & legal IDs — replaced by admin Settings in Phase 3.
const SUPPORT_WHATSAPP = "+966500000000";

export default function StyleGuidePage({ params }: { params: Promise<{ locale: "ar" | "en" }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("styleGuide");

  return (
    <>
      <TopBar />
      <main id="main">
        <Hero />
        <Section id="color" n="01" title={t("sections.color.title")} desc={t("sections.color.desc")}>
          <ColorSection />
        </Section>
        <Section id="type" n="02" title={t("sections.type.title")} desc={t("sections.type.desc")}>
          <TypeSection />
        </Section>
        <Section id="space" n="03" title={t("sections.space.title")} desc={t("sections.space.desc")}>
          <SpaceSection />
        </Section>
        <Section id="motion" n="04" title={t("sections.motion.title")} desc={t("sections.motion.desc")}>
          <MotionSection />
        </Section>
        <Section id="components" n="05" title={t("sections.buttons.title")} desc={t("sections.buttons.desc")}>
          <ButtonsSection />
        </Section>
        <Section id="forms" n="06" title={t("sections.forms.title")} desc={t("sections.forms.desc")}>
          <FormsDemo />
        </Section>
        <Section id="feedback" n="07" title={t("sections.feedback.title")} desc={t("sections.feedback.desc")}>
          <FeedbackSection />
        </Section>
        <Section id="overlays" n="08" title={t("sections.overlays.title")} desc={t("sections.overlays.desc")}>
          <OverlaysSection />
        </Section>
        <Section id="signature" n="09" title={t("sections.signature.title")} desc={t("sections.signature.desc")}>
          <SignatureSection />
        </Section>
        <Section id="icons" n="10" title={t("sections.icons.title")} desc={t("sections.icons.desc")}>
          <IconsSection />
        </Section>
      </main>
      <footer className="border-t border-border">
        <div className="container-page flex flex-col items-start justify-between gap-4 py-10 pb-28 sm:flex-row sm:items-center">
          <Logo withArabic />
          <p className="text-caption text-muted-foreground">{t("footer")}</p>
        </div>
      </footer>
      <WhatsAppButton phone={SUPPORT_WHATSAPP} etaMinutes={5} />
    </>
  );
}

/* ─────────────────────────── Layout pieces ─────────────────────────── */

function TopBar() {
  const t = useTranslations("styleGuide.nav");
  const links = [
    ["color", t("color")],
    ["type", t("type")],
    ["space", t("space")],
    ["motion", t("motion")],
    ["components", t("components")],
    ["signature", t("signature")],
  ] as const;
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo withArabic />
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-full px-3.5 py-2 text-body-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle className="max-sm:hidden" />
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const t = useTranslations("styleGuide.hero");
  const tm = useTranslations("styleGuide.motion");
  return (
    <section className="container-page pt-12 pb-16 sm:pt-20 sm:pb-24">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <Reveal className="lg:col-span-8">
          <p className="eyebrow mb-6 flex items-center gap-3 text-accent-text">
            <span className="h-px w-8 bg-current" aria-hidden />
            {t("overline")}
          </p>
          <h1 className="text-display-2xl">{t("title")}</h1>
        </Reveal>
        <Reveal delay={0.12} className="flex flex-col gap-7 lg:col-span-4 lg:pb-3">
          <p className="text-body-lg text-muted-foreground">{t("lead")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <MagneticDemo label={t("ctaPrimary")} />
            <Button variant="link" asChild>
              <a href="#components">{t("ctaSecondary")}</a>
            </Button>
          </div>
        </Reveal>
      </div>

      {/* Inverse panel: `.dark` re-scopes every semantic token, so children need no special-casing. */}
      <Reveal delay={0.2} className="dark relative mt-14 overflow-hidden rounded-[2rem] bg-inverse text-foreground shadow-lg ring-1 ring-white/[0.06] sm:mt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,rgb(15_94_90/0.35),transparent_60%)]" aria-hidden />
        {/* Map + stamps share one box so stamp offsets are relative to the map, which never mirrors in RTL. */}
        <div className="relative">
          <RouteArcs />
          <div className="pointer-events-none absolute left-[3%] top-[40%] w-[17%] min-w-20">
            <PassportStamp animated shape="circle" tone="gold" top={t("stampTop")} bottom={t("stampBottom")} code="RUH" caption="27·10·26" rotate={-10} className="w-full" />
          </div>
          <div className="pointer-events-none absolute left-[23%] top-[52%] w-[20%] min-w-24 max-sm:hidden">
            <PassportStamp animated shape="rect" tone="teal" top={t("stampApproved")} bottom="SCHENGEN · C" code="CDG" caption="90 DAYS" rotate={6} seed={11} className="w-full" />
          </div>
        </div>
        <dl className="relative grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
          {[
            { v: 12480, l: tm("stats.visas") },
            { v: 40, s: "+", l: t("statDestinations") },
            { v: 4.9, s: "/5", d: 1, l: tm("stats.rating") },
            { v: 5, l: tm("stats.reply") },
          ].map((s) => (
            <div key={s.l} className="flex flex-col gap-1 bg-inverse px-5 py-4 sm:px-7 sm:py-5">
              <dd className="font-display text-display-md text-foreground">
                <Counter value={s.v} suffix={s.s} fractionDigits={s.d} />
              </dd>
              <dt className="text-caption text-muted-foreground">{s.l}</dt>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}

function Section({ id, n, title, desc, children }: { id: string; n: string; title: string; desc: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-border">
      <div className="container-page py-16 sm:py-24">
        <Reveal className="mb-10 grid gap-4 sm:mb-14 lg:grid-cols-12 lg:gap-8">
          <span lang="en" className="eyebrow tabular text-accent-text lg:col-span-2 lg:pt-4">
            {n}
          </span>
          <h2 id={`${id}-title`} className="text-display-lg lg:col-span-6">
            {title}
          </h2>
          <p className="text-body text-muted-foreground lg:col-span-4 lg:pt-3">{desc}</p>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

function SubHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="font-sans text-title font-semibold">{children}</h3>
      {aside && <span className="text-caption text-muted-foreground">{aside}</span>}
    </div>
  );
}

/* ─────────────────────────── 01 Color ─────────────────────────── */

const PALETTES = [
  { key: "ink", base: 900 },
  { key: "sand", base: 100 },
  { key: "gold", base: 400 },
  { key: "teal", base: 500 },
] as const;
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
const HEX: Record<(typeof PALETTES)[number]["key"], Record<number, string>> = {
  ink: { 50: "#F2F5F8", 100: "#E3E9EF", 200: "#C6D1DC", 300: "#9AABBC", 400: "#6E8399", 500: "#4F6378", 600: "#3A4D61", 700: "#29394B", 800: "#1A2A3B", 900: "#0B1B2B" },
  sand: { 50: "#FCFAF6", 100: "#F7F3EC", 200: "#EFE8DC", 300: "#E2D7C4", 400: "#CDBEA4", 500: "#AF9C7E", 600: "#8C7A5E", 700: "#685A45", 800: "#463C2E", 900: "#2A241B" },
  gold: { 50: "#FBF7EC", 100: "#F5EBCF", 200: "#EBD7A1", 300: "#DDBF72", 400: "#C8A24A", 500: "#B08A35", 600: "#94722A", 700: "#7A5D1C", 800: "#5A4415", 900: "#3B2C0E" },
  teal: { 50: "#EAF4F3", 100: "#CCE5E2", 200: "#9CCBC6", 300: "#5FB3AC", 400: "#2C8780", 500: "#0F5E5A", 600: "#0C4F4C", 700: "#0A403D", 800: "#07302E", 900: "#042120" },
};

const SEMANTIC = [
  ["background", "bg-background"],
  ["surface", "bg-surface"],
  ["muted", "bg-muted"],
  ["foreground", "bg-foreground"],
  ["primary", "bg-primary"],
  ["secondary", "bg-secondary"],
  ["accent-text", "bg-accent-text"],
  ["border-strong", "bg-border-strong"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["danger", "bg-danger"],
  ["info", "bg-info"],
] as const;

const CONTRAST = [
  { fg: "#0B1B2B", bg: "#F7F3EC", ratio: 16.2, use: "Ink / Sand" },
  { fg: "#0B1B2B", bg: "#C8A24A", ratio: 7.23, use: "Ink / Gold button" },
  { fg: "#7A5D1C", bg: "#F7F3EC", ratio: 5.57, use: "Gold-700 text / Sand" },
  { fg: "#0F5E5A", bg: "#F7F3EC", ratio: 6.86, use: "Teal / Sand" },
  { fg: "#4F6378", bg: "#F7F3EC", ratio: 5.6, use: "Muted / Sand" },
  { fg: "#C8A24A", bg: "#F7F3EC", ratio: 2.18, use: "Gold text / Sand" },
] as const;

function ColorSection() {
  const t = useTranslations("styleGuide.color");
  return (
    <div className="flex flex-col gap-14">
      <div>
        <SubHeading>{t("brand")}</SubHeading>
        <div className="flex flex-col gap-6">
          {PALETTES.map(({ key, base }) => (
            <div key={key} className="grid gap-3 md:grid-cols-[8rem_1fr] md:items-center">
              <span className="text-body-sm font-medium">
                {t(`names.${key}`)} <span lang="en" className="text-muted-foreground">· {HEX[key][base]}</span>
              </span>
              <ul className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                {STEPS.map((step) => (
                  <li key={step} className="flex flex-col gap-1.5">
                    <span
                      className={`relative h-14 rounded-lg shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)] ${step === base ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                      style={{ background: HEX[key][step] }}
                    />
                    <span lang="en" className="tabular flex justify-between text-[0.6875rem] text-muted-foreground">
                      <span>{step}</span>
                      <span className="max-sm:hidden">{HEX[key][step]?.slice(1)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <SubHeading>{t("semantic")}</SubHeading>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SEMANTIC.map(([name, cls]) => (
              <li key={name} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5">
                <span className={`size-9 shrink-0 rounded-lg shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] ${cls}`} />
                <code lang="en" className="truncate text-caption">
                  {name}
                </code>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SubHeading>{t("contrast")}</SubHeading>
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
            {CONTRAST.map((c) => {
              const tone = c.ratio >= 4.5 ? "success" : c.ratio >= 3 ? "warning" : "danger";
              return (
                <li key={c.use} className="flex items-center gap-3 px-4 py-3">
                  <span lang="en" className="grid h-9 w-12 shrink-0 place-items-center rounded-lg text-body font-semibold" style={{ color: c.fg, background: c.bg }}>
                    Aa
                  </span>
                  <span lang="en" className="flex-1 text-body-sm">
                    {c.use}
                  </span>
                  <span lang="en" className="tabular text-body-sm font-medium">
                    {c.ratio.toFixed(2)}:1
                  </span>
                  <Badge tone={tone} className="max-sm:hidden">
                    {tone === "success" ? t("pass") : tone === "warning" ? t("largeOnly") : t("fail")}
                  </Badge>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-caption text-muted-foreground">{t("contrastNote")}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── 02 Type ─────────────────────────── */

const SCALE = [
  ["display-2xl", "text-display-2xl", "44 → 84"],
  ["display-xl", "text-display-xl", "36 → 64"],
  ["display-lg", "text-display-lg", "30 → 48"],
  ["display-md", "text-display-md", "24 → 34"],
  ["heading", "text-heading", "20 → 24"],
  ["title", "text-title", "18"],
  ["body-lg", "text-body-lg", "17 → 19"],
  ["body", "text-body", "16"],
  ["body-sm", "text-body-sm", "14"],
  ["caption", "text-caption", "13"],
] as const;

function TypeSection() {
  const t = useTranslations("styleGuide.type");
  const rules = t.raw("rules") as string[];
  return (
    <div className="flex flex-col gap-14">
      <div className="grid gap-5 lg:grid-cols-2">
        <article lang="ar" dir="rtl" className="flex flex-col justify-between gap-10 rounded-3xl border border-border bg-surface p-6 sm:p-8">
          <div className="flex items-baseline justify-between gap-3" dir="ltr">
            <span lang="en" className="text-caption text-muted-foreground">Alexandria · IBM Plex Sans Arabic</span>
            <span className="font-[family-name:var(--font-alexandria)] text-display-md text-accent-text">أبجد</span>
          </div>
          <p className="font-[family-name:var(--font-alexandria)] text-display-lg leading-[1.3] font-medium">{t("displayAr")}</p>
          <p className="font-[family-name:var(--font-plex-arabic)] text-body-lg leading-[1.85] text-muted-foreground">{t("bodyAr")}</p>
        </article>
        <article lang="en" dir="ltr" className="flex flex-col justify-between gap-10 rounded-3xl border border-border bg-surface p-6 sm:p-8">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-caption text-muted-foreground">Instrument Serif · Inter</span>
            <span className="font-[family-name:var(--font-instrument)] text-display-md text-accent-text italic">Aa</span>
          </div>
          <p className="font-[family-name:var(--font-instrument)] text-display-lg leading-[1.05] tracking-[-0.02em]">{t("displayEn")}</p>
          <p className="font-[family-name:var(--font-inter)] text-body-lg leading-[1.6] text-muted-foreground">{t("bodyEn")}</p>
        </article>
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <SubHeading>{t("scale")}</SubHeading>
          <ul className="divide-y divide-border border-y border-border">
            {SCALE.map(([name, cls, px]) => (
              <li key={name} className="grid grid-cols-[6.5rem_1fr] items-baseline gap-4 py-4 sm:grid-cols-[8rem_5rem_1fr]">
                <code lang="en" className="text-caption text-muted-foreground">
                  {name}
                </code>
                <span lang="en" className="tabular text-caption text-muted-foreground max-sm:hidden">
                  {px}px
                </span>
                <span className={`${cls} ${cls.includes("display") ? "font-display" : ""} min-w-0`}>
                  {cls.includes("display") ? t("sampleShort") : t("sample")}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-4">
          <SubHeading>{t("arabicFirst")}</SubHeading>
          <ol className="flex flex-col gap-4">
            {rules.map((r, i) => (
              <li key={r} className="flex gap-3 text-body-sm">
                <span lang="en" className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-muted text-caption font-semibold">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── 03 Space ─────────────────────────── */

function SpaceSection() {
  const t = useTranslations("styleGuide.space");
  const spacing = [1, 2, 3, 4, 6, 8, 12, 16, 24];
  const radii = [
    ["sm", "rounded-sm", 8],
    ["md", "rounded-md", 12],
    ["lg", "rounded-lg", 16],
    ["xl", "rounded-xl", 20],
    ["2xl", "rounded-2xl", 28],
    ["full", "rounded-full", 999],
  ] as const;
  const shadows = [
    ["xs", "shadow-xs"],
    ["sm", "shadow-sm"],
    ["md", "shadow-md"],
    ["lg", "shadow-lg"],
    ["gold", "shadow-gold"],
  ] as const;
  return (
    <div className="grid gap-12 lg:grid-cols-3">
      <div>
        <SubHeading>{t("spacing")}</SubHeading>
        <ul className="flex flex-col gap-2.5">
          {spacing.map((s) => (
            <li key={s} lang="en" className="flex items-center gap-3 text-caption text-muted-foreground">
              <span className="tabular w-14">
                {s} · {s * 4}px
              </span>
              <span className="h-3 rounded-sm bg-secondary/70" style={{ width: s * 4 }} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <SubHeading>{t("radius")}</SubHeading>
        <ul className="grid grid-cols-3 gap-3">
          {radii.map(([name, cls, px]) => (
            <li key={name} lang="en" className="flex flex-col items-center gap-2 text-caption text-muted-foreground">
              <span className={`size-16 border-2 border-foreground/70 bg-surface ${cls}`} />
              {name} · {px === 999 ? "∞" : `${px}`}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <SubHeading>{t("elevation")}</SubHeading>
        <ul className="grid grid-cols-3 gap-4">
          {shadows.map(([name, cls]) => (
            <li key={name} lang="en" className={`grid h-16 place-items-center rounded-xl bg-surface text-caption text-muted-foreground ${cls}`}>
              {name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─────────────────────────── 04 Motion ─────────────────────────── */

function MotionSection() {
  const t = useTranslations("styleGuide.motion");
  const tokens = [
    ["ease-out-expo", "cubic-bezier(.16,1,.3,1)", "enter / reveal"],
    ["ease-in-out-quart", "cubic-bezier(.76,0,.24,1)", "exit / shimmer"],
    ["ease-spring", "cubic-bezier(.34,1.56,.64,1)", "switch / stamp"],
    ["fast · base · slow", "150 · 250 · 700ms", "hover · UI · reveal"],
  ];
  return (
    <div className="flex flex-col gap-12">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SubHeading>{t("tokens")}</SubHeading>
          <ul lang="en" className="flex flex-col divide-y divide-border border-y border-border text-caption">
            {tokens.map(([name, value, use]) => (
              <li key={name} className="flex flex-col gap-0.5 py-3">
                <code className="font-semibold text-foreground">{name}</code>
                <span className="text-muted-foreground">
                  {value} — {use}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-8">
          <SubHeading>{t("stagger")}</SubHeading>
          <StaggerDemo />
        </div>
      </div>
      <div>
        <SubHeading>{t("counters")}</SubHeading>
        <CountersDemo />
      </div>
      <div className="flex flex-col items-start gap-4">
        <SubHeading>{t("magnetic")}</SubHeading>
        <MagneticDemo label={t("magneticCta")} />
      </div>
    </div>
  );
}

/* ─────────────────────────── 05 Buttons ─────────────────────────── */

function ButtonsSection() {
  const t = useTranslations("styleGuide.buttons");
  return (
    <div className="flex flex-col gap-10">
      <div>
        <SubHeading>{t("variants")}</SubHeading>
        <div className="flex flex-wrap items-center gap-3">
          <Button>{t("primary")}</Button>
          <Button variant="secondary">{t("secondary")}</Button>
          <Button variant="ink">
            {t("ink")}
            <ArrowRight className="flip-rtl" aria-hidden />
          </Button>
          <Button variant="outline">{t("outline")}</Button>
          <Button variant="ghost">{t("ghost")}</Button>
          <Button variant="link">{t("link")}</Button>
          <Button variant="danger">{t("danger")}</Button>
        </div>
      </div>
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <SubHeading>{t("sizes")}</SubHeading>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">{t("primary")}</Button>
            <Button size="md">{t("primary")}</Button>
            <Button size="lg">{t("primary")}</Button>
            <Tooltip content={t("icon")}>
              <Button variant="outline" size="icon" aria-label={t("icon")}>
                <Plus aria-hidden />
              </Button>
            </Tooltip>
          </div>
        </div>
        <div>
          <SubHeading>{t("states")}</SubHeading>
          <div className="flex flex-wrap items-center gap-3">
            <LoadingButtonDemo label={t("primary")} />
            <Button loading variant="ink">
              {t("loading")}
            </Button>
            <Button disabled variant="outline">
              {t("outline")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── 07 Feedback ─────────────────────────── */

function FeedbackSection() {
  const t = useTranslations("styleGuide.feedback");
  const tones = ["neutral", "gold", "teal", "success", "warning", "danger", "info", "outline", "inverse"] as const;
  return (
    <div className="flex flex-col gap-14">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <SubHeading>{t("badges")}</SubHeading>
          <div className="flex flex-wrap gap-2">
            {tones.map((tone) => (
              <Badge key={tone} tone={tone} dot={tone === "success" || tone === "warning" || tone === "danger"}>
                {t(`badgeSamples.${tone}`)}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-8">
          <div>
            <SubHeading>{t("toasts")}</SubHeading>
            <ToastDemo />
          </div>
          <div>
            <SubHeading>{t("progress")}</SubHeading>
            <ProgressDemo />
          </div>
        </div>
      </div>

      <div>
        <SubHeading>{t("alerts")}</SubHeading>
        <div className="grid gap-4 md:grid-cols-2">
          <Alert tone="info" title={t("alertInfoTitle")}>
            {t("alertInfo")}
          </Alert>
          <Alert tone="success" title={t("alertSuccessTitle")}>
            {t("alertSuccess")}
          </Alert>
          <Alert
            tone="warning"
            title={t("alertWarningTitle")}
            action={
              <Button size="sm" variant="outline">
                <Camera aria-hidden />
                {t("fixNow")}
              </Button>
            }
          >
            {t("alertWarning")}
          </Alert>
          <Alert tone="danger" title={t("alertDangerTitle")}>
            {t("alertDanger")}
          </Alert>
        </div>
      </div>

      <div>
        <SubHeading>{t("skeletons")}</SubHeading>
        <SkeletonDemo />
      </div>

      <div>
        <SubHeading>
          {t("empty")} · {t("error")}
        </SubHeading>
        <StatesDemo />
      </div>
    </div>
  );
}

/* ─────────────────────────── 08 Overlays ─────────────────────────── */

function OverlaysSection() {
  const t = useTranslations("styleGuide.overlays");
  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <div className="flex flex-col gap-10">
        <div>
          <SubHeading>{t("dialog")}</SubHeading>
          <DialogDemo />
        </div>
        <div>
          <SubHeading>{t("tooltip")}</SubHeading>
          <TooltipDemo />
        </div>
        <div>
          <SubHeading>{t("tabs")}</SubHeading>
          <TabsDemo />
        </div>
      </div>
      <div>
        <SubHeading>{t("accordion")}</SubHeading>
        <AccordionDemo />
      </div>
    </div>
  );
}

/* ─────────────────────────── 09 Signature ─────────────────────────── */

const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=75`;

const DESTINATIONS = [
  { code: "TR", iata: "IST", img: "1524231757912-21f4fe3a7200", kind: "evisa", days: [1, 3], price: 29000 },
  { code: "GE", iata: "TBS", img: "1565008576549-57569a49371d", kind: "evisa", days: [3, 5], price: 21500 },
  { code: "FR", iata: "CDG", img: "1502602898657-3e91760cbb34", kind: "schengen", days: [10, 15], price: 69000 },
  { code: "GB", iata: "LHR", img: "1513635269975-59663e0ac1ad", kind: "sticker", days: [15, 21], price: 89000 },
  { code: "JP", iata: "HND", img: "1493976040374-85c8e12f0c0e", kind: "evisa", days: [5, 7], price: 34500 },
  { code: "CH", iata: "ZRH", img: "1530122037265-a5f1f91d3b99", kind: "schengen", days: [10, 15], price: 72000 },
] as const;

function SignatureSection() {
  const t = useTranslations("styleGuide.signature");
  const th = useTranslations("styleGuide.hero");
  return (
    <div className="flex flex-col gap-20">
      <div>
        <SubHeading aside={t("stampsDesc")}>{t("stamps")}</SubHeading>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-8 rounded-3xl border border-border bg-surface px-6 py-10 sm:justify-around">
          <PassportStamp animated shape="circle" tone="teal" top={th("stampTop")} bottom={th("stampBottom")} code="RUH" caption="27·10·26" rotate={-9} seed={3} />
          <PassportStamp animated shape="oval" tone="gold" top="ARRIVAL · ISTANBUL" bottom="MYVISA" code="IST" caption="12 OCT 2026" rotate={5} seed={9} />
          <PassportStamp animated shape="rect" tone="ink" top={th("stampApproved")} bottom="SCHENGEN · C" code="CDG" caption="90 DAYS" rotate={-4} seed={14} />
          <PassportStamp animated shape="circle" tone="danger" top="REFUSED · مرفوضة" bottom="EMBASSY" code="✕" caption="RE-APPLY" rotate={11} seed={21} className="w-32" />
        </div>
      </div>

      <div>
        <SubHeading aside={t("destinationsDesc")}>{t("destinations")}</SubHeading>
        {/* Horizontal snap rail on phones; grid from md. The rail scrolls inside itself — the page never does. */}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">
          {DESTINATIONS.map((d, i) => (
            <li key={d.code} className="w-[72vw] max-w-72 shrink-0 snap-start md:w-auto md:max-w-none">
              <DestinationCard
                href={`/style-guide#signature`}
                name={t(`countries.${d.code}`)}
                countryCode={d.code}
                airportCode={d.iata}
                imageUrl={IMG(d.img)}
                imageAlt={t(`countries.${d.code}`)}
                visaLabel={t(`visaKinds.${d.kind}`)}
                processingDays={d.days}
                priceFrom={d.price}
                priority={i < 2}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SubHeading aside={t("priceDesc")}>{t("price")}</SubHeading>
          <PriceBreakdown
            travelers={3}
            lines={[{ governmentFee: sar(330), serviceFee: sar(199), quantity: 3 }]}
            discount={{ kind: "percent", value: 10 }}
          />
        </div>
        <div className="flex flex-col gap-10 lg:col-span-7">
          <div>
            <SubHeading>{t("stepper")}</SubHeading>
            <StepperDemo />
          </div>
          <div>
            <SubHeading>{t("trust")}</SubHeading>
            <TrustBar crNumber="1010XXXXXX" vatNumber="3XXXXXXXXXXXXX3" className="rounded-3xl border border-border bg-surface p-5 sm:p-6" />
          </div>
          <div>
            <SubHeading>{t("whatsapp")}</SubHeading>
            <WhatsAppButton phone={SUPPORT_WHATSAPP} etaMinutes={5} floating={false} />
          </div>
        </div>
      </div>

      <div>
        <SubHeading aside={t("boardingPassDesc")}>{t("boardingPass")}</SubHeading>
        <BoardingPassDemo />
      </div>
    </div>
  );
}

/* ─────────────────────────── 10 Icons ─────────────────────────── */

const ICONS = {
  Plane,
  Stamp,
  Globe,
  MapPin,
  Search,
  FileText,
  Camera,
  CalendarCheck,
  Landmark,
  Receipt,
  CreditCard,
  ShieldCheck,
  LockKeyhole,
  BadgeCheck,
  Users,
  GraduationCap,
  Stethoscope,
  Truck,
  Languages,
  MessageCircle,
  Phone,
  Bell,
  ArrowRight,
  Plus,
};

function IconsSection() {
  return (
    <ul className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-6 lg:grid-cols-8">
      {Object.entries(ICONS).map(([name, Icon]) => (
        <li key={name} className="flex flex-col items-center gap-2.5 bg-surface px-2 py-5 text-center">
          <Icon className={`size-6 ${name === "ArrowRight" ? "flip-rtl" : ""}`} aria-hidden />
          <code lang="en" className="text-[0.6875rem] text-muted-foreground">
            {name}
          </code>
        </li>
      ))}
    </ul>
  );
}
