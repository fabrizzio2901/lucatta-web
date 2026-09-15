import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'lucatta_admin_access';
const REFRESH_COOKIE = 'lucatta_admin_refresh';

type AuthUser = {
  id: string;
  email?: string;
};

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: AuthUser;
};

function authConfiguration() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const owner = (
    process.env.LUCATTA_OWNER_EMAIL || 'lucatta.bakery@gmail.com'
  ).toLowerCase();
  if (!url || !anon) throw new Error('Supabase todavía no está configurado.');
  return { url: url.replace(/\/$/, ''), anon, owner };
}

async function authFetch<T>(
  path: string,
  body?: unknown,
  bearer?: string,
): Promise<T> {
  const { url, anon } = authConfiguration();
  const response = await fetch(`${url}/auth/v1${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${bearer || anon}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    msg?: string;
    error_description?: string;
  };
  if (!response.ok) {
    throw new Error(
      data.error_description || data.msg || 'No fue posible validar el acceso.',
    );
  }
  return data;
}

export async function requestOwnerCode(email: string) {
  const { owner } = authConfiguration();
  if (email.trim().toLowerCase() !== owner) return;
  await authFetch('/otp', { email: owner, create_user: false });
}

export async function verifyOwnerCode(email: string, token: string) {
  const { owner } = authConfiguration();
  if (email.trim().toLowerCase() !== owner)
    throw new Error('Correo no autorizado.');
  const session = await authFetch<AuthSession>('/verify', {
    type: 'email',
    email: owner,
    token,
  });
  if (session.user.email?.toLowerCase() !== owner)
    throw new Error('Correo no autorizado.');
  return session;
}

export async function setAdminCookies(
  response: NextResponse,
  session: AuthSession,
) {
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: session.expires_in || 3600,
  });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAdminCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
}

export async function requireOwner(): Promise<AuthUser> {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) throw new Error('UNAUTHORIZED');
  try {
    const user = await authFetch<AuthUser>('/user', undefined, access);
    const { owner } = authConfiguration();
    if (user.email?.toLowerCase() !== owner) throw new Error('UNAUTHORIZED');
    return user;
  } catch {
    throw new Error('UNAUTHORIZED');
  }
}

export async function refreshOwnerSession() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) throw new Error('UNAUTHORIZED');
  const session = await authFetch<AuthSession>(
    '/token?grant_type=refresh_token',
    {
      refresh_token: refreshToken,
    },
  );
  const { owner } = authConfiguration();
  if (session.user.email?.toLowerCase() !== owner)
    throw new Error('UNAUTHORIZED');
  return session;
}

export function unauthorized() {
  return NextResponse.json(
    { ok: false, error: 'Tu sesión terminó. Vuelve a entrar.' },
    { status: 401 },
  );
}
