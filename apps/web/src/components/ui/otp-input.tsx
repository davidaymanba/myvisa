"use client";

import { toLatinDigits } from "@myvisa/shared";
import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * N-box OTP entry. Accepts Arabic-Indic digits, full-code paste, and iOS/Android SMS autofill
 * (autocomplete="one-time-code" on the first box receives the whole code).
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  invalid,
  disabled,
  label,
  digitLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  label: string;
  digitLabel: (index: number) => string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const commit = (next: string) => {
    const clean = toLatinDigits(next).replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    refs.current[Math.min(clean.length, length - 1)]?.focus();
  };

  const handleInput = (index: number, raw: string) => {
    const digits = toLatinDigits(raw).replace(/\D/g, "");
    if (!digits) return;
    // Multi-char input = autofill or paste into a box: replace from this index on.
    commit(value.slice(0, index) + digits);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const cut = value[index] ? index : Math.max(index - 1, 0);
      onChange(value.slice(0, cut));
      refs.current[cut]?.focus();
    } else if (e.key === "ArrowLeft") {
      refs.current[Math.max(index - 1, 0)]?.focus();
    } else if (e.key === "ArrowRight") {
      refs.current[Math.min(index + 1, length - 1)]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    commit(e.clipboardData.getData("text"));
  };

  return (
    <div role="group" aria-label={label} dir="ltr" className="flex gap-2 sm:gap-3">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ""}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? length : 1}
          disabled={disabled}
          aria-label={digitLabel(i + 1)}
          aria-invalid={invalid || undefined}
          className={cn(
            "tabular h-14 w-full min-w-0 max-w-14 rounded-xl border border-border-strong/70 bg-surface text-center font-display text-display-md shadow-xs outline-none transition-all duration-200",
            "focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15",
            value[i] && "border-foreground/40",
            invalid && "border-danger focus-visible:ring-danger/15",
          )}
        />
      ))}
    </div>
  );
}
