import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  // Admin strings live in their own files; the root layout keeps them out of public pages' client bundle.
  const [site, admin] = await Promise.all([import(`../messages/${locale}.json`), import(`../messages/admin/${locale}.json`)]);
  return {
    locale,
    messages: { ...site.default, admin: admin.default },
  };
});
