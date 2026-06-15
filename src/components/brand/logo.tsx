import { cn } from "@/lib/utils";

/** Logo de marca: cuadro con gradiente + iniciales "JM". Placeholder editable. */
export function Logo({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="jm-logo-grad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="var(--electric)" />
          <stop offset="100%" stopColor="var(--brand-purple)" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#jm-logo-grad)" />
      <text
        x="50%"
        y="54%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="var(--font-sans)"
        fontSize="20"
        fontWeight="700"
        fill="white"
        letterSpacing="-0.5"
      >
        JM
      </text>
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={32} />
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight">JM Control</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Center
        </p>
      </div>
    </div>
  );
}
