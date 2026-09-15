import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const backendUrl = process.env.LUCATTA_APPS_SCRIPT_URL;
  const backendToken = process.env.LUCATTA_APPS_SCRIPT_TOKEN;
  if (!backendUrl || !backendToken) {
    return NextResponse.json(
      { ok: false, error: 'El formulario está en preparación. Escríbenos por WhatsApp para continuar.' },
      { status: 503 },
    );
  }

  try {
    const payload = await request.json();
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: backendToken,
        operation: 'receiveWebOrder',
        payload,
      }),
      cache: 'no-store',
    });
    const rawResponse = await response.text();
    let data: {
      ok?: boolean;
      error?: string;
      result?: unknown;
    };
    try {
      data = JSON.parse(rawResponse) as typeof data;
    } catch (cause) {
      console.error('Lucatta Apps Script returned a non-JSON response', {
        status: response.status,
        contentType: response.headers.get('content-type'),
        cause,
      });
      throw new Error('Respuesta inválida del backend de Lucatta.');
    }
    if (!response.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || 'No pudimos guardar tu solicitud.' },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, result: data.result });
  } catch (cause) {
    console.error('Lucatta order bridge failed', cause);
    return NextResponse.json(
      { ok: false, error: 'No pudimos conectar con Lucátta. Intenta de nuevo en un momento.' },
      { status: 500 },
    );
  }
}
