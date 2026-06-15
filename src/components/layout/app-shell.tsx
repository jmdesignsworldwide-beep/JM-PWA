"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { PageTransition } from "@/components/animations/motion";

export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar fijo (desktop) */}
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-72">
          <Sidebar />
        </div>
      </aside>

      {/* Sidebar móvil (drawer) */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 left-0 w-72"
            >
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={email} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <PageTransition key={pathname} className="mx-auto w-full max-w-7xl">
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
