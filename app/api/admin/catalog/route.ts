import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/admin-auth';
import type { CatalogOption } from '@/lib/lucatta-types';
import { supabaseFetch } from '@/lib/supabase-rest';
import { adminErrorResponse, cleanCatalogPayload } from '@/lib/admin-catalog';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireOwner();
    const items = await supabaseFetch<CatalogOption[]>(
      '/rest/v1/catalog_options?select=*&order=kind.asc,sort_order.asc,name.asc',
    );
    return NextResponse.json({ ok: true, items });
  } catch (cause) {
    return adminErrorResponse(cause, 'No fue posible cargar el catálogo.');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireOwner();
    const payload = cleanCatalogPayload(
      (await request.json()) as Record<string, unknown>,
    );
    const items = await supabaseFetch<CatalogOption[]>(
      '/rest/v1/catalog_options',
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      },
    );
    const item = items[0];
    await supabaseFetch('/rest/v1/audit_log', {
      method: 'POST',
      body: JSON.stringify({
        actor_email: user.email,
        action: 'CREATE',
        entity_type: 'catalog_option',
        entity_id: item?.id,
        changes: payload,
      }),
    });
    return NextResponse.json({ ok: true, item });
  } catch (cause) {
    return adminErrorResponse(cause, 'No fue posible crear el elemento.');
  }
}
