import type { L10n } from "../catalog/types";

export interface LegalSection {
  /** Anchor id, kebab-case English. */
  id: string;
  title: L10n;
  /** Paragraphs. */
  body: L10n[];
  bullets?: L10n[];
}

export interface LegalDocument {
  slug: "terms" | "refund-policy" | "privacy";
  title: L10n;
  /** ISO date of the last revision. */
  updatedAt: string;
  version: string;
  /** Plain-language summary shown at the top (and before payment for the refund policy). */
  summary: L10n[];
  sections: LegalSection[];
}
