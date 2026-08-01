-- ============================================================================
-- JM CONTROL CENTER — Asistente: contador de preguntas frecuentes
-- Una fila por intención (deudas, cobros, finanzas…) con cuántas veces se usó y
-- si el owner la fijó como favorita. Las más usadas suben a los accesos rápidos.
-- Owner-only, RLS + FORCE. No guarda el texto de las preguntas, solo el uso.
-- ============================================================================

create table if not exists public.assistant_faq (
  id         uuid primary key default gen_random_uuid(),
  intent     text not null unique,
  label      text,
  uso        integer not null default 0,
  favorita   boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assistant_faq enable row level security;
alter table public.assistant_faq force row level security;
drop policy if exists owner_assistant_faq on public.assistant_faq;
create policy owner_assistant_faq on public.assistant_faq for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
grant all on public.assistant_faq to authenticated;

drop trigger if exists trg_touch_assistant_faq on public.assistant_faq;
create trigger trg_touch_assistant_faq before update on public.assistant_faq
  for each row execute function public.fn_touch_updated_at();

-- FIN
