"use client";

import { Check, Link2 } from "lucide-react";
import { motion, useScroll, useSpring } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Thin gold bar across the top that fills as you read. */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-gold-300 via-gold-400 to-teal-400 rtl:origin-right" style={{ scaleX }} />;
}

/** Table of contents that highlights the section you're reading. */
export function Toc({ items }: { items: { id: string; text: string }[] }) {
  const t = useTranslations("blog");
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-20% 0px -70% 0px" });
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);
  if (items.length < 2) return null;
  return (
    <nav aria-label={t("toc")} className="flex flex-col gap-3">
      <span className="eyebrow text-muted-foreground">{t("toc")}</span>
      <ol className="flex flex-col border-s border-border">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className={cn("-ms-px block border-s-2 py-1.5 ps-4 text-body-sm transition-colors", active === item.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CopyLink() {
  const t = useTranslations("blog");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(window.location.href).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-body-sm font-medium transition-colors hover:bg-muted"
    >
      {copied ? <Check className="size-4 text-success" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
      {copied ? t("copied") : t("copy")}
    </button>
  );
}
