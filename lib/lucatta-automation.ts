import { supabaseFetch } from '@/lib/supabase-rest';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

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

function editSecret() {
  const secret = process.env.LUCATTA_AUTOMATION_KEY;
  if (!secret) throw new Error('LUCATTA_AUTOMATION_KEY no está configurada.');
  return secret;
}

function handoffKey() {
  return createHash('sha256')
    .update(`${editSecret()}:whatsapp-web-handoff`)
    .digest();
}

export function createWhatsappHandoffToken(
  whatsapp: string,
  date = new Date(),
) {
  const digits = String(whatsapp || '').replace(/\D/g, '');
  if (digits.length !== 10) throw new Error('WhatsApp inválido para enlace.');

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', handoffKey(), iv);
  const payload = Buffer.from(
    JSON.stringify({
      whatsapp: digits,
      expiresAt: date.getTime() + 24 * 60 * 60 * 1000,
    }),
  );
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function readWhatsappHandoffToken(token: string, date = new Date()) {
  try {
    const packed = Buffer.from(String(token || ''), 'base64url');
    if (packed.length < 29) return null;

    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const encrypted = packed.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', handoffKey(), iv);
    decipher.setAuthTag(tag);
    const value = JSON.parse(
      Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
        'utf8',
      ),
    ) as { whatsapp?: string; expiresAt?: number };
    const whatsapp = String(value.whatsapp || '').replace(/\D/g, '');
    if (
      whatsapp.length !== 10 ||
      !value.expiresAt ||
      value.expiresAt < date.getTime()
    ) {
      return null;
    }
    return whatsapp;
  } catch {
    return null;
  }
}

export function createOrderEditToken(orderId: string, whatsapp: string) {
  return createHmac('sha256', editSecret())
    .update(`${orderId}:${whatsapp}`)
    .digest('hex');
}

export function verifyOrderEditToken(
  orderId: string,
  whatsapp: string,
  token: string,
) {
  const expected = createOrderEditToken(orderId, whatsapp);
  const provided = String(token || '').toLowerCase();
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
