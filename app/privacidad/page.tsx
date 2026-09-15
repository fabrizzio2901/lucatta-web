import type { Metadata } from 'next';
import {
  ArrowLeft,
  Database,
  ExternalLink,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Aviso de privacidad | Lucátta',
  description:
    'Conoce cómo Lucátta recopila, utiliza, conserva y protege los datos personales relacionados con pedidos y atención por WhatsApp.',
};

const privacySections = [
  { id: 'responsable', label: 'Responsable' },
  { id: 'datos', label: 'Datos que tratamos' },
  { id: 'finalidades', label: 'Para qué los usamos' },
  { id: 'automatizacion', label: 'Atención automatizada' },
  { id: 'proveedores', label: 'Proveedores y transferencias' },
  { id: 'conservacion', label: 'Conservación y seguridad' },
  { id: 'derechos', label: 'Tus derechos' },
  { id: 'consentimiento', label: 'Consentimiento' },
  { id: 'cambios', label: 'Cambios al aviso' },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="privacy-page">
        <header className="inner-hero privacy-hero">
          <div className="inner-hero-copy">
            <a className="back-link" href="/">
              <ArrowLeft aria-hidden="true" /> Volver al inicio
            </a>
            <p className="eyebrow eyebrow-light">Información sobre tus datos</p>
            <h1>Aviso de privacidad</h1>
            <p>
              Este aviso explica qué información recibe Lucátta cuando solicitas
              una cotización, realizas un pedido o conversas con nosotros, y
              cómo puedes ejercer tus derechos.
            </p>
            <p className="privacy-updated">
              Última actualización: 10 de septiembre de 2026.
            </p>
          </div>
        </header>

        <div className="privacy-layout section-shell">
          <aside
            className="privacy-index"
            aria-label="Contenido del aviso de privacidad"
          >
            <div>
              <ShieldCheck aria-hidden="true" />
              <p className="footer-label">Contenido</p>
              <nav>
                {privacySections.map((section) => (
                  <a href={`#${section.id}`} key={section.id}>
                    {section.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <article className="privacy-content">
            <section
              className="privacy-intro-card"
              aria-labelledby="resumen-privacidad"
            >
              <Database aria-hidden="true" />
              <div>
                <p className="eyebrow">En pocas palabras</p>
                <h2 id="resumen-privacidad">
                  Usamos únicamente la información necesaria para atender tu
                  pedido.
                </h2>
                <p>
                  No vendemos ni rentamos datos personales. Las cotizaciones,
                  precios, disponibilidad y verificaciones de pago siempre
                  requieren revisión humana.
                </p>
              </div>
            </section>

            <section className="privacy-section" id="responsable">
              <p className="privacy-number">01</p>
              <div>
                <h2>Responsable del tratamiento</h2>
                <p>
                  <strong>Lucátta Pâtisserie</strong>, negocio operado por su
                  persona propietaria, es responsable del tratamiento de los
                  datos personales descritos en este aviso. Su domicilio de
                  contacto es Nacional 54, San Juan, 72990 Casa Blanca, Puebla.
                </p>
                <p>
                  Para asuntos de privacidad puedes escribir a{' '}
                  <a
                    className="privacy-inline-link"
                    href="mailto:lucatta.bakery@gmail.com"
                  >
                    lucatta.bakery@gmail.com
                  </a>
                  .
                </p>
              </div>
            </section>

            <section className="privacy-section" id="datos">
              <p className="privacy-number">02</p>
              <div>
                <h2>Datos personales que tratamos</h2>
                <ul>
                  <li>
                    <strong>Identificación y contacto:</strong> número de
                    WhatsApp, nombre de perfil y nombre que nos proporciones.
                  </li>
                  <li>
                    <strong>Solicitud y pedido:</strong> fecha y hora, producto,
                    cantidad o porciones, sabores, rellenos, diseño, colores,
                    decoración, texto, observaciones e imagen de referencia
                    opcional.
                  </li>
                  <li>
                    <strong>Entrega:</strong> modalidad, domicilio, colonia,
                    zona o código postal, nombre de quien recibe y referencias,
                    únicamente cuando solicites entrega a domicilio.
                  </li>
                  <li>
                    <strong>Pago:</strong> imagen o documento del comprobante,
                    importe declarado, fecha de recepción y resultado de la
                    verificación. Lucátta no solicita contraseñas, NIP, códigos
                    de seguridad ni datos completos de tarjetas.
                  </li>
                  <li>
                    <strong>Conversación y operación:</strong> contenido de
                    mensajes, identificadores técnicos, archivos enviados,
                    fechas, estados del pedido, alertas y registros necesarios
                    para dar seguimiento.
                  </li>
                </ul>
                <p>
                  No solicitamos datos personales sensibles por medio del
                  asistente. Si tu pedido requiere comunicar información de
                  salud o alergias, pide atención de una persona y comparte
                  únicamente lo indispensable.
                </p>
              </div>
            </section>

            <section className="privacy-section" id="finalidades">
              <p className="privacy-number">03</p>
              <div>
                <h2>Finalidades necesarias</h2>
                <p>La información se utiliza para:</p>
                <ul>
                  <li>identificarte y responder tus mensajes;</li>
                  <li>
                    recopilar requisitos y elaborar una cotización
                    personalizada;
                  </li>
                  <li>
                    revisar disponibilidad, capacidad de producción y cobertura
                    de entrega;
                  </li>
                  <li>
                    reservar temporalmente una fecha cuando aceptes una
                    cotización;
                  </li>
                  <li>recibir y verificar comprobantes de pago;</li>
                  <li>
                    producir, coordinar, entregar y dar seguimiento al pedido;
                  </li>
                  <li>
                    enviar recordatorios y avisos operativos relacionados con tu
                    solicitud;
                  </li>
                  <li>
                    atender aclaraciones, cancelaciones, cambios y solicitudes
                    de soporte; y
                  </li>
                  <li>
                    mantener seguridad, trazabilidad y cumplimiento de
                    obligaciones legales.
                  </li>
                </ul>
                <p>
                  No usamos estos datos para publicidad o promociones sin
                  solicitar antes un consentimiento separado.
                </p>
              </div>
            </section>

            <section className="privacy-section" id="automatizacion">
              <p className="privacy-number">04</p>
              <div>
                <h2>Atención automatizada y decisiones humanas</h2>
                <p>
                  El asistente de WhatsApp puede organizar la información,
                  registrar solicitudes, consultar horarios, mostrar avisos de
                  cierre y enviar recordatorios. Puedes escribir{' '}
                  <strong>PERSONA</strong> o pedir atención humana en cualquier
                  momento.
                </p>
                <p>
                  El sistema no fija precios ni confirma por sí solo la
                  disponibilidad, los pagos, los pedidos urgentes o las
                  excepciones. Esas decisiones corresponden a la persona
                  propietaria o al personal autorizado de Lucátta.
                </p>
              </div>
            </section>

            <section className="privacy-section" id="proveedores">
              <p className="privacy-number">05</p>
              <div>
                <h2>Proveedores, encargados y transferencias</h2>
                <p>
                  Para prestar el servicio usamos herramientas de WhatsApp y
                  Meta, Gmail para alertas, Supabase para la base de datos y
                  archivos, además de infraestructura de automatización y
                  alojamiento. Estos proveedores pueden procesar información por
                  cuenta de Lucátta conforme a sus contratos, medidas de
                  seguridad y avisos de privacidad, incluso en otros países.
                </p>
                <p>
                  Cuando solicites entrega, compartiremos solamente los datos
                  necesarios con la persona autorizada para realizarla. También
                  podremos comunicar información a una autoridad cuando exista
                  una obligación legal. Fuera de estos casos, no realizamos
                  transferencias que requieran tu consentimiento sin solicitarlo
                  previamente.
                </p>
              </div>
            </section>

            <section className="privacy-section" id="conservacion">
              <p className="privacy-number">06</p>
              <div>
                <h2>Conservación y seguridad</h2>
                <p>
                  Las conversaciones, cotizaciones, fotografías, comprobantes y
                  datos operativos se conservan hasta un mes después de que el
                  pedido o la solicitud concluye, se cancela, se rechaza o se
                  abandona. Después se eliminan o anonimizan de forma operativa.
                </p>
                <p>
                  Podremos conservar por un plazo mayor únicamente los importes,
                  estados y documentos que deban mantenerse por obligaciones
                  fiscales, contables, contractuales o para atender una
                  controversia. Aplicamos controles de acceso y limitamos la
                  consulta a la persona propietaria y al personal autorizado.
                </p>
              </div>
            </section>

            <section className="privacy-section" id="derechos">
              <p className="privacy-number">07</p>
              <div>
                <h2>Derechos ARCO y otras solicitudes</h2>
                <p>
                  Puedes solicitar acceso, rectificación, cancelación u
                  oposición respecto de tus datos personales; también puedes
                  limitar su uso o revocar tu consentimiento. Envía un correo a{' '}
                  <a
                    className="privacy-inline-link"
                    href="mailto:lucatta.bakery@gmail.com"
                  >
                    lucatta.bakery@gmail.com
                  </a>{' '}
                  con el asunto{' '}
                  <strong>Datos personales — Derechos ARCO</strong>.
                </p>
                <p>
                  Incluye tu nombre, un medio para responderte, el derecho que
                  deseas ejercer y una descripción clara de los datos
                  relacionados. Podremos solicitar información razonable para
                  verificar tu identidad. Responderemos dentro de los plazos
                  establecidos por la legislación aplicable.
                </p>
              </div>
            </section>

            <section className="privacy-section" id="consentimiento">
              <p className="privacy-number">08</p>
              <div>
                <h2>Consentimiento y datos de terceros</h2>
                <p>
                  Al continuar una conversación después de tener este aviso a tu
                  disposición, consientes el tratamiento necesario para atender
                  tu solicitud. Cuando envías voluntariamente un comprobante,
                  manifiestas expresamente tu consentimiento para tratar la
                  información financiera o patrimonial visible en él con el
                  único fin de verificar el pago.
                </p>
                <p>
                  Si proporcionas el nombre, una fotografía u otro dato de una
                  tercera persona, declara que cuentas con autorización para
                  hacerlo. La atención por WhatsApp está dirigida a personas
                  adultas; no recopilamos deliberadamente datos directamente de
                  menores de edad.
                </p>
              </div>
            </section>

            <section className="privacy-section" id="cambios">
              <p className="privacy-number">09</p>
              <div>
                <h2>Cambios a este aviso</h2>
                <p>
                  Publicaremos cualquier modificación en esta misma página e
                  indicaremos la fecha de actualización. Cuando el cambio sea
                  sustancial y tengamos un medio de contacto vigente, podremos
                  avisarlo por WhatsApp o correo electrónico.
                </p>
                <a
                  className="privacy-source-link"
                  href="https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Consultar la legislación federal aplicable
                  <ExternalLink aria-hidden="true" />
                </a>
              </div>
            </section>

            <section
              className="privacy-contact-card"
              aria-labelledby="contacto-privacidad"
            >
              <Mail aria-hidden="true" />
              <div>
                <p className="eyebrow">Contacto</p>
                <h2 id="contacto-privacidad">
                  ¿Tienes una pregunta sobre tus datos?
                </h2>
                <a href="mailto:lucatta.bakery@gmail.com">
                  lucatta.bakery@gmail.com
                </a>
              </div>
            </section>
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
