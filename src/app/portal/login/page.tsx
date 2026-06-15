import { Suspense } from "react";
import type { Metadata } from "next";
import { AuroraBackground } from "@/components/animations/aurora-background";
import { PortalLoginForm } from "./portal-login-form";
import { PortalIntro } from "./portal-intro";

export const metadata: Metadata = { title: "Portal de Cliente" };

export default function PortalLoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <AuroraBackground />
      <PortalIntro>
        <Suspense fallback={<div className="h-56 animate-pulse rounded-2xl bg-muted/30" />}>
          <PortalLoginForm />
        </Suspense>
      </PortalIntro>
    </main>
  );
}
