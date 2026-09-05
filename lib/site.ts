export const WHATSAPP_URL =
  'https://wa.me/522223546215?text=%C2%A1Hola%21%20Me%20gustar%C3%ADa%20pedir%20informaci%C3%B3n%20sobre%20sus%20productos.';

export const INSTAGRAM_URL = 'https://www.instagram.com/lucattapatisserie/';

export const siteStatus = {
  localOpen: false,
  eventsPageReady: false,
  address: 'Nacional 54, San Juan, 72990 Casa Blanca, Puebla',
  localHours: 'Lunes a domingo, de 9:00 a 19:00',
  whatsappHours: 'Lunes a domingo, de 9:00 a 19:00',
} as const;

export const seasonalCampaign = {
  enabled: false,
  eyebrow: 'Edición de temporada',
  title: '',
  description: '',
  image: '',
} as const;

export const MAPS_SEARCH_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  siteStatus.address,
)}`;
