import { NextResponse } from 'next/server';
import { supabaseFetch } from '@/lib/supabase-rest';

export const runtime = 'nodejs';

function authorized(request: Request) {
  const expected = process.env.LUCATTA_AUTOMATION_KEY;
  return Boolean(
    expected && request.headers.get('x-lucatta-automation-key') === expected,
  );
}

export async function POST(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const value = (await request.json()) as {
      salidaId?: string;
      success?: boolean;
      providerMessageId?: string;
      error?: string;
    };
    if (!value.salidaId)
      return NextResponse.json(
        { ok: false, error: 'Falta salidaId.' },
        { status: 400 },
      );
    const existing = await supabaseFetch<{ attempts: number }[]>(
      `/rest/v1/outbox?id=eq.${encodeURIComponent(value.salidaId)}&select=attempts`,
    );
    await supabaseFetch(
      `/rest/v1/outbox?id=eq.${encodeURIComponent(value.salidaId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: value.success ? 'SENT' : 'FAILED',
          attempts: (existing[0]?.attempts || 0) + 1,
          last_error: value.success
            ? null
            : String(value.error || 'Error de Meta').slice(0, 1000),
          sent_at: value.success ? new Date().toISOString() : null,
        }),
      },
    );
    return NextResponse.json({ ok: true });
  } catch (cause) {
    console.error('Outbox complete failed', cause);
    return NextResponse.json(
      { ok: false, error: 'No fue posible registrar el envío.' },
      { status: 500 },
    );
  }
}
