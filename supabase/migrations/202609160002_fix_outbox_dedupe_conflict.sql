-- PostgREST's `on_conflict=dedupe_key` cannot infer the existing partial
-- unique index. A regular unique index still allows multiple NULL values and
-- gives PostgreSQL a compatible conflict target for idempotent messages.
create unique index if not exists outbox_dedupe_key_full_idx
  on public.outbox (dedupe_key);
