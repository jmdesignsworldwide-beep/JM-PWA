"use client";

import { EMPRESA } from "@/lib/empresa";
import { conceptoDePedido, itemsDePedido } from "@/lib/pedido-concepto";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, FileSignature, ReceiptText, Send, CheckCircle2, Copy,
  Download, MessageCircle, Loader2, Sparkles, MessageSquarePlus, Lock,
  Receipt, ChevronDown,
} from "lucide-react";
import type { Order, OrderItem, OrderNote, Contract, Invoice, OrderPayment } from "@/lib/data/orders";
import type { Row } from "@/lib/database.types";
import {
  addOrderNote, duplicateOrder, generateContract,
  updateContractContent, setContractStatus,
  generateInvoiceFromOrder, createProjectFromOrder,
} from "@/app/(app)/pedidos/actions";
import { money, fechaCorta, fechaHora } from "@/lib/format";
import { antiguedadColor } from "@/lib/pedidos";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PagosManager } from "./pagos-manager";
import { ExternalContractUpload } from "./external-contract-upload";
import { OrderTasks } from "./order-tasks";
import { ProjectManager } from "@/components/clientes/project-manager";
import { Wallet, ListChecks } from "lucide-react";

type ClientLite = {
  id: string; nombre: string; apellido: string | null;
  whatsapp: string | null; telefono: string | null;
  factura_fiscal: boolean; rnc: string | null;
} | null;

type Props = {
  order: Order;
  client: ClientLite;
  items: OrderItem[];
  notes: OrderNote[];
  contract: Contract | null;
  invoice: Invoice | null;
  brandName: string | null;
  /** Días desde que se envió el contrato (calculado en el servidor). */
  contractDias: number;
  payments: OrderPayment[];
  /** Seguimiento del trabajo (proyecto 1:1 con el pedido) y su línea de tiempo. */
  project: Row<"projects"> | null;
  milestones: Row<"project_milestones">[];
  updates: Row<"project_updates">[];
  tasks: { id: string; descripcion: string; estado: string; monto: number; moneda: string; fecha_limite: string | null; team_member_id: string | null; miembroNombre: string | null }[];
  teamMembers: { id: string; nombre: string }[];
};

