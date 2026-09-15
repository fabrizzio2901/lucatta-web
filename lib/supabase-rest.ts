type SupabaseMode = 'anon' | 'service';

export class ConfigurationError extends Error {}

function configuration(mode: SupabaseMode) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    mode === 'service'
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new ConfigurationError('Supabase todavía no está configurado.');
  }

  return { url: url.replace(/\/$/, ''), key };
}

export async function supabaseFetch<T>(
  path: string,
  init: RequestInit = {},
  mode: SupabaseMode = 'service',
): Promise<T> {
  const { url, key } = configuration(mode);
  const headers = new Headers(init.headers);
  headers.set('apikey', key);
  headers.set('Authorization', `Bearer ${key}`);
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${url}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const raw = await response.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? (data as { message: unknown }).message
        : null;
    const detail =
      typeof message === 'string'
        ? message
        : typeof data === 'string'
          ? data
          : data
            ? JSON.stringify(data)
            : response.statusText;
    throw new Error(`Supabase (${response.status}): ${detail}`);
  }

  return data as T;
}

export function publicStorageUrl(bucket: string, path: string) {
  const { url } = configuration('anon');
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

export async function uploadObject(
  bucket: string,
  path: string,
  bytes: ArrayBuffer,
  contentType: string,
) {
  await supabaseFetch(`/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'x-upsert': 'true' },
    body: bytes,
  });
  return path;
}

export async function deleteObject(bucket: string, paths: string[]) {
  if (!paths.length) return;
  await supabaseFetch(`/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    body: JSON.stringify({ prefixes: paths }),
  });
}

export async function signedStorageUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const result = await supabaseFetch<{ signedURL: string }>(
    `/storage/v1/object/sign/${bucket}/${encodedPath}`,
    { method: 'POST', body: JSON.stringify({ expiresIn }) },
  );
  if (result.signedURL.startsWith('http')) return result.signedURL;
  const { url } = configuration('service');
  return `${url}${result.signedURL}`;
}
