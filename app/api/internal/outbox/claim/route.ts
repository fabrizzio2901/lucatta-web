import { NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase-rest';

export const runtime = 'nodejs';

type OutboxRow = {
  id: string;
  recipient: string;
  message_type: string;
  payload: {
    text?: string;
    interactive?: unknown;
    actions?: { id: string; title: string }[];
  };
  attempts: number;
};

function authorized(request: Request) {
  const expected = process.env.LUCATTA_AUTOMATION_KEY;
  return Boolean(
    expected && request.headers.get('x-lucatta-automation-key') === expected,
  );
}

function metaContent(row: OutboxRow) {
  if (row.payload.interactive) return { interactive: row.payload.interactive };
  if (row.payload.actions?.length) {
    return {
      interactive: {
        type: 'button',
        body: { text: row.payload.text || '' },
        action: {
          buttons: row.payload.actions.slice(0, 3).map((action) => ({
            type: 'reply',
            reply: {
              id: action.id.slice(0, 256),
              title: action.title.slice(0, 20),
            },
          })),
        },
      },
    };
  }
  return { text: row.payload.text || '' };
}

export async function POST(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    const limit = Math.min(20, Math.max(1, Number(body.limit) || 10));
    const rows = await supabaseFetch<OutboxRow[]>(
      `/rest/v1/outbox?status=eq.PENDING&available_at=lte.${encodeURIComponent(new Date().toISOString())}&select=*&order=created_at.asc&limit=${limit}`,
    );
    if (rows.length) {
      const ids = rows.map((row) => row.id).join(',');
      await supabaseFetch(`/rest/v1/outbox?id=in.(${ids})`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PROCESSING' }),
      });
    }
    return NextResponse.json({
      ok: true,
      messages: rows.map((row) => ({
        salida_id: row.id,
        destino_e164:
          row.recipient.length === 10 ? `52${row.recipient}` : row.recipient,
        contenido: metaContent(row),
      })),
    });
  } catch (cause) {
    console.error('Outbox claim failed', cause);
    return NextResponse.json(
      { ok: false, error: 'No fue posible leer la cola.' },
      { status: 500 },
    );
  }
}
