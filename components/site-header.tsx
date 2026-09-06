'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { WHATSAPP_URL, siteStatus } from '@/lib/site';

const navigation = [
  { label: 'Creaciones', href: '/#creaciones' },
  { label: 'Cómo pedir', href: '/#como-pedir' },
  ...(siteStatus.eventsPageReady
    ? [{ label: 'Eventos', href: '/eventos' }]
    : []),
  { label: 'Nuestro local', href: '/#local' },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Lucátta, ir al inicio">
        <img src="/images/simbolo-lucatta.png" alt="" />
        <span>Lucátta</span>
      </a>

      <nav className="desktop-nav" aria-label="Navegación principal">
        {navigation.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>

      <a
        className="button button-small header-cta"
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
      >
        Pedir información
      </a>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger
          render={
            <button
              className="menu-trigger"
              type="button"
              aria-label="Abrir menú"
            >
              <Menu aria-hidden="true" />
            </button>
          }
        />
        <SheetContent
          className="mobile-sheet"
          side="right"
          showCloseButton={false}
        >
          <SheetClose
            render={
              <button
                className="menu-close"
                type="button"
                aria-label="Cerrar menú"
              >
                <X aria-hidden="true" />
              </button>
            }
          />
          <SheetHeader className="mobile-sheet-header">
            <SheetTitle className="mobile-sheet-title">Lucátta</SheetTitle>
            <SheetDescription>
              Pastelería artesanal y personalizada.
            </SheetDescription>
          </SheetHeader>
          <nav className="mobile-nav" aria-label="Navegación móvil">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mobile-sheet-footer">
            <a
              className="button"
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenuOpen(false)}
            >
              Pedir información
            </a>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
