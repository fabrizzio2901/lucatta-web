import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/admin-auth';
import { adminErrorResponse } from '@/lib/admin-catalog';
import type { Closure, OrderRecord } from '@/lib/lucatta-types';
import { supabaseFetch } from '@/lib/supabase-rest';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireOwner();
    const items = await supabaseFetch<Closure[]>(
      '/rest/v1/closures?select=*&order=starts_on.desc',
    );
    return NextResponse.json({ ok: true, items });
  } catch (cause) {
    return adminErrorResponse(cause, 'No fue posible cargar los cierres.');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireOwner();
    const value = (await request.json()) as Partial<Closure>;
    const starts = String(value.starts_on || '');
    const ends = String(value.ends_on || '');
    const resumes = String(value.resumes_on || '');
    if (!starts || !ends || !resumes || ends < starts || resumes <= ends) {
      throw new Error('Revisa las fechas del cierre y del regreso.');
    }
    const pending = await supabaseFetch<Pick<OrderRecord, 'public_code'>[]>(
      `/rest/v1/orders?requested_date=gte.${starts}&requested_date=lte.${ends}&status=not.in.(ENTREGADA,CANCELADA)&select=public_code&limit=10`,
    );
    if (pending.length) {
      return NextResponse.json(
        {
          ok: false,
          conflict: true,
          error: `Hay ${pending.length} pedido(s) activo(s) dentro del periodo. Revísalos antes de cerrar.`,
          orders: pending.map((order) => order.public_code),
        },
        { status: 409 },
      );
    }
    const payload = {
      starts_on: starts,
      ends_on: ends,
      resumes_on: resumes,
      kind: value.kind || 'CIERRE_ESPECIAL',
      message:
        String(value.message || '').trim() ||
        'No habrá servicio durante este periodo.',
    };
    const rows = await supabaseFetch<Closure[]>('/rest/v1/closures', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    await supabaseFetch('/rest/v1/audit_log', {
      method: 'POST',
      body: JSON.stringify({
        actor_email: user.email,
        action: 'CREATE',
        entity_type: 'closure',
        entity_id: rows[0]?.id,
        changes: payload,
      }),
    });
    return NextResponse.json({ ok: true, item: rows[0] });
  } catch (cause) {
    return adminErrorResponse(cause, 'No fue posible crear el cierre.');
  }
}
