import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  style,
  children,
  dot,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  dot?: string;
}) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {dot && (
        <span
          className="size-1.5 rounded-full"
          style={{ background: dot }}
        />
      )}
      {children}
    </span>
  );
}
