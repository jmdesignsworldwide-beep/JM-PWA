"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Sparkles, Send, Loader2, ChevronRight, Star } from "lucide-react";
import { preguntar, getFaqTop, toggleFavorita, type FaqQuick } from "@/app/(app)/asistente/actions";
import type { Answer } from "@/lib/asistente/answer";
import { CATEGORIAS, EJEMPLO, type IntentId } from "@/lib/asistente/intents";
import { cn } from "@/lib/utils";

type Msg = { role: "user"; text: string } | { role: "bot"; answer: Answer };

export function AsistenteChat({ onNavigate }: { onNavigate?: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [faq, setFaq] = useState<FaqQuick[]>([]);
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { getFaqTop().then(setFaq).catch(() => {}); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, pending]);

  function enviar(texto: string) {
    const t = texto.trim();
    if (!t || pending) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: t }]);
    start(async () => {
      const answer = await preguntar(t);
      setMsgs((m) => [...m, { role: "bot", answer }]);
      getFaqTop().then(setFaq).catch(() => {});
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Preguntas frecuentes (accesos rápidos) */}
      {faq.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
          {faq.map((f) => (
            <button key={f.intent} onClick={() => enviar(f.pregunta)}
              className="flex items-center gap-1 rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs transition-colors hover:border-electric/40 hover:bg-accent">
              {f.favorita && <Star className="size-3 fill-electric text-electric" />}{f.label}
            </button>
          ))}
        </div>
      )}

      {/* Conversación */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto py-3">
        {msgs.length === 0 && (
          <div className="rounded-2xl rounded-tl-sm border border-border bg-card p-3 text-sm">
            <p className="flex items-center gap-1.5 font-medium"><Sparkles className="size-4 text-electric" /> ¡Hola! Pregúntame lo que sea.</p>
            <p className="mt-1 text-muted-foreground">Ej.: “quién me debe”, “cuánto gasté este mes”, “qué tengo esta semana”, “a quién le debo”, “cómo va todo”.</p>
          </div>
        )}
        {msgs.map((m, i) => m.role === "user" ? (
          <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] px-3 py-2 text-sm text-white">{m.text}</div>
        ) : (
          <BotBubble key={i} answer={m.answer} onNavigate={onNavigate} onFav={(id, v) => { toggleFavorita(id, v).then(() => getFaqTop().then(setFaq)); }} onChip={enviar} />
        ))}
        {pending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Consultando…</div>
        )}
      </div>

      {/* Entrada */}
      <form onSubmit={(e) => { e.preventDefault(); enviar(input); }} className="flex items-center gap-2 border-t border-border pt-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu pregunta…"
          className="h-10 flex-1 rounded-lg border border-border bg-background/50 px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <button type="submit" disabled={pending || !input.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] text-white disabled:opacity-50">
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

function BotBubble({ answer, onNavigate, onFav, onChip }: {
  answer: Answer; onNavigate?: () => void;
  onFav: (id: IntentId, v: boolean) => void; onChip: (q: string) => void;
}) {
  return (
    <div className="max-w-[92%] space-y-2 rounded-2xl rounded-tl-sm border border-border bg-card p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{answer.titulo}{answer.periodoLabel && <span className="ml-1 text-xs font-normal text-muted-foreground">· {answer.periodoLabel}</span>}</p>
        {answer.intent !== "desconocido" && (
          <button onClick={() => onFav(answer.intent as IntentId, true)} title="Fijar como favorita" className="shrink-0 text-muted-foreground hover:text-electric">
            <Star className="size-3.5" />
          </button>
        )}
      </div>
      {answer.texto && <p className="text-lg font-bold tracking-tight text-gradient">{answer.texto}</p>}
      {answer.detalle && <p className="text-xs text-muted-foreground">{answer.detalle}</p>}

      {answer.items && answer.items.length > 0 && (
        <ul className="space-y-1">
          {answer.items.map((it, i) => {
            const inner = (
              <div className={cn("flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5", it.href && "transition-colors hover:border-electric/40 hover:bg-accent/40")}>
                <div className="min-w-0">
                  <p className="truncate font-medium">{it.label}</p>
                  {it.sub && <p className="truncate text-[11px] text-muted-foreground">{it.sub}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {it.monto && <span className="font-semibold tabular-nums">{it.monto}</span>}
                  {it.href && <ChevronRight className="size-3.5 text-muted-foreground" />}
                </div>
              </div>
            );
            return <li key={i}>{it.href ? <Link href={it.href} onClick={onNavigate}>{inner}</Link> : inner}</li>;
          })}
        </ul>
      )}

      {answer.fallback && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {CATEGORIAS.map((c) => (
            <button key={c.id} onClick={() => onChip(EJEMPLO[c.id])}
              className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs transition-colors hover:border-electric/40 hover:bg-accent">
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
