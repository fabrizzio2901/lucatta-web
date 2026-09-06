'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';

const slides = [
  {
    src: '/images/pastel-floral-rosa.jpeg',
    alt: 'Pastel rosa con flores elaborado por Lucátta',
    caption: 'Diseños que empiezan con tu idea',
    fit: 'portrait',
  },
  {
    src: '/images/hero-aniversario.jpeg',
    alt: 'Pastel blanco de aniversario elaborado por Lucátta',
    caption: 'Celebraciones hechas a tu medida',
    fit: 'landscape',
  },
  {
    src: '/images/pastel-frutos-rojos.jpeg',
    alt: 'Pastel blanco con fresas, frambuesas y zarzamoras elaborado por Lucátta',
    caption: 'Detalles artesanales para compartir',
    fit: 'portrait',
  },
  {
    src: '/images/arreglo-fresas.jpeg',
    alt: 'Arreglo de fresas con chocolate y flores preparado por Lucátta',
    caption: 'Un detalle pensado para esa persona',
    fit: 'portrait',
  },
] as const;

export function HeroCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const updateCurrent = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return;
    setCurrent(carouselApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;

    api.on('select', updateCurrent);
    api.on('reInit', updateCurrent);

    return () => {
      api.off('select', updateCurrent);
      api.off('reInit', updateCurrent);
    };
  }, [api, updateCurrent]);

  return (
    <div className="hero-carousel-shell">
      <Carousel
        className="hero-carousel"
        opts={{ loop: true }}
        setApi={setApi}
        aria-label="Creaciones destacadas de Lucátta"
      >
        <CarouselContent className="hero-carousel-track">
          {slides.map((slide, index) => (
            <CarouselItem
              className="hero-carousel-item"
              key={slide.src}
              aria-label={`${index + 1} de ${slides.length}`}
            >
              <figure className="hero-slide">
                <div
                  className={`hero-slide-media hero-slide-media-${slide.fit}`}
                >
                  <img src={slide.src} alt={slide.alt} />
                </div>
                <figcaption>{slide.caption}</figcaption>
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>

        <div className="hero-carousel-controls">
          <div className="hero-carousel-arrows">
            <button
              type="button"
              onClick={() => api?.scrollPrev()}
              aria-label="Ver imagen anterior"
            >
              <ArrowLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => api?.scrollNext()}
              aria-label="Ver imagen siguiente"
            >
              <ArrowRight aria-hidden="true" />
            </button>
          </div>

          <div className="hero-carousel-dots" aria-label="Seleccionar imagen">
            {slides.map((slide, index) => (
              <button
                type="button"
                className={index === current ? 'is-active' : undefined}
                key={slide.src}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Ir a la imagen ${index + 1}`}
                aria-current={index === current ? 'true' : undefined}
              />
            ))}
          </div>

          <p
            className="hero-carousel-status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span>{String(current + 1).padStart(2, '0')}</span>
            <span aria-hidden="true">/</span>
            <span>{String(slides.length).padStart(2, '0')}</span>
          </p>
        </div>
      </Carousel>
    </div>
  );
}
