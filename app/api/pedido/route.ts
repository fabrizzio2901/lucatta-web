import { NextResponse } from 'next/server';
import type {
  BusinessSettings,
  Closure,
  OrderRecord,
} from '@/lib/lucatta-types';
import {
  enqueueWhatsapp,
  verifyOrderEditToken,
} from '@/lib/lucatta-automation';
import { orderSummaryMessage } from '@/lib/lucatta-copy';
import {
  ConfigurationError,
  deleteObject,
  supabaseFetch,
  uploadObject,
} from '@/lib/supabase-rest';

export const runtime = 'nodejs';

type PedidoPayload = {
  categoria?: string;
  fecha?: string;
  hora?: string;
  modalidad?: string;
  nombre?: string;
  whatsapp?: string;
  referenciaImagen?: string | null;
  draftId?: string | null;
  editOrderId?: string | null;
  editToken?: string | null;
  [key: string]: unknown;
};

const categories = new Set(['PASTEL', 'POSTRE', 'EVENTO']);

function mexicoNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== 'literal') result[part.type] = part.value;
      return result;
    }, {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

const editableStatuses = new Set([
  'NUEVA_SOLICITUD',
  'EN_REVISION',
  'COTIZADA',
]);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId') || '';
    const token = url.searchParams.get('token') || '';
    if (!orderId || !token) {
      return NextResponse.json(
        { ok: false, error: 'El enlace de edición no es válido.' },
        { status: 400 },
      );
    }
    const rows = await supabaseFetch<OrderRecord[]>(
      `/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=*`,
    );
    const order = rows[0];
    if (!order || !verifyOrderEditToken(order.id, order.whatsapp, token)) {
      return NextResponse.json(
        { ok: false, error: 'Este enlace de edición no es válido o ya venció.' },
        { status: 403 },
      );
    }
    if (!editableStatuses.has(order.status)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Este pedido ya no puede modificarse desde la web. Escríbenos por WhatsApp para revisarlo.',
        },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      item: {
        ...order.details,
        categoria: order.category,
        fecha: order.requested_date,
        hora: String(order.requested_time).slice(0, 5),
        modalidad: order.fulfillment,
        nombre: order.customer_name,
        whatsapp: order.whatsapp,
        aceptaAviso: false,
      },
      code: order.public_code,
      hasReference: Boolean(order.reference_image_path),
    });
  } catch (cause) {
    console.error('Lucatta order edit load failed', cause);
    return NextResponse.json(
      { ok: false, error: 'No pudimos abrir esta solicitud para editarla.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let reference: File | null = null;
    let value: PedidoPayload;
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const rawPayload = form.get('payload');
      if (typeof rawPayload !== 'string') {
        return NextResponse.json(
          { ok: false, error: 'La solicitud no es válida.' },
          { status: 400 },
        );
      }
      value = JSON.parse(rawPayload) as PedidoPayload;
      const rawReference = form.get('reference');
      reference =
        rawReference instanceof File && rawReference.size ? rawReference : null;
    } else {
      value = (await request.json()) as PedidoPayload;
    }
    const whatsapp = String(value.whatsapp || '').replace(/\D/g, '');
    const category = String(value.categoria || '');
    const date = String(value.fecha || '');
    const time = String(value.hora || '');
    const fulfillment = String(value.modalidad || '');
    const name = String(value.nombre || '').trim();

    if (
      !categories.has(category) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^\d{2}:\d{2}$/.test(time)
    ) {
      return NextResponse.json(
        { ok: false, error: 'Revisa el tipo de pedido, la fecha y la hora.' },
        { status: 400 },
      );
    }
    if (
      !name ||
      whatsapp.length !== 10 ||
      !['RECOGIDA', 'DOMICILIO'].includes(fulfillment)
    ) {
      return NextResponse.json(
        { ok: false, error: 'Revisa tu nombre, WhatsApp y forma de entrega.' },
        { status: 400 },
      );
    }
    if (value.aceptaAviso !== true) {
      return NextResponse.json(
        { ok: false, error: 'Debes aceptar el aviso de privacidad.' },
        { status: 400 },
      );
    }

    const [settingsRows, closures] = await Promise.all([
      supabaseFetch<BusinessSettings[]>(
        '/rest/v1/business_settings?id=eq.1&select=*',
      ),
      supabaseFetch<Closure[]>(
        `/rest/v1/closures?starts_on=lte.${date}&ends_on=gte.${date}&select=*`,
      ),
    ]);
    const settings = settingsRows[0];
    const now = mexicoNow();
    if (date < now.date) {
      return NextResponse.json(
        { ok: false, error: 'La fecha elegida ya pasó.' },
        { status: 400 },
      );
    }
    if (settings && !settings.accepting_orders) {
      return NextResponse.json(
        { ok: false, error: settings.paused_message },
        { status: 409 },
      );
    }
    if (closures.length) {
      const closure = closures[0];
      return NextResponse.json(
        {
          ok: false,
          error: `${closure.message} Volvemos a dar servicio el ${closure.resumes_on}.`,
        },
        { status: 409 },
      );
    }
    if (date === now.date) {
      const [hours, minutes] = time.split(':').map(Number);
      const advanceMinutes = hours * 60 + minutes - now.minutes;
      const minimum = (settings?.same_day_min_hours || 5) * 60;
      if (advanceMinutes < minimum) {
        return NextResponse.json(
          {
            ok: false,
            error: `Los pedidos para hoy requieren al menos ${settings?.same_day_min_hours || 5} horas de anticipación.`,
          },
          { status: 409 },
        );
      }
      const commitments = await supabaseFetch<{ id: string }[]>(
        `/rest/v1/orders?requested_date=eq.${date}&status=not.in.(ENTREGADA,CANCELADA)&select=id&limit=1`,
      );
      if (commitments.length) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'Los pedidos para hoy solo pueden revisarse cuando no existen otros compromisos. Habla con una persona de Lucátta.',
          },
          { status: 409 },
        );
      }
    }

    let referenciaImagen = value.referenciaImagen || null;
    if (reference) {
      const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
      if (!allowed.has(reference.type) || reference.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Usa una referencia JPG, PNG o WEBP de hasta 10 MB.',
          },
          { status: 400 },
        );
      }
      const extension =
        reference.type === 'image/png'
          ? 'png'
          : reference.type === 'image/webp'
            ? 'webp'
            : 'jpg';
      referenciaImagen = `${date}/${crypto.randomUUID()}.${extension}`;
      await uploadObject(
        'order-references',
        referenciaImagen,
        await reference.arrayBuffer(),
        reference.type,
      );
    }

    const {
      referenciaImagen: _referencePath,
      aceptaAviso: _accepts,
      draftId,
      editOrderId,
      editToken,
      ...details
    } = value;
    let order: OrderRecord | undefined;
    let updatedExisting = false;
    if (typeof editOrderId === 'string' && editOrderId) {
      const existingRows = await supabaseFetch<OrderRecord[]>(
        `/rest/v1/orders?id=eq.${encodeURIComponent(editOrderId)}&select=*`,
      );
      const existing = existingRows[0];
      if (
        !existing ||
        !verifyOrderEditToken(
          existing.id,
          existing.whatsapp,
          String(editToken || ''),
        ) ||
        existing.whatsapp !== whatsapp
      ) {
        return NextResponse.json(
          { ok: false, error: 'El enlace de edición no es válido.' },
          { status: 403 },
        );
      }
      if (!editableStatuses.has(existing.status)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'Este pedido ya no puede modificarse desde la web. Escríbenos por WhatsApp para revisarlo.',
          },
          { status: 409 },
        );
      }
      const updated = await supabaseFetch<OrderRecord[]>(
        `/rest/v1/orders?id=eq.${encodeURIComponent(existing.id)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            customer_name: name.slice(0, 120),
            category,
            requested_date: date,
            requested_time: time,
            fulfillment,
            details,
            reference_image_path:
              referenciaImagen || existing.reference_image_path,
            status: 'NUEVA_SOLICITUD',
            quote_total: null,
            quote_notes: null,
            quote_expires_at: null,
            deposit_amount: null,
            payment_status: 'SIN_ANTICIPO',
          }),
        },
      );
      order = updated[0];
      if (
        reference &&
        existing.reference_image_path &&
        existing.reference_image_path !== referenciaImagen
      ) {
        await deleteObject('order-references', [existing.reference_image_path]);
      }
      updatedExisting = true;
    } else {
      const inserted = await supabaseFetch<OrderRecord[]>('/rest/v1/orders', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          customer_name: name.slice(0, 120),
          whatsapp,
          category,
          requested_date: date,
          requested_time: time,
          fulfillment,
          details,
          reference_image_path: referenciaImagen,
          source: 'WEB',
        }),
      });
      order = inserted[0];
    }
    if (!order) throw new Error('No se creó la solicitud.');

    if (typeof draftId === 'string' && draftId) {
      await supabaseFetch(
        `/rest/v1/order_drafts?id=eq.${encodeURIComponent(draftId)}&whatsapp=eq.${whatsapp}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'CONVERTED' }),
        },
      );
    }

    await enqueueWhatsapp(
      whatsapp,
      {
        order_id: order.id,
        public_code: order.public_code,
        text: orderSummaryMessage(order),
        actions: [
          { id: `order_confirm:${order.id}`, title: '✅ Enviar' },
          { id: `order_edit:${order.id}`, title: '✏️ Cambiar' },
          { id: `order_cancel:${order.id}`, title: '❌ Cancelar' },
        ],
      },
      'ORDER_SUMMARY',
      updatedExisting
        ? `order-summary:${order.id}:edit:${Date.now()}`
        : `order-summary:${order.id}`,
    );
    return NextResponse.json({ ok: true, result: { code: order.public_code } });
  } catch (cause) {
    console.error('Lucatta order creation failed', cause);
    const status = cause instanceof ConfigurationError ? 503 : 500;
    return NextResponse.json(
      {
        ok: false,
        error:
          cause instanceof ConfigurationError
            ? 'El formulario se está preparando. Escríbenos por WhatsApp para continuar.'
            : 'No pudimos guardar tu solicitud. Intenta de nuevo en un momento.',
      },
      { status },
    );
  }
}
