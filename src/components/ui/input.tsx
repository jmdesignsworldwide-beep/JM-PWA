import * as React from "react";
import { cn } from "@/lib/utils";

// Teclado móvil correcto según el tipo de campo (si no se pasa inputMode).
function defaultInputMode(type?: string): React.HTMLAttributes<HTMLInputElement>["inputMode"] | undefined {
  switch (type) {
    case "number": return "decimal";
    case "tel": return "tel";
    case "email": return "email";
    case "url": return "url";
    default: return undefined;
  }
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, inputMode, ...props }, ref) => {
    return (
      <input
        type={type}
        inputMode={inputMode ?? defaultInputMode(type)}
        ref={ref}
        className={cn(
          // text-base en móvil evita el zoom de iOS al enfocar; text-sm en sm+.
          "flex h-11 w-full rounded-lg border border-input bg-background/60 px-3.5 py-2 text-base shadow-sm transition-colors sm:text-sm",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
