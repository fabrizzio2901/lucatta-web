import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/admin-auth';
import { adminErrorResponse } from '@/lib/admin-catalog';
import { supabaseFetch } from '@/lib/supabase-rest';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireOwner();
    const { id } = await context.params;
    await supabaseFetch(`/rest/v1/closures?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    await supabaseFetch('/rest/v1/audit_log', {
      method: 'POST',
      body: JSON.stringify({
        actor_email: user.email,
        action: 'DELETE',
        entity_type: 'closure',
        entity_id: id,
      }),
    });
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return adminErrorResponse(cause, 'No fue posible eliminar el cierre.');
  }
}
