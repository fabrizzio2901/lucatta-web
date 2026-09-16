-- Completa el circuito de anticipo, recordatorios y formularios abandonados.

alter table public.orders
  add column if not exists deposit_reviewed_at timestamptz,
  add column if not exists deposit_rejection_reason text,
  add column if not exists confirmed_at timestamptz;

alter table public.inbound_events
  add column if not exists media_mime_type text;

alter table public.outbox
  add column if not exists dedupe_key text;

create unique index if not exists outbox_dedupe_key_idx
  on public.outbox (dedupe_key)
  where dedupe_key is not null;

create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider_message_id text not null unique,
  media_id text,
  mime_type text not null,
  storage_path text not null unique,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  amount numeric(12,2),
  rejection_reason text,
  received_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  reviewed_by text
);

create index if not exists payment_receipts_order_idx
  on public.payment_receipts (order_id, received_at desc);

create table if not exists public.order_drafts (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  whatsapp text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'OPEN' check (status in ('OPEN','CONVERTED','ABANDONED')),
  last_activity_at timestamptz not null default timezone('utc', now()),
  reminder_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists order_drafts_reminder_idx
  on public.order_drafts (status, reminder_sent_at, last_activity_at);

drop trigger if exists order_drafts_updated_at on public.order_drafts;
create trigger order_drafts_updated_at before update on public.order_drafts
for each row execute function public.set_updated_at();

alter table public.payment_receipts enable row level security;
alter table public.order_drafts enable row level security;

revoke all on public.payment_receipts from anon, authenticated;
revoke all on public.order_drafts from anon, authenticated;
grant all privileges on public.payment_receipts to service_role;
grant all privileges on public.order_drafts to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.cleanup_lucatta_data(cutoff timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.inbound_events where received_at < cutoff;
  delete from public.outbox where created_at < cutoff and status in ('SENT','FAILED');
  delete from public.order_drafts
    where updated_at < cutoff and status in ('CONVERTED','ABANDONED');
  delete from public.audit_log
    where entity_type = 'order'
      and entity_id in (
        select id::text from public.orders
        where status in ('ENTREGADA','CANCELADA') and updated_at < cutoff
      );
  delete from public.orders
    where status in ('ENTREGADA','CANCELADA') and updated_at < cutoff;
  delete from public.conversations
    where customer_id in (
      select customer.id from public.customers customer
      where customer.last_seen_at < cutoff
        and not exists (
          select 1 from public.orders active_order
          where active_order.whatsapp = customer.whatsapp
            and active_order.status not in ('ENTREGADA','CANCELADA')
        )
    );
  delete from public.customers customer
    where customer.last_seen_at < cutoff
      and not exists (select 1 from public.conversations where customer_id = customer.id)
      and not exists (
        select 1 from public.orders active_order
        where active_order.whatsapp = customer.whatsapp
          and active_order.status not in ('ENTREGADA','CANCELADA')
      );
end;
$$;

revoke all on function public.cleanup_lucatta_data(timestamptz) from public, anon, authenticated;
grant execute on function public.cleanup_lucatta_data(timestamptz) to service_role;
