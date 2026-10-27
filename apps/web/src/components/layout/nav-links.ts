export const NAV_LINKS = [
  { href: "/destinations", key: "destinations" },
  { href: "/visa-finder", key: "finder" },
  { href: "/services", key: "services" },
  { href: "/pricing", key: "pricing" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

export type NavKey = (typeof NAV_LINKS)[number]["key"];
