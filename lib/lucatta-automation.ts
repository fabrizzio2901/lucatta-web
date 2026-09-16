import { supabaseFetch } from '@/lib/supabase-rest';

export async function enqueueWhatsapp(
  recipient: string,
  payload: Record<string, unknown>,
  messageType = 'TEXT',
  dedupeKey?: string,
) {
  const path = dedupeKey
    ? '/rest/v1/outbox?on_conflict=dedupe_key'
    : '/rest/v1/outbox';
  await supabaseFetch(path, {
    method: 'POST',
    headers: dedupeKey
      ? { Prefer: 'resolution=ignore-duplicates,return=minimal' }
      : undefined,
    body: JSON.stringify({
      recipient,
      message_type: messageType,
      payload,
      dedupe_key: dedupeKey || null,
    }),
  });
}

export function mexicoDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== 'literal') result[part.type] = part.value;
      return result;
    }, {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function reservationExpiryIso(date = new Date()) {
  const local = mexicoDateParts(date);
  return new Date(`${local.date}T23:59:59-06:00`).toISOString();
}

export function withinServiceHours(date = new Date()) {
  const { hour } = mexicoDateParts(date);
  return hour >= 9 && hour < 19;
}
