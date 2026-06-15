"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Botón "Enviar por WhatsApp" (wa.me). */
export function WhatsappButton({
  phone,
  text,
  label = "WhatsApp",
}: {
  phone?: string | null;
  text?: string;
  label?: string;
}) {
  const num = (phone ?? "").replace(/\D/g, "");
  if (!num) return null;
  const href = `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <Button variant="outline" className="gap-2 text-success">
        <MessageCircle className="size-4" />
        {label}
      </Button>
    </a>
  );
}
