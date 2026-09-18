import { NextResponse } from 'next/server';
import type { BusinessSettings, OrderRecord } from '@/lib/lucatta-types';
import {
  createOrderEditToken,
  createWhatsappHandoffToken,
  enqueueWhatsapp,
  reservationExpiryIso,
  withinServiceHours,
} from '@/lib/lucatta-automation';
import {
  firstName,
  formatDateEs,
  formatMoney,
  locationMessage,
  statusLabel,
  welcomeMessage,
} from '@/lib/lucatta-copy';
import { isReceiptMimeType } from '@/lib/lucatta-media';
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

function normalizeWhatsapp(value?: string) {
  const digits = String(value || '').replace(/\D/g, '');
  // Meta can still send Mexican mobile numbers with the legacy 521 prefix.
  if (digits.startsWith('521') && digits.length === 13) return digits.slice(3);
  if (digits.startsWith('52') && digits.length === 12) return digits.slice(2);
  return digits;
}

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
    const message = (await request.json()) as Inbound;
    const whatsapp = normalizeWhatsapp(message.from);
    const messageId = String(message.messageId || '');
    if (!whatsapp || !messageId)
      return NextResponse.json({ ok: true, duplicate: false, alerts: [] });

    const duplicate = await supabaseFetch<{ id: number }[]>(
      `/rest/v1/inbound_events?provider_message_id=eq.${encodeURIComponent(messageId)}&select=id&limit=1`,
    );
    if (duplicate.length)
      return NextResponse.json({ ok: true, duplicate: true, alerts: [] });

    const profileName = String(message.profileName || '').trim();
    const customerPayload: Record<string, unknown> = {
      whatsapp,
      last_seen_at: new Date().toISOString(),
    };
    if (profileName) customerPayload.display_name = profileName;
    const customers = await supabaseFetch<
      { id: string; display_name: string | null }[]
    >('/rest/v1/customers?on_conflict=whatsapp', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(customerPayload),
    });
    const customer = customers[0];
    let conversationState = 'MENU';
    if (customer) {
      const conversations = await supabaseFetch<{ state: string }[]>(
        '/rest/v1/conversations?on_conflict=customer_id',
        {
          method: 'POST',
          headers: {
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify({
            customer_id: customer.id,
            last_message_at: new Date().toISOString(),
          }),
        },
      );
      conversationState = conversations[0]?.state || 'MENU';
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
        media_mime_type: message.mediaMimeType || null,
        raw_payload: message,
      }),
    });

    const action = String(message.actionId || '').toLowerCase();
    const text = String(message.text || '')
      .trim()
      .toLowerCase();
    const requestedMenu = action === 'menu_home' || /^men[uú]$/.test(text);
    const site =
      process.env.NEXT_PUBLIC_SITE_URL || 'https://lucatta-web.vercel.app';
    const alerts: { subject: string; text: string }[] = [];

    const setConversationState = async (state: string) => {
      if (!customer) return;
      await supabaseFetch(
        `/rest/v1/conversations?customer_id=eq.${encodeURIComponent(customer.id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            state,
            last_message_at: new Date().toISOString(),
          }),
        },
      );
      conversationState = state;
    };

    if (message.mediaId && isReceiptMimeType(message.mediaMimeType)) {
      // The receipt endpoint owns the complete transaction: first it stores the
      // file and creates payment_receipts, then it changes the order state and
      // acknowledges the customer. Doing it here caused a race between the two
      // parallel n8n branches and could leave orders without a reviewable file.
      return NextResponse.json({
        ok: true,
        duplicate: false,
        receiptCandidate: true,
        alerts,
      });
    }

    if (['audio', 'video'].includes(String(message.type || '').toLowerCase())) {
      await enqueueWhatsapp(whatsapp, {
        text: [
          'Gracias por tu mensaje 😊',
          '',
          'Por ahora no puedo revisar audios o videos automáticamente.',
          '',
          'Si quieres enviar un comprobante, compártelo como foto, captura o PDF. 🧾',
          '',
          'Para recibir ayuda personal, escribe *ASESOR*. 💜',
        ].join('\n'),
      });
      return NextResponse.json({ ok: true, duplicate: false, alerts });
    }

    if (
      conversationState === 'HUMAN_HANDOFF' &&
      !requestedMenu &&
      !action &&
      !message.mediaId
    ) {
      return NextResponse.json({
        ok: true,
        duplicate: false,
        humanHandoff: true,
        alerts,
      });
    }

    if (requestedMenu) {
      await setConversationState('MENU');
      const [orders, settingsRows] = await Promise.all([
        supabaseFetch<Pick<OrderRecord, 'id'>[]>(
          `/rest/v1/orders?whatsapp=eq.${whatsapp}&status=not.in.(ENTREGADA,CANCELADA)&select=id&limit=1`,
        ),
        supabaseFetch<BusinessSettings[]>(
          '/rest/v1/business_settings?id=eq.1&select=*',
        ),
      ]);
      const settings = settingsRows[0];
      const hasOrders = orders.length > 0;
      const actions = settings?.accepting_orders
        ? [
            { id: 'menu_quote', title: '🎂 Cotizar' },
            ...(hasOrders
              ? [{ id: 'menu_orders', title: '📦 Mis pedidos' }]
              : [{ id: 'menu_location', title: '📍 Horario' }]),
            ...(hasOrders
              ? [{ id: 'menu_location', title: '📍 Horario' }]
              : [{ id: 'menu_human', title: '🙋 Ayuda' }]),
          ]
        : [
            ...(hasOrders
              ? [{ id: 'menu_orders', title: '📦 Mis pedidos' }]
              : []),
            { id: 'menu_location', title: '📍 Horario' },
            { id: 'menu_human', title: '🙋 Ayuda' },
          ];
      await enqueueWhatsapp(
        whatsapp,
        {
          text: `Claro 😊\n\nRegresemos al menú.\n\n${welcomeMessage(customer?.display_name || message.profileName, hasOrders, settings?.accepting_orders !== false, settings?.paused_message)}`,
          actions,
        },
        'MENU',
      );
    } else if (action.startsWith('order_confirm:')) {
      const id = action.split(':')[1];
      const rows = await supabaseFetch<
        Pick<OrderRecord, 'id' | 'public_code' | 'customer_name'>[]
      >(
        `/rest/v1/orders?id=eq.${encodeURIComponent(id)}&whatsapp=eq.${whatsapp}&select=id,public_code,customer_name`,
      );
      if (rows[0]) {
        await supabaseFetch(`/rest/v1/orders?id=eq.${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'EN_REVISION' }),
        });
        const shortName = firstName(rows[0].customer_name);
        const serviceNote = withinServiceHours()
          ? 'Estamos dentro de nuestro horario. El equipo la revisará y te responderá por este mismo chat.'
          : 'En este momento estamos fuera de horario. El equipo comenzará a revisarla a partir de las *9:00*.';
        await enqueueWhatsapp(whatsapp, {
          text: [
            `¡Perfecto${shortName ? `, ${shortName}` : ''}! 💜`,
            '',
            `Ya envié tu solicitud *${rows[0].public_code}* al equipo de Lucátta.`,
            '',
            'Ahora revisaremos:',
            '',
            '✓ Disponibilidad para la fecha',
            '✓ Diseño y detalles solicitados',
            '✓ Posibilidad de elaboración',
            '✓ Precio final',
            '',
            '📌 *Tu fecha todavía no está reservada.*',
            'Quedará apartada cuando recibamos y validemos tu anticipo.',
            '',
            `${serviceNote} 💜`,
          ].join('\n'),
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
      await enqueueWhatsapp(whatsapp, {
        text: [
          'No hay problema 😊💜',
          '',
          'Cancelamos esta solicitud. Como todavía no existía un anticipo verificado, no hay penalización.',
          '',
          'Cuando quieras retomarla, escribe *MENÚ*.',
        ].join('\n'),
      });
    } else if (action.startsWith('order_edit:')) {
      const id = action.split(':')[1];
      const rows = await supabaseFetch<
        Pick<OrderRecord, 'id' | 'public_code' | 'whatsapp'>[]
      >(
        `/rest/v1/orders?id=eq.${encodeURIComponent(id)}&whatsapp=eq.${whatsapp}&select=id,public_code,whatsapp`,
      );
      const order = rows[0];
      if (order) {
        const token = createOrderEditToken(order.id, order.whatsapp);
        const editUrl = `${site}/pedido?edit=${encodeURIComponent(order.id)}&token=${token}`;
        await enqueueWhatsapp(whatsapp, {
          text: [
            '¡Claro! 😊',
            '',
            `Abre tu solicitud *${order.public_code}* para cambiar solamente lo que necesites.`,
            '',
            'Conservaremos la información que ya elegiste y no crearemos un pedido duplicado.',
            '',
            `✏️ ${editUrl}`,
          ].join('\n'),
        });
      }
    } else if (action.startsWith('quote_accept:')) {
      const id = action.split(':')[1];
      const rows = await supabaseFetch<OrderRecord[]>(
        `/rest/v1/orders?id=eq.${encodeURIComponent(id)}&whatsapp=eq.${whatsapp}&select=*`,
      );
      const order = rows[0];
      if (!order) {
        return NextResponse.json({ ok: true, duplicate: false, alerts });
      }
      await supabaseFetch(
        `/rest/v1/orders?id=eq.${encodeURIComponent(id)}&whatsapp=eq.${whatsapp}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'RESERVA_PENDIENTE',
            payment_status: 'SIN_ANTICIPO',
            quote_expires_at: reservationExpiryIso(),
          }),
        },
      );
      const deposit = Number(order.quote_total || 0) / 2;
      await enqueueWhatsapp(whatsapp, {
        text: [
          '¡Perfecto! 💜',
          '',
          'Apartamos temporalmente el espacio hasta las *00:00 de hoy*.',
          '',
          `💰 *Anticipo obligatorio del 50%:* ${formatMoney(deposit)}`,
          '',
          'Para asegurar tu pedido debes cubrir el anticipo completo. Un pago menor al 50% no confirma el pedido ni reserva la fecha.',
          '',
          'Puedes pagar por transferencia, depósito o efectivo, según lo acordado con el equipo.',
          '',
          'Cuando termines, envía aquí mismo la foto, captura o PDF de tu comprobante. 🧾',
          '',
          'Si llega antes de las 00:00, conservaremos el cupo hasta concluir la verificación.',
        ].join('\n'),
        actions: [
          { id: `deposit_paid:${order.id}`, title: '✅ Ya pagué' },
          { id: `deposit_question:${order.id}`, title: '❓ Tengo una duda' },
          { id: `order_cancel:${order.id}`, title: '❌ No continuar' },
        ],
      });
    } else if (action.startsWith('deposit_paid:')) {
      await enqueueWhatsapp(whatsapp, {
        text: [
          '¡Perfecto! 😊',
          '',
          'Envíame ahora tu comprobante aquí abajo. 👇',
          '',
          'Puede ser:',
          '📷 Foto',
          '🖼️ Captura',
          '📄 PDF',
        ].join('\n'),
      });
    } else if (action.startsWith('deposit_question:')) {
      await setConversationState('HUMAN_HANDOFF');
      await enqueueWhatsapp(whatsapp, {
        text: 'Claro 😊\n\nCuéntanos en *un solo mensaje* tu duda para que el equipo pueda ayudarte más rápido. 💜',
      });
      alerts.push({
        subject: `Duda sobre anticipo · ${whatsapp}`,
        text: `${message.profileName || 'Cliente'} solicita ayuda con su anticipo. Revisa WhatsApp.`,
      });
    } else if (
      action === 'menu_quote' ||
      /cotizar|pedido nuevo|nuevo pedido/.test(text)
    ) {
      await enqueueWhatsapp(whatsapp, {
        text: `¡Perfecto${firstName(customer?.display_name || message.profileName) ? `, ${firstName(customer?.display_name || message.profileName)}` : ''}! ✨\n\n¿Qué estás buscando?`,
        actions: [
          { id: 'quote_cake', title: '🎂 Pastel' },
          { id: 'quote_desserts', title: '🧁 Postres' },
          { id: 'quote_help', title: '🤔 Ayúdame' },
        ],
      });
    } else if (action === 'quote_cake') {
      const handoff = createWhatsappHandoffToken(whatsapp);
      await enqueueWhatsapp(whatsapp, {
        text: [
          '¡Perfecto! 🎂',
          '',
          'Vamos a armar tu pastel.',
          '',
          'Podrás elegir el tamaño, sabores, relleno, colores y los demás detalles para que preparemos una cotización personalizada. 💜',
          '',
          `🎂 *Armar mi pastel*\n${site}/pedido?categoria=PASTEL&contact=${encodeURIComponent(handoff)}`,
        ].join('\n'),
      });
    } else if (action === 'quote_desserts') {
      const handoff = createWhatsappHandoffToken(whatsapp);
      await enqueueWhatsapp(whatsapp, {
        text: [
          '¡Claro! 🧁✨',
          '',
          'Vamos a preparar tu solicitud de postres.',
          '',
          'Podrás seleccionar lo que necesitas, la cantidad y la fecha.',
          '',
          `🧁 *Elegir mis postres*\n${site}/pedido?categoria=POSTRE&contact=${encodeURIComponent(handoff)}`,
        ].join('\n'),
      });
    } else if (action === 'quote_help') {
      await setConversationState('HUMAN_HANDOFF');
      await enqueueWhatsapp(whatsapp, {
        text: [
          'No pasa nada 😊',
          '',
          'También podemos ayudarte a encontrar algo que se adapte a lo que necesitas.',
          '',
          'Cuéntanos en *un solo mensaje* qué celebras, para cuántas personas y qué idea tienes. 💜',
        ].join('\n'),
      });
      alerts.push({
        subject: `Cliente necesita orientación · ${whatsapp}`,
        text: `${message.profileName || 'Cliente'} necesita ayuda para elegir un producto. Revisa WhatsApp.`,
      });
    } else if (
      action === 'menu_location' ||
      /horario|ubicaci[oó]n|direcci[oó]n|d[oó]nde est[aá]n/.test(text)
    ) {
      const settingsRows = await supabaseFetch<BusinessSettings[]>(
        '/rest/v1/business_settings?id=eq.1&select=*',
      );
      await enqueueWhatsapp(whatsapp, {
        text: locationMessage(settingsRows[0]),
        actions: [
          { id: 'menu_quote', title: '🎂 Hacer pedido' },
          { id: 'menu_home', title: '🏠 Menú' },
        ],
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
        ? [
            `¡Claro${firstName(customer?.display_name || message.profileName) ? `, ${firstName(customer?.display_name || message.profileName)}` : ''}! 📦`,
            '',
            'Encontré estos pedidos:',
            '',
            ...orders.flatMap((order) => [
              `🔖 *${order.public_code}*`,
              `📅 ${formatDateEs(order.requested_date)}`,
              `📌 ${statusLabel(order.status)}`,
              '',
            ]),
            'Si necesitas revisar un detalle, escribe *ASESOR*.',
          ].join('\n')
        : 'No encontré pedidos activos ligados a este número.\n\nSi crees que falta alguno, escribe *ASESOR* y te ayudamos. 💜';
      await enqueueWhatsapp(whatsapp, {
        text: body,
        actions: [
          { id: 'menu_human', title: '🙋 Necesito ayuda' },
          { id: 'menu_home', title: '🏠 Menú' },
        ],
      });
    } else if (
      action === 'menu_human' ||
      /persona|asesor|ayuda humana/.test(text)
    ) {
      await setConversationState('HUMAN_HANDOFF');
      await enqueueWhatsapp(whatsapp, {
        text: `¡Claro${firstName(customer?.display_name || message.profileName) ? `, ${firstName(customer?.display_name || message.profileName)}` : ''}! 💜\n\nDejaré la conversación con nuestro equipo para que puedan ayudarte personalmente.\n\nCuéntanos en *un solo mensaje* qué necesitas para atenderte más rápido. 😊`,
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
      const hasOrders = orders.length > 0;
      const acceptingOrders = settings?.accepting_orders !== false;
      const actions = acceptingOrders
        ? [
            { id: 'menu_quote', title: '🎂 Cotizar' },
            ...(hasOrders
              ? [{ id: 'menu_orders', title: '📦 Mis pedidos' }]
              : [{ id: 'menu_location', title: '📍 Horario' }]),
            ...(hasOrders
              ? [{ id: 'menu_location', title: '📍 Horario' }]
              : [{ id: 'menu_human', title: '🙋 Ayuda' }]),
          ]
        : [
            ...(hasOrders
              ? [{ id: 'menu_orders', title: '📦 Mis pedidos' }]
              : []),
            { id: 'menu_location', title: '📍 Horario' },
            { id: 'menu_human', title: '🙋 Ayuda' },
          ];
      await enqueueWhatsapp(
        whatsapp,
        {
          text: welcomeMessage(
            customer?.display_name || message.profileName,
            hasOrders,
            acceptingOrders,
            settings?.paused_message,
          ),
          actions,
        },
        'MENU',
      );
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
