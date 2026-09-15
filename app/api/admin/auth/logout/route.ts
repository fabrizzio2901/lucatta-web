import { NextResponse } from 'next/server';
import { clearAdminCookies } from '@/lib/admin-auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAdminCookies(response);
  return response;
}
