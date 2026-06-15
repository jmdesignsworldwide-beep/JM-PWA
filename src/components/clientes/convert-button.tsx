"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCheck } from "lucide-react";
import { convertToActive } from "@/app/(app)/clientes/actions";
import { Button } from "@/components/ui/button";

export function ConvertButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      onClick={() =>
        startTransition(async () => {
          await convertToActive(clientId);
          router.refresh();
        })
      }
      disabled={pending}
      className="gap-2"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
      Convertir a cliente activo
    </Button>
  );
}
