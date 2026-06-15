"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Switch accesible sin dependencias externas (estilo shadcn). */
export function Switch({
  checked,
  onCheckedChange,
  id,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "bg-[linear-gradient(90deg,var(--electric),var(--brand-purple))]"
          : "bg-input",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
