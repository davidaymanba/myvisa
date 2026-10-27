import { Alexandria, IBM_Plex_Sans_Arabic, Instrument_Serif, Inter } from "next/font/google";

/* Arabic is the default locale, so only its fonts are preloaded. Latin fonts load on demand. */
export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const alexandria = Alexandria({
  subsets: ["arabic"],
  variable: "--font-alexandria",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
  preload: false,
});

export const fontVariables = [plexArabic.variable, alexandria.variable, inter.variable, instrumentSerif.variable].join(" ");
