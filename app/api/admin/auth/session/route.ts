import { NextResponse } from 'next/server';
import {
  requireOwner,
  refreshOwnerSession,
  setAdminCookies,
  unauthorized,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireOwner();
    return NextResponse.json({ ok: true, email: user.email });
  } catch {
    try {
      const session = await refreshOwnerSession();
      const response = NextResponse.json({
        ok: true,
        email: session.user.email,
      });
      await setAdminCookies(response, session);
      return response;
    } catch {
      return unauthorized();
    }
  }
}
