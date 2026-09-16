import { NextResponse } from 'next/server';
import { enqueueWhatsapp, withinServiceHours } from '@/lib/lucatta-automation';
import type {
  OrderDraft,
  OrderRecord,
  PaymentReceipt,
} from '@/lib/lucatta-types';
import { deleteObject, supabaseFetch } from '@/lib/supabase-rest';

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
    const now = new Date();
    const nowIso = now.toISOString();
    const reminderLimit = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const site =
      process.env.NEXT_PUBLIC_SITE_URL || 'https://lucatta-web.vercel.app';
    let depositReminders = 0;
    let expiredReservations = 0;
    let abandonedReminders = 0;

    const [reservationsToRemind, expiredReservationRows] = await Promise.all([
      supabaseFetch<
        Pick<
          OrderRecord,
          'id' | 'public_code' | 'whatsapp' | 'quote_expires_at'
        >[]
      >(
        `/rest/v1/orders?status=eq.RESERVA_PENDIENTE&quote_expires_at=gt.${encodeURIComponent(nowIso)}&quote_expires_at=lte.${encodeURIComponent(reminderLimit.toISOString())}&select=id,public_code,whatsapp,quote_expires_at`,
      ),
      supabaseFetch<
        Pick<
          OrderRecord,
          'id' | 'public_code' | 'whatsapp' | 'quote_expires_at'
        >[]
      >(
        `/rest/v1/orders?status=eq.RESERVA_PENDIENTE&quote_expires_at=lt.${encodeURIComponent(nowIso)}&select=id,public_code,whatsapp,quote_expires_at`,
      ),
    ]);

    for (const order of reservationsToRemind) {
      await enqueueWhatsapp(
        order.whatsapp,
        {
          text: `Recordatorio de Lucátta: la reserva temporal de ${order.public_code} vence hoy a las 00:00. Envíanos tu comprobante por este chat; si llega antes del vencimiento, conservaremos el espacio hasta concluir la verificación.`,
        },
        'TEXT',
        `deposit-reminder:${order.id}:${order.quote_expires_at}`,
      );
      depositReminders += 1;
    }

    for (const order of expiredReservationRows) {
      await supabaseFetch(`/rest/v1/orders?id=eq.${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'COTIZADA',
          payment_status: 'SIN_ANTICIPO',
          quote_expires_at: null,
        }),
      });
      await enqueueWhatsapp(
        order.whatsapp,
        {
          text: `La reserva temporal de ${order.public_code} venció porque no recibimos el comprobante antes de las 00:00. Tu cotización sigue registrada, pero necesitaremos volver a revisar disponibilidad antes de reservar.`,
        },
        'TEXT',
        `reservation-expired:${order.id}:${order.quote_expires_at}`,
      );
      expiredReservations += 1;
    }

    const draftCutoff = new Date(now.getTime() - 45 * 60 * 1000);
    const whatsappWindowCutoff = new Date(now.getTime() - 23 * 60 * 60 * 1000);
    const drafts = await supabaseFetch<OrderDraft[]>(
      `/rest/v1/order_drafts?status=eq.OPEN&reminder_sent_at=is.null&last_activity_at=lte.${encodeURIComponent(draftCutoff.toISOString())}&select=*&order=last_activity_at.asc&limit=100`,
    );
    if (withinServiceHours(now)) {
      for (const draft of drafts) {
        if (new Date(draft.last_activity_at) < whatsappWindowCutoff) {
          await supabaseFetch(`/rest/v1/order_drafts?id=eq.${draft.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'ABANDONED' }),
          });
          continue;
        }
        await enqueueWhatsapp(
          draft.whatsapp,
          {
            text: `Hola, ${draft.customer_name}. Tu solicitud en Lucátta quedó sin terminar. Puedes retomarla aquí: ${site}/pedido\n\nSi ya no la necesitas, no hace falta responder.`,
          },
          'TEXT',
          `draft-reminder:${draft.id}`,
        );
        await supabaseFetch(`/rest/v1/order_drafts?id=eq.${draft.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'ABANDONED',
            reminder_sent_at: nowIso,
          }),
        });
        abandonedReminders += 1;
      }
    }

    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - 1);
    const monthAgo = cutoff.toISOString();
    const retentionOrders = await supabaseFetch<
      { id: string; reference_image_path: string | null }[]
    >(
      `/rest/v1/orders?status=in.(ENTREGADA,CANCELADA)&updated_at=lt.${encodeURIComponent(monthAgo)}&select=id,reference_image_path`,
    );
    const paths = retentionOrders.flatMap((order) =>
      order.reference_image_path ? [order.reference_image_path] : [],
    );
    await deleteObject('order-references', paths);
    if (retentionOrders.length) {
      const ids = retentionOrders.map((order) => order.id).join(',');
      const receipts = await supabaseFetch<
        Pick<PaymentReceipt, 'storage_path'>[]
      >(`/rest/v1/payment_receipts?order_id=in.(${ids})&select=storage_path`);
      await deleteObject(
        'payment-receipts',
        receipts.map((receipt) => receipt.storage_path),
      );
    }
    await supabaseFetch('/rest/v1/rpc/cleanup_lucatta_data', {
      method: 'POST',
      body: JSON.stringify({ cutoff: monthAgo }),
    });
    return NextResponse.json({
      ok: true,
      retained_from: monthAgo,
      deposit_reminders: depositReminders,
      expired_reservations: expiredReservations,
      abandoned_reminders: abandonedReminders,
    });
  } catch (cause) {
    console.error('Lucatta scheduler failed', cause);
    return NextResponse.json(
      { ok: false, error: 'No fue posible ejecutar el mantenimiento.' },
      { status: 500 },
    );
  }
}
