import { NextResponse } from 'next/server';
import { setAdminCookies, verifyOwnerCode } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { email, code } = (await request.json()) as {
      email?: string;
      code?: string;
    };
    if (!email || !code) {
      return NextResponse.json(
        { ok: false, error: 'Escribe el correo y el código.' },
        { status: 400 },
      );
    }
    const session = await verifyOwnerCode(email, code.trim());
    const response = NextResponse.json({ ok: true, email: session.user.email });
    await setAdminCookies(response, session);
    return response;
  } catch (cause) {
    console.error('Owner OTP verification failed', cause);
    return NextResponse.json(
      { ok: false, error: 'El código no es válido o ya venció.' },
      { status: 401 },
    );
  }
}
