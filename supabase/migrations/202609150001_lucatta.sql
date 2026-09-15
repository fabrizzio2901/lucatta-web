create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.catalog_options (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('PRODUCT','PRODUCT_TYPE','PORTION','BREAD_FLAVOR','FILLING','COLOR','TIME_SLOT','PRESENTATION')),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  description text,
  image_url text,
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (kind, slug)
);

drop trigger if exists catalog_options_updated_at on public.catalog_options;
create trigger catalog_options_updated_at before update on public.catalog_options
for each row execute function public.set_updated_at();

create table if not exists public.business_settings (
  id smallint primary key default 1 check (id = 1),
  timezone text not null default 'America/Mexico_City',
  whatsapp_open time not null default '09:00',
  whatsapp_close time not null default '19:00',
  store_open time not null default '09:00',
  store_close time not null default '19:00',
  address text not null default 'Nacional 54, San Juan, 72990 Casa Blanca, Puebla.',
  maps_url text not null default 'https://maps.app.goo.gl/CKTmGzaT1Noo3g2e7',
  accepting_orders boolean not null default true,
  paused_message text not null default 'Por el momento ya no recibimos más pedidos para esa fecha.',
  booking_recommended_days integer not null default 3 check (booking_recommended_days >= 0),
  booking_min_calendar_days integer not null default 1 check (booking_min_calendar_days >= 0),
  same_day_min_hours integer not null default 5 check (same_day_min_hours >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists business_settings_updated_at on public.business_settings;
create trigger business_settings_updated_at before update on public.business_settings
for each row execute function public.set_updated_at();

create table if not exists public.closures (
  id uuid primary key default gen_random_uuid(),
  starts_on date not null,
  ends_on date not null,
  kind text not null check (kind in ('VACACIONES','CIERRE_ESPECIAL','NO_DISPONIBLE')),
  message text not null,
  resumes_on date not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (ends_on >= starts_on),
  check (resumes_on > ends_on)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique default ('LUC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  status text not null default 'NUEVA_SOLICITUD' check (status in (
    'BORRADOR','NUEVA_SOLICITUD','EN_REVISION','COTIZADA','RESERVA_PENDIENTE',
    'ANTICIPO_EN_REVISION','CONFIRMADA','EN_PRODUCCION','LISTA','ENTREGADA','CANCELADA'
  )),
  customer_name text not null,
  whatsapp text not null,
  category text not null,
  requested_date date not null,
  requested_time time not null,
  fulfillment text not null check (fulfillment in ('RECOGIDA','DOMICILIO')),
  details jsonb not null default '{}'::jsonb,
  reference_image_path text,
  quote_total numeric(12,2),
  quote_notes text,
  quote_expires_at timestamptz,
  deposit_amount numeric(12,2),
  payment_status text not null default 'SIN_ANTICIPO',
  source text not null default 'WEB',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_whatsapp_idx on public.orders (whatsapp);
create index if not exists orders_requested_date_idx on public.orders (requested_date);

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  whatsapp text not null unique,
  display_name text,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at before update on public.customers
for each row execute function public.set_updated_at();

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  state text not null default 'MENU',
  context jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists conversations_updated_at on public.conversations;
create trigger conversations_updated_at before update on public.conversations
for each row execute function public.set_updated_at();

create table if not exists public.inbound_events (
  id bigint generated always as identity primary key,
  provider_message_id text not null unique,
  whatsapp text not null,
  message_type text not null,
  text_content text,
  action_id text,
  media_id text,
  received_at timestamptz not null default timezone('utc', now()),
  raw_payload jsonb not null default '{}'::jsonb
);

create table if not exists public.outbox (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'WHATSAPP',
  recipient text not null,
  message_type text not null default 'TEXT',
  payload jsonb not null,
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','SENT','FAILED')),
  available_at timestamptz not null default timezone('utc', now()),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);

create index if not exists outbox_pending_idx on public.outbox (status, available_at);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_email text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.cleanup_lucatta_data(cutoff timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.inbound_events where received_at < cutoff;
  delete from public.outbox where created_at < cutoff and status in ('SENT','FAILED');
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

insert into public.business_settings (id) values (1) on conflict (id) do nothing;

alter table public.catalog_options enable row level security;
alter table public.business_settings enable row level security;
alter table public.closures enable row level security;
alter table public.orders enable row level security;
alter table public.customers enable row level security;
alter table public.conversations enable row level security;
alter table public.inbound_events enable row level security;
alter table public.outbox enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.catalog_options from anon, authenticated;
revoke all on public.business_settings from anon, authenticated;
revoke all on public.closures from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.customers from anon, authenticated;
revoke all on public.conversations from anon, authenticated;
revoke all on public.inbound_events from anon, authenticated;
revoke all on public.outbox from anon, authenticated;
revoke all on public.audit_log from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog', 'catalog', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-references', 'order-references', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
