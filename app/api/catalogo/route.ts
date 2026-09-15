import { NextResponse } from 'next/server';
import type {
  BusinessSettings,
  CatalogOption,
  Closure,
} from '@/lib/lucatta-types';
import { ConfigurationError, supabaseFetch } from '@/lib/supabase-rest';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [items, settings, closures] = await Promise.all([
      supabaseFetch<CatalogOption[]>(
        '/rest/v1/catalog_options?active=eq.true&select=*&order=kind.asc,sort_order.asc,name.asc',
      ),
      supabaseFetch<BusinessSettings[]>(
        '/rest/v1/business_settings?id=eq.1&select=*',
      ),
      supabaseFetch<Closure[]>(
        `/rest/v1/closures?ends_on=gte.${new Date().toISOString().slice(0, 10)}&select=*&order=starts_on.asc`,
      ),
    ]);
    return NextResponse.json(
      { ok: true, items, settings: settings[0], closures },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (cause) {
    console.error('[catalogo] No se pudo leer Supabase:', cause);
    const status = cause instanceof ConfigurationError ? 503 : 500;
    return NextResponse.json(
      {
        ok: false,
        error:
          cause instanceof ConfigurationError
            ? 'El catálogo se está preparando. Escríbenos por WhatsApp para continuar.'
            : 'No pudimos cargar el catálogo.',
      },
      { status },
    );
  }
}
