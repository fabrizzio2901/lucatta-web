import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/admin-auth';
import { adminErrorResponse } from '@/lib/admin-catalog';
import type { BusinessSettings } from '@/lib/lucatta-types';
import { supabaseFetch } from '@/lib/supabase-rest';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireOwner();
    const rows = await supabaseFetch<BusinessSettings[]>(
      '/rest/v1/business_settings?id=eq.1&select=*',
    );
    return NextResponse.json({ ok: true, settings: rows[0] });
  } catch (cause) {
    return adminErrorResponse(cause, 'No fue posible cargar la configuración.');
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireOwner();
    const value = (await request.json()) as Partial<BusinessSettings>;
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const whatsappOpen = String(value.whatsapp_open || '09:00').slice(0, 5);
    const whatsappClose = String(value.whatsapp_close || '19:00').slice(0, 5);
    const storeOpen = String(value.store_open || '09:00').slice(0, 5);
    const storeClose = String(value.store_close || '19:00').slice(0, 5);
    if (
      ![whatsappOpen, whatsappClose, storeOpen, storeClose].every((time) =>
        timePattern.test(time),
      )
    ) {
      throw new Error('Revisa los horarios.');
    }
    const payload = {
      whatsapp_open: whatsappOpen,
      whatsapp_close: whatsappClose,
      store_open: storeOpen,
      store_close: storeClose,
      address: String(value.address || '').trim(),
      maps_url: String(value.maps_url || '').trim(),
      accepting_orders: value.accepting_orders !== false,
      paused_message: String(value.paused_message || '').trim(),
      booking_recommended_days: Math.max(
        0,
        Number(value.booking_recommended_days) || 0,
      ),
      booking_min_calendar_days: Math.max(
        0,
        Number(value.booking_min_calendar_days) || 0,
      ),
      same_day_min_hours: Math.max(0, Number(value.same_day_min_hours) || 0),
    };
    const rows = await supabaseFetch<BusinessSettings[]>(
      '/rest/v1/business_settings?id=eq.1',
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      },
    );
    await supabaseFetch('/rest/v1/audit_log', {
      method: 'POST',
      body: JSON.stringify({
        actor_email: user.email,
        action: 'UPDATE',
        entity_type: 'business_settings',
        entity_id: '1',
        changes: payload,
      }),
    });
    return NextResponse.json({ ok: true, settings: rows[0] });
  } catch (cause) {
    return adminErrorResponse(
      cause,
      'No fue posible guardar la configuración.',
    );
  }
}
