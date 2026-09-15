import { NextResponse } from 'next/server';
import { deleteObject, supabaseFetch } from '@/lib/supabase-rest';

export const runtime = 'nodejs';

function authorized(request: Request) {
  const expected = process.env.LUCATTA_AUTOMATION_KEY;
  return Boolean(
    expected && request.headers.get('x-lucatta-automation-key') === expected,
  );
}

export async function POST(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - 1);
    const monthAgo = cutoff.toISOString();
    const expired = await supabaseFetch<
      { reference_image_path: string | null }[]
    >(
      `/rest/v1/orders?status=in.(ENTREGADA,CANCELADA)&updated_at=lt.${encodeURIComponent(monthAgo)}&select=reference_image_path`,
    );
    const paths = expired.flatMap((order) =>
      order.reference_image_path ? [order.reference_image_path] : [],
    );
    await deleteObject('order-references', paths);
    await supabaseFetch('/rest/v1/rpc/cleanup_lucatta_data', {
      method: 'POST',
      body: JSON.stringify({ cutoff: monthAgo }),
    });
    return NextResponse.json({ ok: true, retained_from: monthAgo });
  } catch (cause) {
    console.error('Lucatta scheduler failed', cause);
    return NextResponse.json(
      { ok: false, error: 'No fue posible ejecutar el mantenimiento.' },
      { status: 500 },
    );
  }
}
