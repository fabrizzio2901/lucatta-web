import type { Metadata } from 'next';
import { ArrowLeft, Check, MessageCircle } from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { WHATSAPP_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Condiciones de pedidos | Lucátta',
  description:
    'Consulta las condiciones de anticipación, anticipo, pagos, entrega, cambios y cancelaciones de pedidos en Lucátta.',
};

const sections = [
  {
    title: 'Cotización y anticipación',
    items: [
      'Cada pedido se cotiza según porciones, sabor, relleno, diseño, decoración y complementos.',
      'Recomendamos realizar tu pedido con un mínimo de tres días de anticipación.',
      'Para pedidos grandes o complejos, recomendamos consultar entre quince días y un mes antes.',
      'Los pedidos urgentes están sujetos a disponibilidad, revisión y costo adicional.',
      'La capacidad diaria depende de la complejidad, la producción y el personal; no manejamos un número fijo de pedidos por día.',
    ],
  },
  {
    title: 'Anticipo, confirmación y pago',
    items: [
      'Solicitamos un anticipo del 50% del valor del producto.',
      'El pedido queda confirmado después de verificar el anticipo y completar todas sus características.',
      'Enviar una solicitud o iniciar una conversación no reserva la fecha.',
      'El saldo se liquida antes o al entregar, según lo acordado contigo.',
    ],
  },
  {
    title: 'Entrega y recolección',
    items: [
      'Ofrecemos recolección coordinada directamente con el negocio.',
      'La entrega tiene un costo adicional y se cotiza por separado.',
      'Los envíos a otras localidades requieren una cotización específica según cada caso.',
    ],
  },
  {
    title: 'Cambios',
    items: [
      'Los cambios están sujetos a la anticipación con que se soliciten y al avance del pedido.',
      'Escríbenos cuanto antes para revisar si todavía es posible realizar el ajuste.',
    ],
  },
];

export default function ConditionsPage() {
  return (
    <>
      <SiteHeader />
      <main className="conditions-page">
        <header className="inner-hero">
          <div className="inner-hero-copy">
            <a className="back-link" href="/#como-pedir">
              <ArrowLeft aria-hidden="true" /> Volver a Cómo pedir
            </a>
            <p className="eyebrow eyebrow-light">Información clara para tu pedido</p>
            <h1>Condiciones de pedidos</h1>
            <p>
              Queremos que conozcas cada paso antes de confirmar. Si algo no está contemplado aquí,
              consúltalo directamente con Lucátta por WhatsApp.
            </p>
          </div>
        </header>

        <div className="conditions-layout section-shell">
          <div className="conditions-content">
            {sections.map((section) => (
              <section className="conditions-block" key={section.title}>
                <h2>{section.title}</h2>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>
                      <Check aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="cancellation-card">
              <p className="eyebrow">Cancelaciones</p>
              <h2>Si cancelas dentro de los tres días previos a la entrega, el anticipo no se devuelve.</h2>
              <p>
                Para cancelaciones anteriores a ese plazo, las condiciones deben consultarse
                directamente con Lucátta. La forma de contar el plazo de tres días aún está pendiente de
                precisión; no se interpreta automáticamente como 72 horas.
              </p>
            </section>
          </div>

          <aside className="conditions-aside">
            <div>
              <MessageCircle aria-hidden="true" />
              <h2>¿Quieres revisar tu caso?</h2>
              <p>Escríbenos. El mensaje abrirá en WhatsApp para que puedas enviarlo cuando estés listo.</p>
              <a className="button" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                Pedir información
              </a>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
