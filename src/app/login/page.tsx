import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { AuroraBackground } from "@/components/animations/aurora-background";
import { LoginIntro } from "./login-intro";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <AuroraBackground />

      <LoginIntro>
        <Suspense
          fallback={<div className="h-72 w-full animate-pulse rounded-2xl bg-muted/30" />}
        >
          <LoginForm />
        </Suspense>
      </LoginIntro>
    </main>
  );
}
