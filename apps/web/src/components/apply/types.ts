import type { ApplicantType, Destination, L10n, Nationality, TravelPurpose, VisaOption } from "@myvisa/shared";

/** Catalog slice the wizard needs (no requirements or FAQs: those come with the order). */
export type WizardVisa = Pick<VisaOption, "id" | "purpose" | "kind" | "name" | "entry" | "maxStayDays" | "processingDays" | "appointment" | "pricing">;

export interface WizardDestination extends Pick<Destination, "slug" | "iso2" | "iata" | "name" | "imageId" | "region" | "schengen"> {
  visas: WizardVisa[];
}

export interface WizardData {
  destinations: WizardDestination[];
  nationalities: Nationality[];
  whatsapp: string;
  refundSummary: L10n[];
}

export interface WizardIntent {
  to?: string;
  visa?: string;
  purpose?: TravelPurpose;
  as?: ApplicantType;
  nationality?: string;
  order?: string;
  step?: string;
}

export type StepKey = "visa" | "travelers" | "documents" | "appointment" | "review" | "payment";
