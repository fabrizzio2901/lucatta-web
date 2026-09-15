import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/admin-auth';
import { adminErrorResponse } from '@/lib/admin-catalog';
import type { OrderRecord } from '@/lib/lucatta-types';
import { signedStorageUrl, supabaseFetch } from '@/lib/supabase-rest';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireOwner();
    const items = await supabaseFetch<OrderRecord[]>(
      '/rest/v1/orders?select=*&order=created_at.desc&limit=200',
    );
    const withReferences = await Promise.all(
      items.map(async (item) => ({
        ...item,
        reference_image_url: item.reference_image_path
          ? await signedStorageUrl(
              'order-references',
              item.reference_image_path,
            ).catch(() => null)
          : null,
      })),
    );
    return NextResponse.json({ ok: true, items: withReferences });
  } catch (cause) {
    return adminErrorResponse(cause, 'No fue posible cargar los pedidos.');
  }
}
