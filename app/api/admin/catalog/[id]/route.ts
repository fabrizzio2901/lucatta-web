import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/admin-auth';
import type { CatalogOption } from '@/lib/lucatta-types';
import { deleteObject, supabaseFetch } from '@/lib/supabase-rest';
import { adminErrorResponse, cleanCatalogPayload } from '@/lib/admin-catalog';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireOwner();
    const { id } = await context.params;
    const payload = cleanCatalogPayload(
      (await request.json()) as Record<string, unknown>,
    );
    const items = await supabaseFetch<CatalogOption[]>(
      `/rest/v1/catalog_options?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      },
    );
    if (!items[0])
      return NextResponse.json(
        { ok: false, error: 'Elemento no encontrado.' },
        { status: 404 },
      );
    await supabaseFetch('/rest/v1/audit_log', {
      method: 'POST',
      body: JSON.stringify({
        actor_email: user.email,
        action: 'UPDATE',
        entity_type: 'catalog_option',
        entity_id: id,
        changes: payload,
      }),
    });
    return NextResponse.json({ ok: true, item: items[0] });
  } catch (cause) {
    return adminErrorResponse(cause, 'No fue posible actualizar el elemento.');
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireOwner();
    const { id } = await context.params;
    const existing = await supabaseFetch<CatalogOption[]>(
      `/rest/v1/catalog_options?id=eq.${encodeURIComponent(id)}&select=*`,
    );
    const item = existing[0];
    if (!item)
      return NextResponse.json(
        { ok: false, error: 'Elemento no encontrado.' },
        { status: 404 },
      );
    await supabaseFetch(
      `/rest/v1/catalog_options?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
    );
    if (item.image_url) {
      const marker = '/storage/v1/object/public/catalog/';
      const path = item.image_url.includes(marker)
        ? item.image_url.split(marker)[1]
        : '';
      if (path)
        await deleteObject('catalog', [decodeURIComponent(path)]).catch(
          console.error,
        );
    }
    await supabaseFetch('/rest/v1/audit_log', {
      method: 'POST',
      body: JSON.stringify({
        actor_email: user.email,
        action: 'DELETE',
        entity_type: 'catalog_option',
        entity_id: id,
        changes: { name: item.name, kind: item.kind },
      }),
    });
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return adminErrorResponse(cause, 'No fue posible eliminar el elemento.');
  }
}
