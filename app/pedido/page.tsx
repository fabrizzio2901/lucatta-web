import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Sparkles } from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { WHATSAPP_URL } from '@/lib/site';
import { PedidoForm } from './pedido-form';

export const metadata: Metadata = {
  title: 'Crea tu pedido | Lucátta',
  description: 'Cuéntanos tu idea en unos cuantos pasos y recibe una cotización personalizada por WhatsApp.',
};

export default function PedidoPage() {
  return (
    <>
      <SiteHeader />
      <main className="order-builder-page">
        <header className="order-builder-hero">
          <div className="section-shell order-builder-hero-grid">
            <div>
              <Link className="back-link" href="/">
                <ArrowLeft aria-hidden="true" /> Volver al inicio
              </Link>
              <p className="eyebrow eyebrow-light">Tu idea, hecha especialmente para ti</p>
              <h1>Cuéntanos qué celebraremos.</h1>
              <p>
                Te acompañaremos paso a paso. No verás precios automáticos: una persona de Lucátta
                revisará cada detalle y preparará tu cotización.
              </p>
            </div>
            <div className="order-builder-promise">
              <Sparkles aria-hidden="true" />
              <p>Completar este formulario no reserva la fecha ni genera un cobro.</p>
            </div>
          </div>
        </header>

        <section className="section-shell order-builder-shell">
          <PedidoForm />
          <aside className="order-builder-help">
            <MessageCircle aria-hidden="true" />
            <h2>¿Prefieres contárnoslo directamente?</h2>
            <p>
              Si tu pedido es muy especial, tienes una alergia o necesitas ayuda, continúa con una
              persona por WhatsApp.
            </p>
            <a className="inline-link" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              Hablar con Lucátta
            </a>
          </aside>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
