import type { Metadata } from 'next';
import {
  ArrowLeft,
  CalendarDays,
  Coffee,
  MessageCircle,
  PartyPopper,
  UsersRound,
} from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { WHATSAPP_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Eventos | Lucátta',
  description:
    'Información básica sobre mesas de postres, catering y coffee breaks personalizados de Lucátta en Puebla.',
};

const services = [
  {
    icon: PartyPopper,
    title: 'Mesas de postres',
    text: 'Cuéntanos la ocasión, el número de asistentes y el estilo que imaginas. La selección de postres y el alcance del servicio se cotizan para cada evento.',
  },
  {
    icon: UsersRound,
    title: 'Catering',
    text: 'Revisamos contigo el tipo de reunión y tus necesidades. Los alimentos, la modalidad y todo complemento se confirman por escrito en la cotización.',
  },
  {
    icon: Coffee,
    title: 'Coffee breaks',
    text: 'Comparte la fecha, la duración y la cantidad de personas. La propuesta y la disponibilidad se preparan de acuerdo con esos datos.',
  },
];

const requestDetails = [
  'Fecha y horario del evento',
  'Número estimado de asistentes',
  'Tipo de celebración o reunión',
  'Zona o ubicación del evento',
];

const faqs = [
  {
    question: '¿Los servicios tienen un paquete fijo?',
    answer:
      'La información disponible por ahora es personalizada. Prepararemos la propuesta según el tipo de evento, la fecha, la cantidad de asistentes y el alcance que acordemos contigo.',
  },
  {
    question: '¿Qué incluye cada servicio?',
    answer:
      'Los productos y servicios incluidos se detallan en cada cotización. No se consideran incluidos automáticamente el montaje, mobiliario, vajilla, bebidas, personal, transporte o desmontaje.',
  },
  {
    question: '¿Cómo consulto disponibilidad?',
    answer:
      'Escríbenos por WhatsApp con los datos básicos de tu evento. Revisaremos la fecha y te indicaremos los siguientes pasos.',
  },
];

export default function EventsPage() {
  return (
    <>
      <SiteHeader />
      <main className="events-page">
        <header className="inner-hero events-hero">
          <div className="inner-hero-copy">
            <a className="back-link" href="/#eventos">
              <ArrowLeft aria-hidden="true" /> Volver al inicio
            </a>
            <p className="eyebrow eyebrow-light">Celebraciones y reuniones</p>
            <h1>Eventos con el sello artesanal de Lucátta.</h1>
            <p>
              Podemos preparar una propuesta para mesas de postres, catering o
              coffee breaks. Cada detalle se revisa personalmente para definir
              disponibilidad, productos y alcance.
            </p>
            <a
              className="button button-cream events-hero-cta"
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
            >
              Pedir información
            </a>
          </div>
        </header>

        <section
          className="section-shell event-services"
          aria-labelledby="servicios-eventos"
        >
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">Servicios para compartir</p>
              <h2 id="servicios-eventos">
                Una propuesta pensada para tu ocasión.
              </h2>
            </div>
            <p>
              Esta página presenta las opciones generales. La disponibilidad y
              las características de cada servicio se confirman en tu
              cotización.
            </p>
          </div>

          <div className="event-services-grid">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <article key={service.title}>
                  <div className="event-service-number">
                    <span>0{index + 1}</span>
                    <Icon aria-hidden="true" />
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="event-request-section">
          <div className="section-shell event-request-layout">
            <div>
              <p className="eyebrow eyebrow-light">Para comenzar</p>
              <h2>Cuatro datos nos ayudan a entender tu evento.</h2>
              <p>
                Con esta información podremos revisar el caso y conversar
                contigo sobre una propuesta. Enviar el mensaje no reserva la
                fecha.
              </p>
            </div>
            <ol className="event-request-list">
              {requestDetails.map((detail, index) => (
                <li key={detail}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="section-shell event-scope"
          aria-labelledby="alcance-eventos"
        >
          <div className="event-scope-card">
            <CalendarDays aria-hidden="true" />
            <div>
              <p className="eyebrow">Alcance personalizado</p>
              <h2 id="alcance-eventos">
                Lo acordado quedará claro en tu cotización.
              </h2>
              <p>
                Antes de confirmar, revisaremos contigo productos, cantidades,
                horarios, entrega y cualquier servicio adicional. No damos por
                incluidos elementos que todavía no hayan sido acordados
                expresamente.
              </p>
            </div>
          </div>
        </section>

        <section className="section-shell event-faq-section">
          <div className="faq-intro">
            <p className="eyebrow">Preguntas frecuentes</p>
            <h2>Antes de solicitar información.</h2>
            <p>
              Si todavía no tienes todos los datos, comparte lo que ya sabes y
              te orientaremos.
            </p>
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

        <section className="closing-section event-closing">
          <div className="closing-icon" aria-hidden="true">
            <MessageCircle />
          </div>
          <p className="script-accent">Hablemos de tu celebración</p>
          <h2>¿Ya tienes una fecha en mente?</h2>
          <p>
            Escríbenos y revisaremos contigo la información básica de tu evento.
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
