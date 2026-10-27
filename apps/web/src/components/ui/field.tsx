"use client";

import { CircleAlert } from "lucide-react";
import { Label as LabelPrimitive } from "radix-ui";
import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldContextValue {
  id: string;
  hintId?: string;
  errorId?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Wires id / aria-describedby / aria-invalid from <Field> into whichever control it wraps. */
export function useFieldControl(props: { id?: string; "aria-describedby"?: string; "aria-invalid"?: ComponentProps<"input">["aria-invalid"] }) {
  const field = useContext(FieldContext);
  const describedBy = [props["aria-describedby"], field?.hintId, field?.errorId].filter(Boolean).join(" ") || undefined;
  return {
    id: props.id ?? field?.id,
    "aria-describedby": describedBy,
    "aria-invalid": props["aria-invalid"] ?? (field?.invalid || undefined),
  };
}

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn("text-body-sm font-medium text-foreground peer-disabled:opacity-60", className)}
      {...props}
    />
  );
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <FieldContext.Provider value={{ id, hintId, errorId, invalid: Boolean(error) }}>
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={id}>{label}</Label>
          {optional && <span className="text-caption text-muted-foreground">{optional}</span>}
        </div>
        {children}
        {hint && !error && (
          <p id={hintId} className="text-caption text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="flex items-center gap-1.5 text-caption font-medium text-danger">
            <CircleAlert className="size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}
