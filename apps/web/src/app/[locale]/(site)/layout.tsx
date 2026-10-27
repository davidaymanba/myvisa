import type { ReactNode } from "react";
import "lenis/dist/lenis.css";
import { WhatsAppButton } from "@/components/brand/whatsapp-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { COMPANY } from "@/lib/company";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <SmoothScroll>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <WhatsAppButton phone={COMPANY.whatsapp} etaMinutes={COMPANY.whatsappEtaMinutes} />
    </SmoothScroll>
  );
}
