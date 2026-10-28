import { clsx, type ClassValue } from "clsx";
import type { useFormatter } from "next-intl";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge must know our custom type scale; otherwise it reads `text-body` as a colour
 * and silently drops the real colour class (e.g. `text-background`) when both are present.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display-2xl", "display-xl", "display-lg", "display-md", "heading", "title", "body-lg", "body", "body-sm", "caption", "overline"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DateFormatter = Pick<ReturnType<typeof useFormatter>, "dateTime">;

/**
 * "28 أكتوبر 2026" / "28 Oct 2026" for server-rendered client components. Arabic is assembled from parts:
 * Safari's ICU adds a comma ("28 أكتوبر، 2026") that Node doesn't, which breaks hydration on iPhone.
 */
export function calendarDate(format: DateFormatter, date: Date, locale: string, month: "long" | "short" = "long", day: "numeric" | "2-digit" = "numeric") {
  if (locale !== "ar") return format.dateTime(date, { day, month, year: "numeric" });
  return `${format.dateTime(date, { day })} ${format.dateTime(date, { month })} ${format.dateTime(date, { year: "numeric" })}`;
}
