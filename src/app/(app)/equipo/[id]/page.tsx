import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { getMemberFull } from "@/lib/data/equipo";
import { MemberDetail } from "@/components/equipo/member-detail";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getMemberFull(id);
  if (!data) notFound();
  const { member, tasks, payments, totals } = data;

  const supabase = await createClient();
  const { data: projs } = await supabase.from("projects").select("id, nombre").order("created_at", { ascending: false }).limit(100);
  const projects = ((projs ?? []) as { id: string; nombre: string | null }[]).map((p) => ({ id: p.id, nombre: p.nombre ?? "Proyecto" }));

  const wa = (member.whatsapp ?? member.telefono ?? "").replace(/\D/g, "");

  return (
    <div className="space-y-5">
      <Link href="/equipo" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Equipo
      </Link>
      <PageHeader title={member.nombre} subtitle={member.rol_especialidad ?? "Miembro del equipo"}>
        {wa && (
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2 text-success"><MessageCircle className="size-4" /> WhatsApp</Button>
          </a>
        )}
        {!member.activo && <Badge>Inactivo</Badge>}
      </PageHeader>
      <MemberDetail member={member} tasks={tasks} payments={payments} totals={totals} projects={projects} />
    </div>
  );
}
