import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/admin-auth';
import { catalogKinds, type CatalogKind } from '@/lib/lucatta-types';
import { ConfigurationError } from '@/lib/supabase-rest';

function textValue(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

export function cleanCatalogPayload(value: Record<string, unknown>) {
  const kind = textValue(value.kind) as CatalogKind;
  const name = textValue(value.name).trim();
  if (!catalogKinds.includes(kind))
    throw new Error('Selecciona un tipo válido.');
  if (!name || name.length > 100)
    throw new Error('Escribe un nombre de hasta 100 caracteres.');
  const color = textValue(value.color_hex).trim();
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color))
    throw new Error('El color no es válido.');
  return {
    kind,
    name,
    slug:
      textValue(value.slug) ||
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') ||
      crypto.randomUUID().slice(0, 8),
    description: textValue(value.description).trim() || null,
    image_url: textValue(value.image_url).trim() || null,
    color_hex: color || null,
    sort_order: Number.isFinite(Number(value.sort_order))
      ? Number(value.sort_order)
      : 0,
    active: value.active !== false,
    metadata:
      value.metadata &&
      typeof value.metadata === 'object' &&
      !Array.isArray(value.metadata)
        ? value.metadata
        : {},
  };
}

export function adminErrorResponse(
  cause: unknown,
  fallback = 'No fue posible realizar el cambio.',
) {
  if (cause instanceof Error && cause.message === 'UNAUTHORIZED')
    return unauthorized();
  if (cause instanceof ConfigurationError) {
    return NextResponse.json(
      { ok: false, error: cause.message },
      { status: 503 },
    );
  }
  const message = cause instanceof Error ? cause.message : fallback;
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}
