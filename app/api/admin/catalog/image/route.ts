import { NextResponse } from 'next/server';
import { requireOwner, unauthorized } from '@/lib/admin-auth';
import {
  ConfigurationError,
  publicStorageUrl,
  uploadObject,
} from '@/lib/supabase-rest';

export const runtime = 'nodejs';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  try {
    await requireOwner();
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'Selecciona una imagen.' },
        { status: 400 },
      );
    }
    if (!allowed.has(file.type) || file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: 'Usa JPG, PNG o WEBP de hasta 5 MB.' },
        { status: 400 },
      );
    }
    const extension =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : 'jpg';
    const path = `options/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    await uploadObject('catalog', path, await file.arrayBuffer(), file.type);
    return NextResponse.json({
      ok: true,
      url: publicStorageUrl('catalog', path),
    });
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'UNAUTHORIZED')
      return unauthorized();
    const status = cause instanceof ConfigurationError ? 503 : 500;
    return NextResponse.json(
      {
        ok: false,
        error:
          cause instanceof Error
            ? cause.message
            : 'No fue posible subir la imagen.',
      },
      { status },
    );
  }
}
