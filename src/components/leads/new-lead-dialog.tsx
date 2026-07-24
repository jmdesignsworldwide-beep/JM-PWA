"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Zap, ListChecks, Camera, Globe, MessageCircle, UserPlus, MoreHorizontal } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { createLead, type NewLeadInput } from "@/app/(app)/leads/actions";
import { CATEGORIA_OPTIONS, INDUSTRIA_OPTIONS } from "@/lib/ventas";
import { cn } from "@/lib/utils";

type Brand = { id: string; nombre: string };

/** Fuentes como botones (más rápido en el celular que un dropdown). */
const FUENTES = [
  { v: "Instagram", icon: Camera },
  { v: "WhatsApp", icon: MessageCircle },
  { v: "Facebook", icon: Globe },
  { v: "Referido", icon: UserPlus },
  { v: "Otro", icon: MoreHorizontal },
] as const;

export function NewLeadDialog({ brands, label = "Nuevo registro" }: { brands: Brand[]; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [tipo, setTipo] = useState<"prospecto" | "cliente">("prospecto");
  const [modo, setModo] = useState<"rapido" | "completo">("rapido");
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [fuente, setFuente] = useState("");
  const [infoNota, setInfoNota] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  // Detallado
  const [apellido, setApellido] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [industria, setIndustria] = useState("");
  const [loQueQuiere, setLoQueQuiere] = useState("");
  const [direccion, setDireccion] = useState("");
  const [brandId, setBrandId] = useState("");

  function reset() {
    setTipo("prospecto"); setModo("rapido"); setNombre(""); setWhatsapp(""); setFuente(""); setInfoNota("");
    setInstagram(""); setFacebook(""); setApellido(""); setCedula(""); setTelefono("");
    setCorreo(""); setCategoria(""); setIndustria(""); setLoQueQuiere(""); setDireccion(""); setBrandId("");
    setError(null);
  }

  function guardar() {
    setError(null);
    if (!nombre.trim()) { setError("El nombre es obligatorio."); return; }
    const t = (s: string) => { const v = s.trim(); return v ? v : null; };
    // Enviamos instagram/facebook aunque el campo esté oculto: no perder datos.
    const input: NewLeadInput = {
      nombre: nombre.trim(),
      whatsapp: t(whatsapp),
      fuente: t(fuente),
      info_nota: t(infoNota),
      instagram: t(instagram),
      facebook: t(facebook),
      apellido: t(apellido),
      cedula: t(cedula),
      telefono: t(telefono),
      correo: t(correo),
      categoria_servicio: (t(categoria) as NewLeadInput["categoria_servicio"]) ?? null,
      industria: t(industria),
      lo_que_quiere: t(loQueQuiere),
      direccion: t(direccion),
      brand_id: t(brandId),
      es_lead: tipo === "prospecto",
    };
    startTransition(async () => {
      const res = await createLead(input);
      if (res?.error) { setError(res.error); return; }
      setOpen(false); reset(); router.refresh();
    });
  }

  return (
    <>
      <Button variant="gradient" onClick={() => { reset(); setOpen(true); }}>
        <Plus className="size-4" /> {label}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title={label} className="max-w-2xl">
        <div className="space-y-4">
          {/* ¿Prospecto o cliente? Solo cambia el estado; el resto del formulario es igual. */}
          <div className="space-y-1.5">
            <Label>¿Es prospecto o cliente?</Label>
            <div className="grid grid-cols-2 gap-2">
              {([["prospecto", "Prospecto", "Aún no ha comprado. Ficha ligera."], ["cliente", "Cliente", "Ya es cliente activo."]] as const).map(([id, lbl, hint]) => (
                <button key={id} type="button" onClick={() => setTipo(id)}
                  className={cn("rounded-lg border px-3 py-2 text-left transition-colors",
                    tipo === id ? "border-electric bg-electric/10" : "border-border hover:bg-accent/40")}>
                  <span className={cn("block text-sm font-medium", tipo === id ? "text-foreground" : "text-muted-foreground")}>{lbl}</span>
                  <span className="block text-[11px] text-muted-foreground">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Modo */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background/40 p-1">
            {([["rapido", "Rápido", Zap], ["completo", "Detallado", ListChecks]] as const).map(([id, lbl, Icon]) => (
              <button key={id} type="button" onClick={() => setModo(id)}
                className={cn("flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  modo === id ? "bg-electric/15 text-electric" : "text-muted-foreground hover:bg-accent/40")}>
                <Icon className="size-4" /> {lbl}
              </button>
            ))}
          </div>
          {modo === "rapido" && (
            <p className="text-xs text-muted-foreground">Lo esencial para no frenarte. Luego completas el resto desde su ficha.</p>
          )}

          {/* Rápido: nombre + whatsapp */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre *"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" /></Field>
            <Field label="WhatsApp"><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} type="tel" placeholder="1 809 000 0000" /></Field>
          </div>

          {/* Fuente como botones */}
          <div className="space-y-1.5">
            <Label>Fuente (de dónde vino)</Label>
            <div className="flex flex-wrap gap-2">
              {FUENTES.map(({ v, icon: Icon }) => (
                <button key={v} type="button" onClick={() => setFuente(v)}
                  className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                    fuente === v ? "border-electric bg-electric/10 text-electric" : "border-border text-muted-foreground hover:bg-accent/40")}>
                  <Icon className="size-4" /> {v}
                </button>
              ))}
            </div>
          </div>

          {/* Red condicional según la fuente */}
          {fuente === "Instagram" && (
            <Field label="Usuario de Instagram"><Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@usuario o link" /></Field>
          )}
          {fuente === "Facebook" && (
            <Field label="Usuario de Facebook"><Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="usuario o link" /></Field>
          )}

          {/* Notas (rápido) */}
          <Field label="Notas"><Textarea value={infoNota} onChange={(e) => setInfoNota(e.target.value)} placeholder="Lo que se habló, contexto…" /></Field>

          {/* Detallado: resto de campos */}
          {modo === "completo" && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Apellido"><Input value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellido" /></Field>
                <Field label="Cédula"><Input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="000-0000000-0" /></Field>
                <Field label="Teléfono"><Input value={telefono} onChange={(e) => setTelefono(e.target.value)} type="tel" placeholder="809-000-0000" /></Field>
                <Field label="Correo"><Input value={correo} onChange={(e) => setCorreo(e.target.value)} type="email" placeholder="correo@ejemplo.com" /></Field>
                <Field label="Categoría de servicio"><Combobox options={CATEGORIA_OPTIONS} value={categoria} onChange={setCategoria} placeholder="Elegir categoría" /></Field>
                <Field label="Industria"><Combobox options={INDUSTRIA_OPTIONS} value={industria} onChange={setIndustria} placeholder="Buscar industria…" /></Field>
                <Field label="Marca">
                  <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Lo que quiere"><Textarea value={loQueQuiere} onChange={(e) => setLoQueQuiere(e.target.value)} placeholder="Describe lo que necesita…" /></Field>
              <Field label="Dirección"><Input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Dirección" /></Field>
            </div>
          )}

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" variant="gradient" onClick={guardar} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Guardar
            </Button>
          </div>
        </div>
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
