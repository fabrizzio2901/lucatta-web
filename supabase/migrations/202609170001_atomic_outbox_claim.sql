create or replace function public.claim_lucatta_outbox(batch_limit integer default 10)
returns setof public.outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select queued.id
    from public.outbox as queued
    where queued.status = 'PENDING'
      and queued.available_at <= now()
    order by queued.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(batch_limit, 10), 20))
  )
  update public.outbox as queued
  set status = 'PROCESSING'
  from candidates
  where queued.id = candidates.id
  returning queued.*;
end;
$$;

revoke all on function public.claim_lucatta_outbox(integer) from public;
revoke all on function public.claim_lucatta_outbox(integer) from anon;
revoke all on function public.claim_lucatta_outbox(integer) from authenticated;
grant execute on function public.claim_lucatta_outbox(integer) to service_role;
