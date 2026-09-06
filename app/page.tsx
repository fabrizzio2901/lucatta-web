import {
  ArrowRight,
  CakeSlice,
  CalendarCheck2,
  Clock3,
  MapPin,
  MessageCircle,
  PackageCheck,
  PartyPopper,
  Sparkles,
} from 'lucide-react';
import { Gallery } from '@/components/gallery';
import { HeroCarousel } from '@/components/hero-carousel';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import {
  MAPS_SEARCH_URL,
  WHATSAPP_URL,
  seasonalCampaign,
  siteStatus,
} from '@/lib/site';

const orderSteps = [
  {
    icon: MessageCircle,
    title: 'Escríbenos por WhatsApp',
    text: 'Te guiaremos para preparar tu cotización.',
  },
  {
    icon: Sparkles,
    title: 'Cuéntanos tu idea',
    text: 'Revisamos los detalles, la fecha, las personas o piezas y la disponibilidad para cotizar.',
  },
  {
    icon: CalendarCheck2,
    title: 'Confirma tu pedido',
    text: 'Acordamos sus características y verificamos el anticipo del 50%.',
  },
  {
    icon: PackageCheck,
    title: 'Recibe tu pedido',
    text: 'Elaboramos lo acordado y coordinamos la entrega o recolección.',
  },
];

const faqs = [
  {
    question: '¿Con cuánta anticipación debo pedir?',
    answer:
      'Recomendamos hacerlo con al menos tres días de anticipación. Para pedidos grandes o complejos, consúltanos entre quince días y un mes antes.',
  },
  {
    question: '¿Cómo se calcula el precio?',
    answer:
      'Cada pedido se cotiza según las porciones, el sabor, el relleno, el diseño, la decoración y los complementos que acordemos contigo.',
  },
  {
    question: '¿Cuánto anticipo se solicita y cuándo se confirma el pedido?',
    answer:
      'Solicitamos un anticipo del 50%. Tu pedido queda confirmado después de verificarlo y de completar todas las características del encargo.',
  },
  {
    question: '¿Puedo solicitar un pedido urgente?',
    answer:
      'Sí puedes consultarlo. Los pedidos urgentes están sujetos a disponibilidad, revisión y un costo adicional.',
  },
  {
    question: '¿Ofrecen entrega o recolección?',
    answer:
      'Ofrecemos recolección coordinada con el negocio y entrega con costo adicional. El envío se cotiza por separado según la ubicación.',
  },
  {
    question: '¿Puedo enviar una referencia de diseño?',
    answer:
      'Sí. Las referencias nos ayudan a entender tu idea, aunque cada creación es artesanal y una fotografía no garantiza una réplica exacta.',
  },
  {
    question: '¿Puedo modificar o cancelar mi pedido?',
    answer:
      'Los cambios dependen de la anticipación y del avance del pedido. Si cancelas dentro de los tres días previos a la entrega, el anticipo no se devuelve. Para cancelaciones anteriores, consulta directamente con Lucátta.',
  },
];

