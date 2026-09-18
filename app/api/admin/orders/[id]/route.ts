import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/admin-auth';
import { adminErrorResponse } from '@/lib/admin-catalog';
import {
  enqueueWhatsapp,
  reservationExpiryIso,
} from '@/lib/lucatta-automation';
import type { OrderRecord, PaymentReceipt } from '@/lib/lucatta-types';
import {
  firstName,
  formatDateEs,
  formatMoney,
  formatTime,
  orderProductLabel,
} from '@/lib/lucatta-copy';
import { supabaseFetch } from '@/lib/supabase-rest';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
type PatchOrder = Partial<OrderRecord> & {
  receipt_action?: 'APPROVE' | 'REJECT';
  receipt_id?: string;
  receipt_rejection_reason?: string;
};

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

const paymentStatuses = new Set([
  'SIN_ANTICIPO',
  'EN_REVISION',
  'ANTICIPO_VERIFICADO',
  'COMPROBANTE_RECHAZADO',
  'PAGADO',
]);

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireOwner();
    const { id } = await context.params;
    const value = (await request.json()) as PatchOrder;
    if (value.status && !statuses.has(value.status))
      throw new Error('Estado no válido.');
    if (value.payment_status && !paymentStatuses.has(value.payment_status))
      throw new Error('Estado de pago no válido.');
    if (
      value.deposit_amount !== undefined &&
      value.deposit_amount !== null &&
      (!Number.isFinite(Number(value.deposit_amount)) ||
        Number(value.deposit_amount) < 0)
    ) {
      throw new Error('El anticipo no es válido.');
    }

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
    if (value.deposit_amount !== undefined)
      payload.deposit_amount = value.deposit_amount;
    if (value.payment_status !== undefined)
      payload.payment_status = value.payment_status;

    let reviewedReceipt: PaymentReceipt | null = null;
    if (value.receipt_action) {
      if (!value.receipt_id) throw new Error('Selecciona un comprobante.');
      const receiptRows = await supabaseFetch<PaymentReceipt[]>(
        `/rest/v1/payment_receipts?id=eq.${encodeURIComponent(value.receipt_id)}&order_id=eq.${encodeURIComponent(id)}&select=*`,
      );
      const receipt = receiptRows[0];
      if (!receipt) throw new Error('El comprobante ya no está disponible.');

      if (value.receipt_action === 'APPROVE') {
        const amount = Number(value.deposit_amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Captura el importe recibido antes de aprobar.');
        }
        const reviewedAt = new Date().toISOString();
        const receiptUpdate = await supabaseFetch<PaymentReceipt[]>(
          `/rest/v1/payment_receipts?id=eq.${receipt.id}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({
              status: 'APPROVED',
              amount,
              rejection_reason: null,
              reviewed_at: reviewedAt,
              reviewed_by: user.email,
            }),
          },
        );
        reviewedReceipt = receiptUpdate[0] || null;
        Object.assign(payload, {
          status: 'CONFIRMADA',
          deposit_amount: amount,
          payment_status: 'ANTICIPO_VERIFICADO',
          deposit_reviewed_at: reviewedAt,
          deposit_rejection_reason: null,
          confirmed_at: reviewedAt,
          quote_expires_at: null,
        });
      } else {
        const reason = String(value.receipt_rejection_reason || '').trim();
        if (!reason)
          throw new Error('Explica por qué se rechazó el comprobante.');
        const reviewedAt = new Date().toISOString();
        const receiptUpdate = await supabaseFetch<PaymentReceipt[]>(
          `/rest/v1/payment_receipts?id=eq.${receipt.id}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({
              status: 'REJECTED',
              amount: null,
              rejection_reason: reason,
              reviewed_at: reviewedAt,
              reviewed_by: user.email,
            }),
          },
        );
        reviewedReceipt = receiptUpdate[0] || null;
        Object.assign(payload, {
          status: 'RESERVA_PENDIENTE',
          deposit_amount: null,
          payment_status: 'COMPROBANTE_RECHAZADO',
          deposit_reviewed_at: reviewedAt,
          deposit_rejection_reason: reason,
          quote_expires_at: reservationExpiryIso(),
        });
      }
    } else if (value.status === 'CONFIRMADA' && !before.confirmed_at) {
      payload.confirmed_at = new Date().toISOString();
    }

    const rows = await supabaseFetch<OrderRecord[]>(
      `/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      },
    );
    const order = rows[0];
    if (!order)
      return NextResponse.json(
        { ok: false, error: 'Pedido no encontrado.' },
        { status: 404 },
      );

    const quoteChanged =
      before.status !== 'COTIZADA' ||
      before.quote_total !== order.quote_total ||
      before.quote_notes !== order.quote_notes;
    if (
      value.status === 'COTIZADA' &&
      order.quote_total !== null &&
      quoteChanged
    ) {
      const amount = formatMoney(order.quote_total);
      const deposit = formatMoney(Number(order.quote_total) / 2);
      const shortName = firstName(order.customer_name);
      await enqueueWhatsapp(
        order.whatsapp,
        {
          text: [
            `¡Ya revisamos tu solicitud${shortName ? `, ${shortName}` : ''}! ✨`,
            '',
            'Podemos preparar tu pedido.',
            '',
            `🎂 *${orderProductLabel(order)}*`,
            `📅 *Fecha:* ${formatDateEs(order.requested_date)}`,
            `🕐 *Hora:* ${formatTime(order.requested_time)}`,
            '',
            `💰 *Total:* ${amount} MXN`,
            `💳 *Anticipo obligatorio para reservar (50%):* ${deposit} MXN`,
            '',
            'Para asegurar tu pedido debes cubrir ese importe completo. Un pago menor al 50% no confirma el pedido ni reserva la fecha.',
            ...(order.quote_notes
              ? ['', `📝 *Notas del equipo:* ${order.quote_notes}`]
              : []),
            '',
            'Recuerda que la fecha queda reservada únicamente después de validar el anticipo.',
          ].join('\n'),
          actions: [
            { id: `quote_accept:${order.id}`, title: '💜 Reservar' },
            { id: `order_edit:${order.id}`, title: '✏️ Ajustar' },
            { id: `order_cancel:${order.id}`, title: 'Por ahora no' },
          ],
        },
        'QUOTE',
      );
    }

    if (value.receipt_action === 'APPROVE') {
      const total = Number(order.quote_total || 0);
      const deposit = Number(order.deposit_amount || 0);
      const balance = formatMoney(Math.max(total - deposit, 0));
      const shortName = firstName(order.customer_name);
      await enqueueWhatsapp(
        order.whatsapp,
        {
          text: [
            `¡Listo${shortName ? `, ${shortName}` : ''}! 🎉💜`,
            '',
            'Tu anticipo fue confirmado y ahora sí:',
            '',
            '*¡Tu pedido quedó agendado!*',
            '',
            `🎂 *Pedido:* ${orderProductLabel(order)}`,
            `📅 *Fecha:* ${formatDateEs(order.requested_date)}`,
            `🕐 *Hora:* ${formatTime(order.requested_time)}`,
            '',
            `💰 *Total:* ${formatMoney(total)}`,
            `✅ *Anticipo:* ${formatMoney(deposit)}`,
            `💳 *Saldo pendiente:* ${balance}`,
            '',
            `🔖 *Folio:* ${order.public_code}`,
            '',
            'Puedes pagar el saldo antes o al momento de la entrega.',
            'Guarda este mensaje por si necesitas consultar tu pedido más adelante. 💜',
          ].join('\n'),
        },
        'ORDER_CONFIRMED',
        `order-confirmed:${order.id}`,
      );
    } else if (value.receipt_action === 'REJECT') {
      await enqueueWhatsapp(
        order.whatsapp,
        {
          text: [
            'Necesitamos revisar nuevamente tu comprobante. 🧾',
            '',
            `🔖 *Pedido:* ${order.public_code}`,
            `📌 *Motivo:* ${value.receipt_rejection_reason}`,
            '',
            'Por favor, envía un comprobante nuevo por este chat.',
            '',
            'Conservaremos temporalmente el espacio hasta las *00:00 de hoy*. 💜',
          ].join('\n'),
        },
        'TEXT',
        `receipt-rejected:${value.receipt_id}`,
      );
    }

    await supabaseFetch('/rest/v1/audit_log', {
      method: 'POST',
      body: JSON.stringify({
        actor_email: user.email,
        action: value.receipt_action || 'UPDATE',
        entity_type: 'order',
        entity_id: id,
        changes: payload,
      }),
    });
    return NextResponse.json({
      ok: true,
      item: order,
      receipt: reviewedReceipt,
    });
  } catch (cause) {
    return adminErrorResponse(cause, 'No fue posible actualizar el pedido.');
  }
}
