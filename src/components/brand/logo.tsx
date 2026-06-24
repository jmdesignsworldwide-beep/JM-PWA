import { cn } from "@/lib/utils";

/**
 * Monograma JM Designs. Usa `currentColor`, así que toma el color del texto:
 * blanco en fondos oscuros, negro/oscuro en fondos claros — nunca invisible.
 * Para forzar un color, pásalo por className (ej. text-white en el login).
 *
 * NOTA: es una versión vectorial limpia del monograma M; se puede reemplazar
 * por el SVG exacto de marca dejando un archivo en /brand y cambiando este path.
 */
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
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={12}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path d="M14 82 V24 L50 58 L86 24 V82" />
      <path d="M50 58 V84" opacity={0.85} />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={30} />
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight">JM Designs</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Control Center
        </p>
      </div>
    </div>
  );
}