export function OrderDetail({ order, client, notes, contract, invoice, contractDias, payments, project, milestones, updates, tasks, teamMembers }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [justSigned, setJustSigned] = useState(false);

  const detalle = (order.detalle_json as {
    producto?: string; cantidad?: number; subtotal?: number; categoria?: string | null;
  }[]) ?? [];
  const plan = (order.plan_pago as { label: string; porcentaje: number }[]) ?? [];
  const nombre = `${client?.nombre ?? ""} ${client?.apellido ?? ""}`.trim();
  const waPhone = client?.whatsapp ?? client?.telefono ?? "";

  function act(fn: () => Promise<{ error?: string } | { ok?: boolean } | { id?: string }>, after?: () => void) {
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) { alert(res.error); return; }
      after?.();
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Columna principal */}
      <div className="space-y-5 lg:col-span-2">
        {/* Pedido */}
        <section className="rounded-xl border border-border bg-card">
          <Header icon={<FileText className="size-4" />} title="Pedido" right={
            <div className="flex items-center gap-2">
              <Badge dot="var(--electric)">{order.rama === "designs" ? EMPRESA.nombre : "JM Distribution"}</Badge>
              <Button variant="ghost" size="sm" onClick={() => act(() => duplicateOrder(order.id), )}
                disabled={pending} title="Duplicar pedido">
                <Copy className="size-4" /> Duplicar
              </Button>
            </div>
          } />
          <div className="p-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="px-3 py-2">Detalle</th><th className="px-3 py-2">Cant.</th><th className="px-3 py-2 text-right">Subtotal</th></tr>
                </thead>
                <tbody>
                  {detalle.map((d, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2">{d.producto ?? "Ítem"}{d.categoria ? ` · ${d.categoria}` : ""}</td>
                      <td className="px-3 py-2">{d.cantidad ?? 1}</td>
                      <td className="px-3 py-2 text-right">{money(d.subtotal ?? 0, order.moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 ml-auto max-w-xs space-y-1 text-sm">
              <Line label="Subtotal" value={money(order.subtotal, order.moneda)} />
              {order.descuento > 0 && <Line label="Descuento" value={`- ${money(order.descuento, order.moneda)}`} />}
              <Line label={`ITBIS ${order.aplica_itbis ? "18%" : "(no aplica)"}`} value={money(order.itbis, order.moneda)} />
              <div className="flex items-center justify-between border-t border-border pt-1 font-semibold">
                <span>Total</span><span className="text-gradient">{money(order.total, order.moneda)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Entrega estimada: {fechaCorta(order.fecha_entrega)} · Plan: {plan.map((p) => `${p.label} ${p.porcentaje}%`).join(" · ") || "Pago único"}
            </p>
          </div>
        </section>

        {/* Factura / Recibo — directo desde el pedido, sin contrato obligatorio */}
        <InvoiceSection
          invoice={invoice} nombre={nombre} waPhone={waPhone} pending={pending}
          onGenerate={(esFiscal) => act(() => generateInvoiceFromOrder(order.id, esFiscal))}
        />

        {/* Progreso del trabajo — el pedido ES el proyecto. El cliente lo ve en su portal. */}
        <ProgressSection
          order={order} project={project} milestones={milestones} updates={updates}
          pending={pending} onStart={() => act(() => createProjectFromOrder(order.id))}
        />

        {/* Tareas del trabajo — el trabajo a repartir, con su pago */}
        <OrderTasks orderId={order.id} tasks={tasks} members={teamMembers} />

        {/* Contrato — OPCIONAL: solo cuando el trato lo amerita */}
        <ContractSection
          order={order} contract={contract} nombre={nombre} waPhone={waPhone}
          pending={pending} diasSinFirmar={contractDias}
          onGenerate={() => act(() => generateContract(order.id))}
          onSaveContent={(c) => act(() => updateContractContent(contract!.id, c, order.id))}
          onSend={() => act(() => setContractStatus(contract!.id, "enviado", order.id))}
          onSign={() => act(() => setContractStatus(contract!.id, "aprobado_firmado", order.id), () => setJustSigned(true))}
          justSigned={justSigned}
        />

        {/* Pagos del pedido — control de saldo (Total / Pagado / Falta) */}
        <section className="rounded-xl border border-border bg-card">
          <Header icon={<Wallet className="size-4" />} title="Pagos" right={
            <Badge dot="var(--success)">{payments.length} {payments.length === 1 ? "abono" : "abonos"}</Badge>
          } />
          <div className="p-4">
            <PagosManager
              clientId={order.client_id}
              orders={[{ id: order.id, total: order.total, moneda: order.moneda, fecha: order.fecha, estado: order.estado, concepto: conceptoDePedido(order), items: itemsDePedido(order.detalle_json) }]}
              payments={payments}
              lockedOrderId={order.id}
            />
          </div>
        </section>
      </div>

      {/* Columna lateral: hilo de conversación */}
      <div className="lg:col-span-1">
        <ConversationThread orderId={order.id} notes={notes} pending={pending}
          onAdd={(t, done) => act(() => addOrderNote(order.id, t), done)} />
      </div>
    </div>
  );
}

function ContractSection({
  order, contract, nombre, waPhone, pending, justSigned, diasSinFirmar,
  onGenerate, onSaveContent, onSend, onSign,
}: {
  order: Order; contract: Contract | null; nombre: string; waPhone: string;
  pending: boolean; justSigned: boolean; diasSinFirmar: number;
  onGenerate: () => void; onSaveContent: (c: string) => void; onSend: () => void; onSign: () => void;
}) {
  const [content, setContent] = useState(contract?.contenido ?? "");
  const firmado = contract?.estado === "aprobado_firmado";

  if (!contract) {
    return (
      <details className="group rounded-xl border border-dashed border-border bg-card/50">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm">
          <FileSignature className="size-4 text-muted-foreground" />
          <span className="font-medium">Contrato</span>
          <Badge>Opcional</Badge>
          <span className="hidden text-muted-foreground sm:inline">— agrégalo solo si el trato lo amerita.</span>
          <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">Se rellena solo con los datos del cliente y el detalle del pedido. Para pedidos simples puedes saltarlo y emitir factura/recibo directo.</p>
          <Button variant="gradient" onClick={onGenerate} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generar contrato
          </Button>
          <div className="mx-auto max-w-md text-left">
            <ExternalContractUpload orderId={order.id} />
          </div>
        </div>
      </details>
    );
  }

  const ant = contract.fecha_envio ? antiguedadColor(diasSinFirmar) : null;

  return (
    <section className="rounded-xl border border-border bg-card">
      <Header icon={<FileSignature className="size-4" />} title="Contrato" right={
        <div className="flex items-center gap-2">
          {ant && !firmado && <Badge dot={ant.color}>{ant.label}</Badge>}
          <Badge dot={firmado ? "var(--success)" : "var(--electric)"}>
            {firmado ? "Firmado" : contract.estado === "enviado" ? "Enviado" : "Borrador"}
          </Badge>
        </div>
      } />
      <div className="space-y-3 p-4">
        <AnimatePresence>
          {justSigned && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>✅ Factura generada · Fechas en calendario · Cliente activado. Precios congelados.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {firmado ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> Congelado al firmar el {fechaHora(contract.fecha_aprobacion)} — no editable.
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background/50 p-3 text-sm">
              {contract.contenido}
            </pre>
          </div>
        ) : (
          <>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10}
              className="font-mono text-xs" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onSaveContent(content)} disabled={pending}>
                Guardar cambios
              </Button>
              {contract.estado === "borrador" && (
                <Button variant="outline" size="sm" onClick={onSend} disabled={pending}>
                  <Send className="size-4" /> Marcar como enviado
                </Button>
              )}
              <Button variant="gradient" size="sm" onClick={onSign} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Marcar como Aprobado/Firmado
              </Button>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <a href={`/api/pdf/contract/${contract.id}`} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm"><Download className="size-4" /> PDF</Button>
          </a>
          {waPhone && (
            <a target="_blank" rel="noopener noreferrer"
              href={`https://wa.me/${waPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${nombre}, te comparto el contrato de tu proyecto por ${money(order.total, order.moneda)}.`)}`}>
              <Button variant="ghost" size="sm" className="text-success"><MessageCircle className="size-4" /> WhatsApp</Button>
            </a>
          )}
        </div>

        {!firmado && <ExternalContractUpload orderId={order.id} />}
      </div>
    </section>
  );
}

function ConversationThread({ orderId, notes, pending, onAdd }: {
  orderId: string; notes: OrderNote[]; pending: boolean;
  onAdd: (texto: string, done: () => void) => void;
}) {
  const [text, setText] = useState("");
  void orderId;
  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card">
      <Header icon={<MessageSquarePlus className="size-4" />} title="Conversación del pedido" />
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground">Anota aquí lo que se habla con el cliente (“lo quiere en azul”, “entrega urgente”…). Queda guardado.</p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg border border-border bg-background/40 p-3">
            <p className="whitespace-pre-wrap text-sm">{n.texto}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{fechaHora(n.created_at)}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-border p-3">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
          placeholder="Escribe una nota…" className="text-sm" />
        <Button variant="outline" size="sm" className="mt-2 w-full" disabled={pending || !text.trim()}
          onClick={() => onAdd(text, () => setText(""))}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <MessageSquarePlus className="size-4" />}
          Añadir nota
        </Button>
      </div>
    </section>
  );
}

function InvoiceSection({ invoice, nombre, waPhone, pending, onGenerate }: {
  invoice: Invoice | null; nombre: string; waPhone: string; pending: boolean;
  onGenerate: (esFiscal: boolean) => void;
}) {
  // Sin factura/recibo todavía: generar directo desde el pedido (sin contrato).
  if (!invoice) {
    return (
      <section className="rounded-xl border border-border bg-card">
        <Header icon={<ReceiptText className="size-4" />} title="Factura / Recibo" right={
          <Badge>Sin emitir</Badge>
        } />
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            Cobra ya — sin esperar contrato. Emite un <strong>recibo</strong> para cobros rápidos o una <strong>factura fiscal</strong> para lo formal.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="gradient" size="sm" onClick={() => onGenerate(false)} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Receipt className="size-4" />} Generar recibo
            </Button>
            <Button variant="outline" size="sm" onClick={() => onGenerate(true)} disabled={pending}>
              <ReceiptText className="size-4" /> Generar factura fiscal
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const esRecibo = !invoice.es_fiscal;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card"
    >
      <Header icon={<ReceiptText className="size-4" />} title={esRecibo ? "Recibo" : "Factura"} right={
        <Badge dot={invoice.estado_pago === "pagado" ? "var(--success)" : "var(--warning)"}>
          {invoice.estado_pago}
        </Badge>
      } />
      <div className="p-4 text-sm">
        <div className="ml-auto max-w-xs space-y-1">
          <Line label="Subtotal" value={money(invoice.subtotal, invoice.moneda)} />
          <Line label="ITBIS" value={money(invoice.itbis, invoice.moneda)} />
          <div className="flex items-center justify-between border-t border-border pt-1 font-semibold">
            <span>Total</span><span>{money(invoice.total, invoice.moneda)}</span>
          </div>
        </div>
        {!esRecibo && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>NCF: {invoice.ncf ?? "PENDIENTE (módulo fiscal)"}</span>
            <span>· RNC: {invoice.rnc ?? "—"}</span>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`/api/pdf/invoice/${invoice.id}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm"><Download className="size-4" /> PDF {esRecibo ? "recibo" : "factura"}</Button>
          </a>
          {waPhone && (
            <a target="_blank" rel="noopener noreferrer"
              href={`https://wa.me/${waPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${nombre}, te comparto tu ${esRecibo ? "recibo" : "factura"} por ${money(invoice.total, invoice.moneda)}.`)}`}>
              <Button variant="outline" size="sm" className="text-success"><MessageCircle className="size-4" /> Enviar</Button>
            </a>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function ProgressSection({ order, project, milestones, updates, pending, onStart }: {
  order: Order; project: Row<"projects"> | null;
  milestones: Row<"project_milestones">[]; updates: Row<"project_updates">[];
  pending: boolean; onStart: () => void;
}) {
  // Sin trabajo iniciado todavía: un solo paso para empezar a registrar avance.
  if (!project) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
        <ListChecks className="mx-auto size-8 text-electric" />
        <h3 className="mt-2 font-medium">Seguimiento del trabajo</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Este pedido <strong>es</strong> el trabajo. Inicia su seguimiento para marcar etapas y avances —
          el cliente los verá en su portal en una línea de tiempo premium.
        </p>
        <Button variant="gradient" className="mt-4" onClick={onStart} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ListChecks className="size-4" />} Iniciar seguimiento
        </Button>
      </section>
    );
  }

  // Con trabajo: estado + línea de tiempo + feed (lo mismo que ve el cliente).
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <ListChecks className="size-4 text-electric" />
        <h3 className="font-semibold">Progreso del trabajo</h3>
        <span className="text-xs text-muted-foreground">— lo que el cliente ve en su portal</span>
      </div>
      <ProjectManager
        clientId={order.client_id}
        projects={[{
          id: project.id,
          nombre: project.nombre ?? `Pedido · ${fechaCorta(order.fecha)}`,
          estado: project.estado,
          fecha_inicio: project.fecha_inicio,
          fecha_entrega: project.fecha_entrega,
          precio_total: project.precio_total,
          moneda: project.moneda,
        }]}
        milestones={milestones}
        updates={updates}
      />
    </section>
  );
}

function Header({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
      <h3 className="flex items-center gap-2 font-semibold"><span className="text-electric">{icon}</span>{title}</h3>
      {right}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span><span>{value}</span>
    </div>
  );
}
