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
  created_at: string;
  updated_at: string;
};
