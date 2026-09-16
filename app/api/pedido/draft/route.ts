import { NextResponse } from 'next/server';
import type { OrderDraft } from '@/lib/lucatta-types';
import { supabaseFetch } from '@/lib/supabase-rest';

export const runtime = 'nodejs';

type DraftPayload = {
  id?: string;
  nombre?: string;
  whatsapp?: string;
  aceptaAviso?: boolean;
  [key: string]: unknown;
};

export async function POST(request: Request) {
  try {
    const value = (await request.json()) as DraftPayload;
    const id = String(value.id || '').trim();
    const name = String(value.nombre || '')
      .trim()
      .slice(0, 120);
    const whatsapp = String(value.whatsapp || '').replace(/\D/g, '');
    if (!name || whatsapp.length !== 10 || value.aceptaAviso !== true) {
      return NextResponse.json(
        { ok: false, error: 'El borrador todavía no tiene datos de contacto.' },
        { status: 400 },
      );
    }

    const payload = { ...value };
    delete payload.id;
    const now = new Date().toISOString();
    let rows: OrderDraft[];
    if (id) {
      rows = await supabaseFetch<OrderDraft[]>(
        `/rest/v1/order_drafts?id=eq.${encodeURIComponent(id)}&whatsapp=eq.${whatsapp}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            customer_name: name,
            payload,
            status: 'OPEN',
            last_activity_at: now,
          }),
        },
      );
      if (!rows.length) {
        return NextResponse.json(
          { ok: false, error: 'El borrador ya no está disponible.' },
          { status: 404 },
        );
      }
    } else {
      rows = await supabaseFetch<OrderDraft[]>('/rest/v1/order_drafts', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          customer_name: name,
          whatsapp,
          payload,
          last_activity_at: now,
        }),
      });
    }

    return NextResponse.json({ ok: true, id: rows[0]?.id });
  } catch (cause) {
    console.error('Lucatta draft save failed', cause);
    return NextResponse.json(
      { ok: false, error: 'No fue posible guardar el avance.' },
      { status: 500 },
    );
  }
}
