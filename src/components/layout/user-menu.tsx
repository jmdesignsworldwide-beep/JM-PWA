"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initials = email.slice(0, 2).toUpperCase();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex size-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] text-xs font-semibold text-white shadow-sm transition-transform hover:scale-105"
        aria-label="Menú de usuario"
      >
        {initials}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl"
          >
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] text-xs font-semibold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{email}</p>
                <p className="text-xs text-muted-foreground">Owner</p>
              </div>
            </div>
            <div className="my-1 h-px bg-border" />
            <Link
              href="/configuracion"
              onMouseDown={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <UserIcon className="size-4 text-muted-foreground" />
              Mi perfil
            </Link>
            <Link
              href="/configuracion"
              onMouseDown={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <Settings className="size-4 text-muted-foreground" />
              Configuración
            </Link>
            <div className="my-1 h-px bg-border" />
            <button
              onMouseDown={signOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
