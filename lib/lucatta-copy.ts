import type { BusinessSettings, OrderRecord } from '@/lib/lucatta-types';

type OrderDetails = Record<string, unknown>;

const categoryLabels: Record<string, string> = {
  PASTEL: 'Pastel personalizado',
  POSTRE: 'Postres',
  EVENTO: 'Evento o mesa dulce',
};

const statusLabels: Record<string, string> = {
  NUEVA_SOLICITUD: 'Solicitud por confirmar',
  EN_REVISION: 'En revisión',
  COTIZADA: 'Cotización lista',
  RESERVA_PENDIENTE: 'Reserva pendiente de anticipo',
  ANTICIPO_EN_REVISION: 'Anticipo en revisión',
  CONFIRMADA: 'Pedido confirmado',
  EN_PRODUCCION: 'En preparación',
  LISTA: 'Listo para entregar',
  ENTREGADA: 'Entregado',
  CANCELADA: 'Cancelado',
};

export function firstName(value?: string | null) {
  return String(value || '')
    .trim()
    .split(/\s+/)[0];
}

export function formatDateEs(value?: string | null) {
  if (!value) return 'Por definir';
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatTime(value?: string | null) {
  return value ? String(value).slice(0, 5) : 'Por definir';
}

export function formatMoney(value?: number | string | null) {
  return Number(value || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });
}

export function categoryLabel(category?: string | null) {
  return categoryLabels[String(category || '')] || 'Pedido personalizado';
}

export function statusLabel(status?: string | null) {
  return (
    statusLabels[String(status || '')] ||
    String(status || 'Sin estado').replaceAll('_', ' ').toLowerCase()
  );
}

function textDetail(details: OrderDetails, key: string, fallback = '') {
  const value = details[key];
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number') return String(value);
  return fallback;
}

export function orderProductLabel(order: Pick<OrderRecord, 'category' | 'details'>) {
  return textDetail(order.details, 'producto', categoryLabel(order.category));
}

export function orderSummaryMessage(order: OrderRecord) {
  const details = order.details || {};
  const name = firstName(order.customer_name);
  const size =
    textDetail(details, 'porciones') ||
    (textDetail(details, 'cantidad')
      ? `${textDetail(details, 'cantidad')} pieza(s)`
      : 'Por definir');
  const allergy =
    textDetail(details, 'alergias') === 'SI'
      ? textDetail(details, 'detalleAlergias', 'Indicada para revisión')
      : 'Ninguna indicada';
  const delivery =
    order.fulfillment === 'RECOGIDA'
      ? 'Recoger en Lucátta'
      : `Entrega a domicilio${textDetail(details, 'zona') ? ` · ${textDetail(details, 'zona')}` : ''}`;

  return [
    `¡Listo${name ? `, ${name}` : ''}! ✨`,
    '',
    'Ya tengo los detalles de tu solicitud.',
    '',
    `🎂 *${categoryLabel(order.category)}*`,
    '',
    `📅 *Fecha:* ${formatDateEs(order.requested_date)}`,
    `🕐 *Hora:* ${formatTime(order.requested_time)}`,
    '',
    `📍 *Entrega:* ${delivery}`,
    '',
    `👥 *Tamaño o cantidad:* ${size}`,
    `🍰 *Pan:* ${textDetail(details, 'sabor', 'Por definir')}`,
    `🥄 *Relleno:* ${textDetail(details, 'relleno', 'Por definir')}`,
    `🎨 *Colores:* ${textDetail(details, 'colores', 'Por definir')}`,
    '',
    `📝 *Idea:* ${textDetail(details, 'diseno', 'Sin descripción adicional')}`,
    `🖼️ *Imagen de referencia:* ${order.reference_image_path ? 'Recibida' : 'No agregada'}`,
    `⚠️ *Alergias:* ${allergy}`,
    '',
    `🔖 *Folio:* ${order.public_code}`,
    '',
    '¿Todo se ve bien antes de enviárselo al equipo? 😊',
  ].join('\n');
}

export function welcomeMessage(
  name: string | null | undefined,
  hasOrders: boolean,
  acceptingOrders = true,
  pausedMessage?: string | null,
) {
  const shortName = firstName(name);
  const greeting = hasOrders
    ? `¡Hola${shortName ? `, ${shortName}` : ''}! 👋\nQué gusto tenerte de nuevo por aquí. 💜`
    : `¡Hola${shortName ? `, ${shortName}` : ''}! 👋\nSoy *Luca*, el asistente virtual de Lucátta. 💜`;
  const availability = acceptingOrders
    ? ''
    : `\n\n📌 ${pausedMessage || 'Por el momento no estamos recibiendo nuevas solicitudes.'}`;
  return `${greeting}${availability}\n\n¿Qué te gustaría hacer?\n\nSi necesitas atención personal, escribe *ASESOR*.`;
}

export function locationMessage(settings?: BusinessSettings | null) {
  const whatsappOpen = formatTime(settings?.whatsapp_open || '09:00');
  const whatsappClose = formatTime(settings?.whatsapp_close || '19:00');
  const storeOpen = formatTime(settings?.store_open || '09:00');
  const storeClose = formatTime(settings?.store_close || '19:00');
  const address =
    settings?.address || 'Nacional 54, San Juan, 72990 Casa Blanca, Puebla.';
  const maps = settings?.maps_url || 'https://maps.app.goo.gl/CKTmGzaT1Noo3g2e7';
  return [
    '¡Claro! 📍💜',
    '',
    '*Lucátta*',
    '',
    '💬 *Atención por WhatsApp*',
    `Todos los días · ${whatsappOpen} a ${whatsappClose}`,
    '',
    '🏠 *Horario del local*',
    `Todos los días · ${storeOpen} a ${storeClose}`,
    '',
    '📍 *Ubicación*',
    address,
    '',
    `🗺️ ${maps}`,
  ].join('\n');
}

