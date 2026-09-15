import { NextResponse } from 'next/server';
import { requestOwnerCode } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email)
      return NextResponse.json(
        { ok: false, error: 'Escribe el correo.' },
        { status: 400 },
      );
    await requestOwnerCode(email);
    return NextResponse.json({
      ok: true,
      message: 'Si el correo está autorizado, recibirá un código de acceso.',
    });
  } catch (cause) {
    console.error('Owner OTP request failed', cause);
    return NextResponse.json(
      {
        ok: false,
        error:
          'No fue posible enviar el código. Revisa la configuración de acceso.',
      },
      { status: 500 },
    );
  }
}
