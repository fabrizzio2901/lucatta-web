'use client';

import { Expand, X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const creations = [
  {
    src: '/images/pastel-floral-rosa.jpeg',
    title: 'Pastel floral en tonos vibrantes',
    alt: 'Pastel rosa alto con flores de colores y decoración ondulada',
    size: 'tall',
  },
  {
    src: '/images/pastel-frutos-rojos.jpeg',
    title: 'Pastel con frutos rojos',
    alt: 'Pastel blanco decorado con fresas, frambuesas y zarzamoras',
    size: 'standard',
  },
  {
    src: '/images/pastel-musical.jpeg',
    title: 'Diseño musical personalizado',
    alt: 'Pastel blanco con micrófonos, notas musicales y detalles negros y dorados',
    size: 'standard',
  },
  {
    src: '/images/fresas-decoradas.jpeg',
    title: 'Fresas decoradas por encargo',
    alt: 'Selección de fresas decoradas en tonos chocolate, blanco y dorado',
    size: 'wide',
  },
  {
    src: '/images/pastel-rectangular.jpeg',
    title: 'Pastel floral para compartir',
    alt: 'Pastel rectangular blanco con flores y decoración rosa',
    size: 'wide',
  },
  {
    src: '/images/arreglo-fresas.jpeg',
    title: 'Arreglo de fresas decoradas',
    alt: 'Arreglo de fresas cubiertas con chocolate y rosas de color rosa',
    size: 'standard',
  },
  {
    src: '/images/pastel-dodgers.jpeg',
    title: 'Pastel temático personalizado',
    alt: 'Pastel blanco y azul con decoración temática de béisbol',
    size: 'standard',
  },
];

export function Gallery() {
  return (
    <div className="gallery-grid">
      {creations.map((creation) => (
        <Dialog key={creation.src}>
          <DialogTrigger
            render={
              <button
                className={`gallery-card gallery-card-${creation.size}`}
                type="button"
                aria-label={`Ampliar ${creation.title}`}
              />
            }
          >
            <img src={creation.src} alt={creation.alt} loading="lazy" />
            <span className="gallery-overlay">
              <span>{creation.title}</span>
              <Expand aria-hidden="true" />
            </span>
          </DialogTrigger>

          <DialogContent className="gallery-dialog" showCloseButton={false}>
            <DialogClose
              render={
                <button className="gallery-close" type="button" aria-label="Cerrar imagen">
                  <X aria-hidden="true" />
                </button>
              }
            />
            <img src={creation.src} alt={creation.alt} />
            <div className="gallery-dialog-copy">
              <DialogTitle>{creation.title}</DialogTitle>
              <DialogDescription>
                Ejemplo de un trabajo realizado por encargo. Cada diseño y sus detalles se acuerdan con
                cada cliente.
              </DialogDescription>
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
