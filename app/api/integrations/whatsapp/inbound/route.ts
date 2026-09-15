import { NextResponse } from 'next/server';
import type { BusinessSettings, OrderRecord } from '@/lib/lucatta-types';
import { supabaseFetch } from '@/lib/supabase-rest';

export const runtime = 'nodejs';

type Inbound = {
  messageId?: string;
  from?: string;
  profileName?: string;
  type?: string;
  text?: string;
  actionId?: string;
  timestamp?: string;
  mediaId?: string;
  mediaMimeType?: string;
};

function authorized(request: Request) {
  const expected = process.env.LUCATTA_AUTOMATION_KEY;
  return Boolean(
    expected && request.headers.get('x-lucatta-automation-key') === expected,
  );
}

async function enqueue(
  recipient: string,
  payload: Record<string, unknown>,
  messageType = 'TEXT',
) {
  await supabaseFetch('/rest/v1/outbox', {
    method: 'POST',
    body: JSON.stringify({ recipient, message_type: messageType, payload }),
  });
}

export async function POST(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const message = (await request.json()) as Inbound;
    const rawWhatsapp = String(message.from || '').replace(/\D/g, '');
    const whatsapp =
      rawWhatsapp.startsWith('52') && rawWhatsapp.length === 12
        ? rawWhatsapp.slice(2)
        : rawWhatsapp;
    const messageId = String(message.messageId || '');
    if (!whatsapp || !messageId)
      return NextResponse.json({ ok: true, duplicate: false, alerts: [] });

    const duplicate = await supabaseFetch<{ id: number }[]>(
      `/rest/v1/inbound_events?provider_message_id=eq.${encodeURIComponent(messageId)}&select=id&limit=1`,
    );
    if (duplicate.length)
      return NextResponse.json({ ok: true, duplicate: true, alerts: [] });

    const customers = await supabaseFetch<
      { id: string; display_name: string | null }[]
    >('/rest/v1/customers?on_conflict=whatsapp', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        whatsapp,
        display_name: String(message.profileName || '').trim() || null,
        last_seen_at: new Date().toISOString(),
      }),
    });
    const customer = customers[0];
    if (customer) {
      await supabaseFetch('/rest/v1/conversations?on_conflict=customer_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          customer_id: customer.id,
          last_message_at: new Date().toISOString(),
        }),
      });
    }
    await supabaseFetch('/rest/v1/inbound_events', {
      method: 'POST',
      body: JSON.stringify({
        provider_message_id: messageId,
        whatsapp,
        message_type: message.type || 'unknown',
        text_content: message.text || null,
        action_id: message.actionId || null,
        media_id: message.mediaId || null,
        raw_payload: message,
      }),
    });

    const action = String(message.actionId || '').toLowerCase();
    const text = String(message.text || '')
      .trim()
      .toLowerCase();
    const site =
      process.env.NEXT_PUBLIC_SITE_URL || 'https://lucatta-web.vercel.app';
    const alerts: { subject: string; text: string }[] = [];

    if (action.startsWith('order_confirm:')) {
      const id = action.split(':')[1];
      const rows = await supabaseFetch<
        Pick<OrderRecord, 'id' | 'public_code'>[]
      >(
        `/rest/v1/orders?id=eq.${encodeURIComponent(id)}&whatsapp=eq.${whatsapp}&select=id,public_code`,
      );
      if (rows[0]) {
        await supabaseFetch(`/rest/v1/orders?id=eq.${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'EN_REVISION' }),
        });
        await enqueue(whatsapp, {
          text: `¡Gracias! Enviaremos tu solicitud ${rows[0].public_code} a revisión humana. La fecha aún no está reservada.`,
        });
        alerts.push({
          subject: `Nueva solicitud ${rows[0].public_code}`,
          text: `Revisa y cotiza ${rows[0].public_code} desde ${site}/administracion.`,
        });
      }
    } else if (action.startsWith('order_cancel:')) {
      const id = action.split(':')[1];
      await supabaseFetch(
        `/rest/v1/orders?id=eq.${encodeURIComponent(id)}&whatsapp=eq.${whatsapp}`,
        { method: 'PATCH', body: JSON.stringify({ status: 'CANCELADA' }) },
      );
      await enqueue(whatsapp, {
        text: 'Cancelamos esta solicitud. Como todavía no existía un anticipo verificado, no hay penalización.',
      });
    } else if (action.startsWith('order_edit:')) {
      await enqueue(whatsapp, {
        text: `Puedes enviar una versión corregida aquí: ${site}/pedido\nEscribe en observaciones el folio que deseas reemplazar para que no se duplique al revisarlo.`,
      });
    } else if (action.startsWith('quote_accept:')) {
      const id = action.split(':')[1];
      await supabaseFetch(
        `/rest/v1/orders?id=eq.${encodeURIComponent(id)}&whatsapp=eq.${whatsapp}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'RESERVA_PENDIENTE' }),
        },
      );
      await enqueue(whatsapp, {
        text: 'Apartamos temporalmente el espacio hasta las 00:00 de hoy. Envíanos tu comprobante de anticipo por este chat. Si llega antes de las 00:00, conservaremos el cupo hasta concluir la verificación.',
      });
    } else if (
      action === 'menu_quote' ||
      /cotizar|pedido nuevo|nuevo pedido/.test(text)
    ) {
      await enqueue(whatsapp, {
        text: `Perfecto. Abre el configurador visual de Lucátta:\n${site}/pedido\n\nAhí podrás elegir fecha, porciones, sabores, rellenos, colores y agregar una referencia opcional.`,
      });
    } else if (
      action === 'menu_orders' ||
      /ver mi pedido|mi pedido|estatus/.test(text)
    ) {
      const orders = await supabaseFetch<
        Pick<OrderRecord, 'public_code' | 'status' | 'requested_date'>[]
      >(
        `/rest/v1/orders?whatsapp=eq.${whatsapp}&status=not.eq.CANCELADA&select=public_code,status,requested_date&order=created_at.desc&limit=5`,
      );
      const body = orders.length
        ? `Tus pedidos recientes:\n${orders.map((order) => `• ${order.public_code} · ${order.requested_date} · ${order.status.replaceAll('_', ' ')}`).join('\n')}`
        : 'No encontré pedidos activos ligados a este número.';
      await enqueue(whatsapp, { text: body });
    } else if (
      action === 'menu_human' ||
      /persona|asesor|ayuda humana/.test(text)
    ) {
      await enqueue(whatsapp, {
        text: 'Listo. Avisé al equipo de Lucátta para que continúe contigo. El plazo de atención nunca vencerá fuera del horario de 9:00 a 19:00.',
      });
      alerts.push({
        subject: `Cliente solicita atención · ${whatsapp}`,
        text: `${message.profileName || 'Cliente'} solicita atención humana. Revisa WhatsApp.`,
      });
    } else {
      const [orders, settingsRows] = await Promise.all([
        supabaseFetch<Pick<OrderRecord, 'id'>[]>(
          `/rest/v1/orders?whatsapp=eq.${whatsapp}&status=not.in.(ENTREGADA,CANCELADA)&select=id&limit=1`,
        ),
        supabaseFetch<BusinessSettings[]>(
          '/rest/v1/business_settings?id=eq.1&select=*',
        ),
      ]);
      const settings = settingsRows[0];
      if (settings && !settings.accepting_orders) {
        await enqueue(whatsapp, { text: settings.paused_message });
      } else {
        const actions = [
          { id: 'menu_quote', title: 'Cotizar pedido' },
          ...(orders.length
            ? [{ id: 'menu_orders', title: 'Ver mi pedido' }]
            : []),
          { id: 'menu_human', title: 'Hablar con persona' },
        ];
        await enqueue(
          whatsapp,
          {
            text: `Hola${message.profileName ? `, ${message.profileName}` : ''}. Soy Luca, el asistente de Lucátta. ¿Cómo te ayudamos hoy?`,
            actions,
          },
          'MENU',
        );
      }
    }

    return NextResponse.json({ ok: true, duplicate: false, alerts });
  } catch (cause) {
    console.error('WhatsApp inbound failed', cause);
    return NextResponse.json(
      { ok: false, error: 'No fue posible procesar el mensaje.' },
      { status: 500 },
    );
  }
}
