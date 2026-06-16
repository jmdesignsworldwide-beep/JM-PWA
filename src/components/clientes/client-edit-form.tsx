"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import type { Client } from "@/lib/data/clients";
import { updateClient, type ClientUpdate } from "@/app/(app)/clientes/actions";
import { CATEGORIA_OPTIONS, INDUSTRIA_OPTIONS, FUENTE_OPTIONS } from "@/lib/ventas";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

type Brand = { id: string; nombre: string };

export function ClientEditForm({
  client,
  brands,
}: {
  client: Client;
  brands: Brand[];
}) {
  const router = useRouter();
  const [fiscal, setFiscal] = useState(client.factura_fiscal);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => {
      const v = (fd.get(k) as string)?.trim();
      return v ? v : null;
    };
    const num = (k: string) => {
      const v = (fd.get(k) as string)?.trim();
      const n = v ? Number(v) : NaN;
      return Number.isFinite(n) ? n : null;
    };
    const input: ClientUpdate = {
      nombre: (fd.get("nombre") as string).trim(),
      apellido: get("apellido"),
      cedula: get("cedula"),
      factura_fiscal: fiscal,
      rnc: fiscal ? get("rnc") : null,
      telefono: get("telefono"),
      whatsapp: get("whatsapp"),
      correo: get("correo"),
      direccion: get("direccion"),
      info_nota: get("info_nota"),
      categoria_servicio: (get("categoria_servicio") as ClientUpdate["categoria_servicio"]) ?? null,
      industria: get("industria"),
      lo_que_quiere: get("lo_que_quiere"),
      fuente: get("fuente"),
      valor_estimado: num("valor_estimado"),
      valor_estimado_moneda: (get("valor_estimado_moneda") as "DOP" | "USD") ?? "DOP",
      brand_id: get("brand_id"),
    };

    startTransition(async () => {
      const res = await updateClient(client.id, input);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre *"><Input name="nombre" required defaultValue={client.nombre} /></Field>
        <Field label="Apellido"><Input name="apellido" defaultValue={client.apellido ?? ""} /></Field>
        <Field label="Cédula"><Input name="cedula" defaultValue={client.cedula ?? ""} /></Field>
        <Field label="Teléfono"><Input name="telefono" defaultValue={client.telefono ?? ""} /></Field>
        <Field label="WhatsApp"><Input name="whatsapp" defaultValue={client.whatsapp ?? ""} /></Field>
        <Field label="Correo"><Input name="correo" type="email" defaultValue={client.correo ?? ""} /></Field>
        <Field label="Categoría de servicio">
          <Combobox name="categoria_servicio" options={CATEGORIA_OPTIONS} defaultValue={client.categoria_servicio ?? ""} placeholder="Elegir categoría" />
        </Field>
        <Field label="Industria">
          <Combobox name="industria" options={INDUSTRIA_OPTIONS} defaultValue={client.industria ?? ""} placeholder="Buscar industria…" />
        </Field>
        <Field label="Fuente">
          <Combobox name="fuente" options={FUENTE_OPTIONS} defaultValue={client.fuente ?? ""} placeholder="Elegir fuente" />
        </Field>
        <Field label="Valor estimado (opcional)">
          <div className="flex gap-2">
            <Input
              name="valor_estimado"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              defaultValue={client.valor_estimado ?? ""}
              placeholder="0.00"
            />
            <Select name="valor_estimado_moneda" defaultValue={client.valor_estimado_moneda ?? "DOP"} className="w-24">
              <option value="DOP">DOP</option>
              <option value="USD">USD</option>
            </Select>
          </div>
        </Field>
        <Field label="Marca">
          <Select name="brand_id" defaultValue={client.brand_id ?? ""}>
            <option value="">— Seleccionar —</option>
            {brands.map((b) => (<option key={b.id} value={b.id}>{b.nombre}</option>))}
          </Select>
        </Field>
      </div>

      {/* Facturación fiscal */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-background/40 p-4">
        <div className="flex items-center gap-3">
          <Switch checked={fiscal} onCheckedChange={setFiscal} id="fiscal" />
          <Label htmlFor="fiscal">Factura fiscal (NCF / RNC)</Label>
        </div>
        {fiscal && (
          <div className="min-w-[200px] flex-1">
            <Input name="rnc" defaultValue={client.rnc ?? ""} placeholder="RNC" />
          </div>
        )}
      </div>

      <Field label="Lo que quiere">
        <Textarea name="lo_que_quiere" defaultValue={client.lo_que_quiere ?? ""} />
      </Field>
      <Field label="Dirección"><Input name="direccion" defaultValue={client.direccion ?? ""} /></Field>
      <Field label="Info / Nota">
        <Textarea name="info_nota" defaultValue={client.info_nota ?? ""} />
      </Field>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="gradient" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Guardar cambios
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <Check className="size-4" /> Guardado
          </span>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
