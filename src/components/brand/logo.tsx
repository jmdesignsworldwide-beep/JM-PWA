import { cn } from "@/lib/utils";

/**
 * Logo real de JM Designs (PNG). Dos versiones: blanca (fondos oscuros) y negra
 * (fondos claros). Por defecto auto-cambia según el tema; en superficies que
 * siempre son oscuras (login, bienvenida) usa variant="white".
 * - lockup=false (def.): solo el monograma M/S (para menú, ícono, espacios chicos).
 * - lockup=true: monograma + "DESIGNS" (para login/bienvenida).
 */
export function Logo({
  className,
  size = 36,
  variant = "auto",
  lockup = false,
}: {
  className?: string;
  size?: number;
  variant?: "auto" | "white" | "black";
  lockup?: boolean;
}) {
  const base = lockup ? "/brand/logo" : "/brand/logo-mark";
  const white = `${base}-white.png`;
  const black = `${base}-black.png`;
  const box = { width: size, height: size } as const;

  if (variant === "white" || variant === "black") {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={variant === "white" ? white : black} alt="JM Designs" style={box} className={cn("shrink-0 object-contain", className)} />;
  }

  // auto: muestra negra en claro, blanca en oscuro (por la clase .dark del tema).
  return (
    <span style={box} className={cn("relative inline-block shrink-0", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={black} alt="JM Designs" className="absolute inset-0 size-full object-contain dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={white} alt="" aria-hidden="true" className="absolute inset-0 hidden size-full object-contain dark:block" />
    </span>
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
