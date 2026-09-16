export const catalogKinds = [
  'PRODUCT',
  'PRODUCT_TYPE',
  'PORTION',
  'BREAD_FLAVOR',
  'FILLING',
  'COLOR',
  'TIME_SLOT',
  'PRESENTATION',
] as const;

export type CatalogKind = (typeof catalogKinds)[number];

export type CatalogOption = {
  id: string;
  kind: CatalogKind;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  color_hex: string | null;
  sort_order: number;
  active: boolean;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type BusinessSettings = {
  id: number;
  timezone: string;
  whatsapp_open: string;
  whatsapp_close: string;
  store_open: string;
  store_close: string;
  address: string;
  maps_url: string;
  accepting_orders: boolean;
  paused_message: string;
  booking_recommended_days: number;
  booking_min_calendar_days: number;
  same_day_min_hours: number;
  updated_at?: string;
};

export type Closure = {
  id: string;
  starts_on: string;
  ends_on: string;
  kind: 'VACACIONES' | 'CIERRE_ESPECIAL' | 'NO_DISPONIBLE';
  message: string;
  resumes_on: string;
  created_at?: string;
};

export type OrderRecord = {
  id: string;
  public_code: string;
  status: string;
  customer_name: string;
  whatsapp: string;
  category: string;
  requested_date: string;
  requested_time: string;
  fulfillment: string;
  details: Record<string, unknown>;
  reference_image_path: string | null;
  reference_image_url?: string | null;
  quote_total: number | null;
  quote_notes: string | null;
  quote_expires_at: string | null;
  deposit_amount: number | null;
  payment_status: string;
  deposit_reviewed_at: string | null;
  deposit_rejection_reason: string | null;
  confirmed_at: string | null;
  receipts?: PaymentReceipt[];
  created_at: string;
  updated_at: string;
};

export type PaymentReceipt = {
  id: string;
  order_id: string;
  provider_message_id: string;
  media_id: string | null;
  mime_type: string;
  storage_path: string;
  signed_url?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  amount: number | null;
  rejection_reason: string | null;
  received_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type OrderDraft = {
  id: string;
  customer_name: string;
  whatsapp: string;
  payload: Record<string, unknown>;
  status: 'OPEN' | 'CONVERTED' | 'ABANDONED';
  last_activity_at: string;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
};
