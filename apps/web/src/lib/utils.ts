import { clsx, type ClassValue } from "clsx";
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
