import { NextResponse } from 'next/server';
import { enqueueWhatsapp } from '@/lib/lucatta-automation';
import type { OrderRecord, PaymentReceipt } from '@/lib/lucatta-types';
import { supabaseFetch, uploadObject } from '@/lib/supabase-rest';

export const runtime = 'nodejs';

type ReceiptPayload = {
  messageId?: string;
  from?: string;
  mediaId?: string;
  mimeType?: string;
  dataBase64?: string;
  fileName?: string;
};

const mimeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

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
    const contentType = request.headers.get('content-type') || '';
    let value: ReceiptPayload;
    let bytes: Buffer;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json(
          { ok: false, error: 'No se recibió el archivo del comprobante.' },
          { status: 400 },
        );
      }
      const formText = (name: string) => {
        const entry = form.get(name);
        return typeof entry === 'string' ? entry : '';
      };
      value = {
        messageId: formText('messageId'),
        from: formText('from'),
        mediaId: formText('mediaId'),
        mimeType: formText('mimeType') || file.type,
        fileName: file.name,
      };
      bytes = Buffer.from(await file.arrayBuffer());
    } else {
      value = (await request.json()) as ReceiptPayload;
      const base64 = String(value.dataBase64 || '').replace(
        /^data:[^;]+;base64,/,
        '',
      );
      bytes = Buffer.from(base64, 'base64');
    }

    const messageId = String(value.messageId || '').trim();
    const rawWhatsapp = String(value.from || '').replace(/\D/g, '');
    const whatsapp =
      rawWhatsapp.startsWith('52') && rawWhatsapp.length === 12
        ? rawWhatsapp.slice(2)
        : rawWhatsapp;
    const mimeType = String(value.mimeType || '')
      .split(';')[0]
      .toLowerCase();
    const extension = mimeExtensions[mimeType];

    if (!messageId || whatsapp.length !== 10 || !extension || !bytes.length) {
      return NextResponse.json(
        { ok: false, error: 'El comprobante recibido no es válido.' },
        { status: 400 },
      );
    }

    const duplicates = await supabaseFetch<PaymentReceipt[]>(
      `/rest/v1/payment_receipts?provider_message_id=eq.${encodeURIComponent(messageId)}&select=*&limit=1`,
    );
    if (duplicates[0]) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        receiptId: duplicates[0].id,
      });
    }

    const orders = await supabaseFetch<
      Pick<OrderRecord, 'id' | 'public_code' | 'whatsapp'>[]
    >(
      `/rest/v1/orders?whatsapp=eq.${whatsapp}&status=in.(RESERVA_PENDIENTE,ANTICIPO_EN_REVISION)&select=id,public_code,whatsapp&order=created_at.desc&limit=1`,
    );
    const order = orders[0];
    if (!order) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason:
          'No existe una reserva pendiente asociada a este número de WhatsApp.',
        alerts: [],
      });
    }

    if (!bytes.length || bytes.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: 'El comprobante excede el límite de 10 MB.' },
        { status: 413 },
      );
    }

    const storagePath = `${order.id}/${crypto.randomUUID()}.${extension}`;
    await uploadObject(
      'payment-receipts',
      storagePath,
      Uint8Array.from(bytes).buffer,
      mimeType,
    );

    const receipts = await supabaseFetch<PaymentReceipt[]>(
      '/rest/v1/payment_receipts',
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          order_id: order.id,
          provider_message_id: messageId,
          media_id: value.mediaId || null,
          mime_type: mimeType,
          storage_path: storagePath,
        }),
      },
    );

    await supabaseFetch(`/rest/v1/orders?id=eq.${order.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'ANTICIPO_EN_REVISION',
        payment_status: 'EN_REVISION',
        deposit_rejection_reason: null,
      }),
    });
    await enqueueWhatsapp(
      whatsapp,
      {
        text: `Recibimos tu comprobante para ${order.public_code}. Conservaremos el espacio mientras el equipo de Lucátta termina de revisarlo.`,
      },
      'TEXT',
      `receipt-ack:${messageId}`,
    );

    return NextResponse.json({
      ok: true,
      duplicate: false,
      receiptId: receipts[0]?.id,
      orderId: order.id,
      publicCode: order.public_code,
      alerts: [
        {
          subject: `Anticipo por revisar · ${order.public_code}`,
          text: `El comprobante ya está disponible en el panel de Lucátta.`,
        },
      ],
    });
  } catch (cause) {
    console.error('WhatsApp receipt upload failed', cause);
    return NextResponse.json(
      { ok: false, error: 'No fue posible guardar el comprobante.' },
      { status: 500 },
    );
  }
}
