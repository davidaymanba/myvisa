import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/** Feature areas with their own message files (messages/<area>/<locale>.json), merged in as a namespace. */
const AREAS = ["admin", "apply", "pay", "account", "track"] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const [site, ...areas] = await Promise.all([import(`../messages/${locale}.json`), ...AREAS.map((area) => import(`../messages/${area}/${locale}.json`))]);
  return {
    locale,
    messages: { ...site.default, ...Object.fromEntries(AREAS.map((area, i) => [area, areas[i].default])) },
  };
});
