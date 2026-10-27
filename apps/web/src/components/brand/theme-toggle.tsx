"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const;

const subscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("ui.theme");
  const { theme, setTheme } = useTheme();
  // Theme is only known on the client; render a neutral state during SSR to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <div role="radiogroup" aria-label={t("label")} className={cn("inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-1", className)}>
      {OPTIONS.map(({ value, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(value)}
            onClick={() => setTheme(value)}
            className={cn(
              "grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-foreground text-background hover:text-background",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
