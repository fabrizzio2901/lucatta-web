import { AtSign, Clock3, MapPin } from 'lucide-react';
import { INSTAGRAM_URL, WHATSAPP_URL, siteStatus } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src="/images/simbolo-lucatta.png" alt="" />
        <div>
          <p className="footer-name">Lucátta</p>
          <p>Pastelería artesanal</p>
        </div>
      </div>

      <div className="footer-columns">
        <div>
          <p className="footer-label">Hablemos</p>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            WhatsApp · 222 354 6215
          </a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
            <AtSign aria-hidden="true" /> @lucattapatisserie
          </a>
        </div>
        <div>
          <p className="footer-label">Atención personal</p>
          <p className="footer-detail">
            <Clock3 aria-hidden="true" /> {siteStatus.whatsappHours}
          </p>
          <a href="/#local">
            <MapPin aria-hidden="true" /> Nuestro próximo local
          </a>
        </div>
        <div>
          <p className="footer-label">Información</p>
          {siteStatus.eventsPageReady && (
            <a href="/eventos">Servicios para eventos</a>
          )}
          <a href="/condiciones-de-pedidos">Condiciones de pedidos</a>
          <a href="/#como-pedir">Cómo hacer tu pedido</a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Lucátta</p>
        <p>Hecho con calma, detalle y mucho antojo.</p>
      </div>
    </footer>
  );
}
