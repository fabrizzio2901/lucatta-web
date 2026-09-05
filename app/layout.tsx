import type { Metadata } from 'next';
import './globals.css';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://lucatta-pasteleria-casa-blanca.luisfabrizzio.chatgpt.site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Lucátta | Pastelería artesanal en Puebla',
  description:
    'Pasteles y postres personalizados. Próximamente, café, pan y postres en Casa Blanca, Puebla.',
  icons: {
    icon: '/images/simbolo-lucatta.png',
  },
  openGraph: {
    title: 'Lucátta | Pastelería artesanal en Puebla',
    description: 'Tu celebración merece algo hecho especialmente para ti.',
    type: 'website',
    locale: 'es_MX',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Lucátta, pastelería artesanal en Puebla' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lucátta | Pastelería artesanal en Puebla',
    description: 'Tu celebración merece algo hecho especialmente para ti.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
