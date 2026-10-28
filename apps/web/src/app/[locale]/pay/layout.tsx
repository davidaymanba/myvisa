import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Hosted-checkout pages: no site chrome, like a real gateway page. */
export default function PayLayout({ children }: { children: ReactNode }) {
  return children;
}
