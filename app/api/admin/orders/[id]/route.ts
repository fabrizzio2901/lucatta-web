import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/admin-auth';
import { adminErrorResponse } from '@/lib/admin-catalog';
import type { OrderRecord } from '@/lib/lucatta-types';
import { supabaseFetch } from '@/lib/supabase-rest';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
const statuses = new Set([
  'NUEVA_SOLICITUD',
  'EN_REVISION',
  'COTIZADA',
  'RESERVA_PENDIENTE',
  'ANTICIPO_EN_REVISION',
  'CONFIRMADA',
  'EN_PRODUCCION',
  'LISTA',
  'ENTREGADA',
  'CANCELADA',
]);

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireOwner();
    const { id } = await context.params;
    const value = (await request.json()) as Partial<OrderRecord>;
    if (value.status && !statuses.has(value.status))
      throw new Error('Estado no válido.');
    const beforeRows = await supabaseFetch<OrderRecord[]>(
      `/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=*`,
    );
    const before = beforeRows[0];
    if (!before)
      return NextResponse.json(
        { ok: false, error: 'Pedido no encontrado.' },
        { status: 404 },
      );
    const payload: Record<string, unknown> = {};
    if (value.status) payload.status = value.status;
    if (value.quote_total !== undefined)
      payload.quote_total = value.quote_total;
    if (value.quote_notes !== undefined)
      payload.quote_notes = value.quote_notes;
    const rows = await supabaseFetch<OrderRecord[]>(
      `/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      },
    );
    if (!rows[0])
      return NextResponse.json(
        { ok: false, error: 'Pedido no encontrado.' },
        { status: 404 },
      );
    const order = rows[0];
    const quoteChanged =
      before.status !== 'COTIZADA' ||
      before.quote_total !== order.quote_total ||
      before.quote_notes !== order.quote_notes;
    if (
      value.status === 'COTIZADA' &&
      order.quote_total !== null &&
      quoteChanged
    ) {
      const amount = Number(order.quote_total).toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
      });
      await supabaseFetch('/rest/v1/outbox', {
        method: 'POST',
        body: JSON.stringify({
          recipient: order.whatsapp,
          message_type: 'QUOTE',
          payload: {
            text: `Tu cotización ${order.public_code} está lista.\nTotal: ${amount}${order.quote_notes ? `\n${order.quote_notes}` : ''}\n\nPara reservar se requiere el anticipo indicado por Lucátta.`,
            actions: [
              { id: `quote_accept:${order.id}`, title: 'Quiero reservar' },
              { id: `order_edit:${order.id}`, title: 'Ajustar' },
              { id: `order_cancel:${order.id}`, title: 'Por ahora no' },
            ],
          },
        }),
      });
    }
    await supabaseFetch('/rest/v1/audit_log', {
      method: 'POST',
      body: JSON.stringify({
        actor_email: user.email,
        action: 'UPDATE',
        entity_type: 'order',
        entity_id: id,
        changes: payload,
      }),
    });
    return NextResponse.json({ ok: true, item: order });
  } catch (cause) {
    return adminErrorResponse(cause, 'No fue posible actualizar el pedido.');
  }
}
