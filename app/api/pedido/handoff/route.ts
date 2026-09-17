import { NextResponse } from 'next/server';
import { readWhatsappHandoffToken } from '@/lib/lucatta-automation';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  const whatsapp = readWhatsappHandoffToken(token);
  if (!whatsapp) {
    return NextResponse.json(
      { ok: false, error: 'El enlace de WhatsApp ya no es válido.' },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, whatsapp });
}
