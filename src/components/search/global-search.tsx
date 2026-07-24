"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

type Hit = {
  id: string;
  nombre: string;
  apellido: string | null;
  es_lead: boolean;
};

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim().replace(/[,%]/g, "");
    const t = setTimeout(async () => {
      if (term.length < 2) {
        setHits([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("id, nombre, apellido, es_lead")
        .or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%,correo.ilike.%${term}%`)
        .limit(8);
      setHits((data as Hit[]) ?? []);
      setLoading(false);
      setOpen(true);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(id: string) {
    setOpen(false);
    setQ("");
    router.push(`/clientes/${id}`);
  }

  const leads = hits.filter((h) => h.es_lead);
  const activos = hits.filter((h) => !h.es_lead);

  return (
    <div ref={boxRef} className="relative flex-1 max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        type="search"
        placeholder="Buscar prospectos, clientes…"
        className="h-9 w-full rounded-lg border border-border bg-background/50 pl-9 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {loading && (
        <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      <AnimatePresence>
        {open && q.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute left-0 right-0 z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-xl"
          >
            {hits.length === 0 && !loading && (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">Sin resultados</p>
            )}

            {activos.length > 0 && (
              <Group title="Clientes">
                {activos.map((h) => (
                  <Result key={h.id} onClick={() => go(h.id)} hit={h} />
                ))}
              </Group>
            )}
            {leads.length > 0 && (
              <Group title="Prospectos">
                {leads.map((h) => (
                  <Result key={h.id} onClick={() => go(h.id)} hit={h} />
                ))}
              </Group>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function Result({ hit, onClick }: { hit: Hit; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
    >
      <span className="truncate font-medium">
        {hit.nombre} {hit.apellido ?? ""}
      </span>
      {hit.es_lead ? (
        <Badge dot="var(--warning)">Prospecto</Badge>
      ) : (
        <Badge dot="var(--success)">Activo</Badge>
      )}
    </button>
  );
}
