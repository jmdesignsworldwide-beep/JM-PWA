"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createLead, type NewLeadInput } from "@/app/(app)/leads/actions";
import { CATEGORIA_OPTIONS, INDUSTRIA_OPTIONS, FUENTE_OPTIONS } from "@/lib/ventas";
import { Combobox } from "@/components/ui/combobox";

type Brand = { id: string; nombre: string };

export function NewLeadDialog({ brands, label = "Nuevo lead" }: { brands: Brand[]; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
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
    const input: NewLeadInput = {
      nombre: (fd.get("nombre") as string).trim(),
      apellido: get("apellido"),
      cedula: get("cedula"),
      telefono: get("telefono"),
      whatsapp: get("whatsapp"),
      correo: get("correo"),
      direccion: get("direccion"),
      info_nota: get("info_nota"),
      categoria_servicio: (get("categoria_servicio") as NewLeadInput["categoria_servicio"]) ?? null,
      industria: get("industria"),
      lo_que_quiere: get("lo_que_quiere"),
      fuente: get("fuente"),
      valor_estimado: num("valor_estimado"),
      valor_estimado_moneda: (get("valor_estimado_moneda") as "DOP" | "USD") ?? "DOP",
      brand_id: get("brand_id"),
    };

    startTransition(async () => {
      const res = await createLead(input);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {label}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        description="Estos datos son la fuente única; las próximas fases los reutilizan."
        className="max-w-2xl"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre *">
              <Input name="nombre" required placeholder="Nombre" />
            </Field>
            <Field label="Apellido">
              <Input name="apellido" placeholder="Apellido" />
            </Field>
            <Field label="Cédula">
              <Input name="cedula" placeholder="000-0000000-0" />
            </Field>
            <Field label="Teléfono">
              <Input name="telefono" placeholder="809-000-0000" />
            </Field>
            <Field label="WhatsApp">
              <Input name="whatsapp" placeholder="1 809 000 0000" />
            </Field>
            <Field label="Correo">
              <Input name="correo" type="email" placeholder="correo@ejemplo.com" />
            </Field>
            <Field label="Categoría de servicio">
              <Combobox name="categoria_servicio" options={CATEGORIA_OPTIONS} placeholder="Elegir categoría" />
            </Field>
            <Field label="Industria">
              <Combobox name="industria" options={INDUSTRIA_OPTIONS} placeholder="Buscar industria…" />
            </Field>
            <Field label="Fuente (de dónde vino)">
              <Combobox name="fuente" options={FUENTE_OPTIONS} placeholder="Elegir fuente" />
            </Field>
            <Field label="Valor estimado (opcional)">
              <div className="flex gap-2">
                <Input
                  name="valor_estimado"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                />
                <Select name="valor_estimado_moneda" defaultValue="DOP" className="w-24">
                  <option value="DOP">DOP</option>
                  <option value="USD">USD</option>
                </Select>
              </div>
            </Field>
            <Field label="Marca">
              <Select name="brand_id" defaultValue="">
                <option value="">— Seleccionar —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Lo que quiere">
            <Textarea name="lo_que_quiere" placeholder="Describe lo que el lead necesita…" />
          </Field>
          <Field label="Dirección">
            <Input name="direccion" placeholder="Dirección" />
          </Field>
          <Field label="Info / Nota">
            <Textarea name="info_nota" placeholder="Notas internas…" />
          </Field>

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Guardar lead
            </Button>
          </div>
        </form>
      </Dialog>
    </>
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