export default function Home() {
  const localTitle = siteStatus.localOpen
    ? 'Disfruta Lucátta'
    : 'Próximamente, un espacio para disfrutar Lucátta';

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero" id="inicio">
          <div className="hero-copy">
            <p className="eyebrow">Pastelería artesanal en Puebla</p>
            <h1>Tu celebración merece algo hecho especialmente para ti.</h1>
            <p className="hero-intro">
              Creamos pasteles y postres personalizados para acompañar tus
              momentos más especiales. Muy pronto también podrás disfrutar café,
              pan y postres en nuestro espacio de Casa Blanca.
            </p>
            <div className="hero-actions">
              <a
                className="button"
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
              >
                Pedir información
              </a>
              <a className="text-link" href="#local">
                {siteStatus.localOpen
                  ? 'Visítanos'
                  : 'Conoce nuestro próximo local'}
                <ArrowRight aria-hidden="true" />
              </a>
            </div>
          </div>

          <HeroCarousel />
        </section>

        <section
          className="promise-strip"
          aria-label="Características de Lucátta"
        >
          <p>Elaboración artesanal</p>
          <span aria-hidden="true">✦</span>
          <p>Pedidos personalizados</p>
          <span aria-hidden="true">✦</span>
          <p>Próximo local en Casa Blanca, Puebla</p>
        </section>

        {seasonalCampaign.enabled && (
          <section className="seasonal-section section-shell">
            <div>
              <p className="eyebrow">{seasonalCampaign.eyebrow}</p>
              <h2>{seasonalCampaign.title}</h2>
              <p>{seasonalCampaign.description}</p>
              <a
                className="button"
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
              >
                Pedir información
              </a>
            </div>
            <img src={seasonalCampaign.image} alt="" />
          </section>
        )}

        <section className="section-shell creations-section" id="creaciones">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">Nuestras creaciones</p>
              <h2>Hecho para celebrar tu historia.</h2>
            </div>
            <p>
              Pasteles personalizados, galletas, cupcakes, fresas decoradas y
              otros postres preparados por encargo, según disponibilidad.
            </p>
          </div>

          <Gallery />

          <div className="gallery-note">
            <p>
              Estas imágenes son ejemplos de trabajos por encargo. Cada detalle
              se acuerda contigo y una referencia no garantiza una réplica
              exacta. La selección disponible en el futuro local podrá variar.
            </p>
            <a
              className="button"
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
            >
              Pedir información
            </a>
          </div>
        </section>

        <section className="order-section" id="como-pedir">
          <div className="section-shell">
            <div className="section-heading centered-heading">
              <p className="eyebrow eyebrow-light">Cómo hacer tu pedido</p>
              <h2>De tu idea a un momento delicioso.</h2>
              <p>
                La conversación y la cotización se realizan personalmente por
                WhatsApp.
              </p>
            </div>

            <ol className="steps-grid">
              {orderSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title}>
                    <div className="step-topline">
                      <span>0{index + 1}</span>
                      <Icon aria-hidden="true" />
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </li>
                );
              })}
            </ol>

            <div className="order-clarification">
              <p>
                Enviar una solicitud no reserva la fecha. La confirmación
                requiere completar las características del pedido y verificar el
                anticipo.
              </p>
              <div>
                <a
                  className="inline-link inline-link-light"
                  href="/condiciones-de-pedidos"
                >
                  Consultar condiciones de pedidos{' '}
                  <ArrowRight aria-hidden="true" />
                </a>
                <a
                  className="button button-cream"
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Pedir información
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell events-section" id="eventos">
          <div className="events-card">
            <div className="events-icon" aria-hidden="true">
              <PartyPopper />
            </div>
            <div className="events-copy">
              <p className="eyebrow">Celebraciones y reuniones</p>
              <h2>Detalles dulces para tus eventos.</h2>
              <p>
                Cuéntanos sobre tu fecha, número de asistentes, tipo de evento y
                zona. Podemos conversar sobre mesas de postres, catering y
                coffee breaks según tus necesidades.
              </p>
            </div>
            <a className="button button-outline" href="/eventos">
              Ver servicios para eventos
            </a>
          </div>
        </section>

        <section className="local-section" id="local">
          <div className="local-photo">
            <img
              src="/images/pastel-floral-rosa.jpeg"
              alt="Pastel floral rosa elaborado por Lucátta"
              loading="lazy"
            />
          </div>
          <div className="local-copy">
            <p className="eyebrow eyebrow-light">Nuestro local</p>
            <h2>{localTitle}</h2>
            <p>
              {siteStatus.localOpen
                ? 'Ven a comprar o disfrutar café, pan y postres, y a recoger los pedidos que hayas coordinado con nosotros.'
                : 'Estamos preparando un lugar para comprar o disfrutar café, pan y postres, y para recoger los pedidos coordinados con nosotros.'}
            </p>
            <div className="local-detail">
              <MapPin aria-hidden="true" />
              <div>
                <span>
                  {siteStatus.localOpen
                    ? 'Dirección'
                    : 'Ubicación del próximo local'}
                </span>
                <p>{siteStatus.address}</p>
              </div>
            </div>
            <div className="local-detail">
              <Clock3 aria-hidden="true" />
              <div>
                <span>
                  {siteStatus.localOpen ? 'Horario' : 'Horario previsto'}
                </span>
                <p>{siteStatus.localHours}</p>
              </div>
            </div>
            {siteStatus.localOpen ? (
              <a
                className="button button-cream"
                href={MAPS_SEARCH_URL}
                target="_blank"
                rel="noreferrer"
              >
                Cómo llegar
              </a>
            ) : (
              <p className="local-note">
                La fecha de apertura aún no está confirmada. Por ahora, la
                recolección se coordina por WhatsApp.
              </p>
            )}
          </div>
        </section>

        <section className="section-shell story-section" id="historia">
          <div className="story-mark" aria-hidden="true">
            <img src="/images/simbolo-lucatta.png" alt="" />
          </div>
          <div className="story-copy">
            <p className="eyebrow">Nuestra historia</p>
            <h2>Una historia que comenzó compartiendo.</h2>
            <div className="story-text">
              <p>
                Después de terminar la universidad, nuestra fundadora comenzó
                vendiendo postres a familiares y amigos. Esa primera comunidad
                fue el inicio de todo.
              </p>
              <p>
                Más adelante cursó una maestría especializada en repostería. El
                proyecto nació como Baking Time y después tomó el nombre
                Lucátta, inspirado en los nombres de sus hijos.
              </p>
              <p>
                Hoy seguimos creando de forma artesanal, cuidando cada detalle y
                escuchando la historia que quieres celebrar.
              </p>
            </div>
          </div>
        </section>

        <section className="section-shell faq-section" id="preguntas">
          <div className="faq-intro">
            <p className="eyebrow">Preguntas frecuentes</p>
            <h2>Antes de hacer tu pedido.</h2>
            <p>
              Si tu duda no aparece aquí, escríbenos y te ayudamos
              personalmente.
            </p>
            <a className="inline-link" href="/condiciones-de-pedidos">
              Ver todas las condiciones <ArrowRight aria-hidden="true" />
            </a>
          </div>
          <div className="faq-list">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="closing-section">
          <div className="closing-icon" aria-hidden="true">
            <CakeSlice />
          </div>
          <p className="eyebrow eyebrow-light">El siguiente paso</p>
          <h2>¿Tienes una idea o alguna duda?</h2>
          <p>
            Escríbenos y te ayudamos a preparar algo especial para tu
            celebración.
          </p>
          <a
            className="button button-cream"
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
          >
            Pedir información
          </a>
        </section>
      </main>

      <SiteFooter />

      <a
        className="whatsapp-float"
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Pedir información por WhatsApp"
      >
        <MessageCircle aria-hidden="true" />
      </a>
    </>
  );
}
