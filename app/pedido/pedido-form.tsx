'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChangeEvent, SubmitEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Store,
} from 'lucide-react';
import type {
  BusinessSettings,
  CatalogKind,
  CatalogOption,
  Closure,
} from '@/lib/lucatta-types';

type Pedido = {
  categoria: 'PASTEL' | 'POSTRE' | 'EVENTO';
  producto: string;
  tipo: string;
  ocasion: string;
  fecha: string;
  hora: string;
  modalidad: 'RECOGIDA' | 'DOMICILIO';
  direccion: string;
  zona: string;
  recibe: string;
  referencias: string;
  porciones: string;
  cantidad: string;
  sabor: string;
  relleno: string;
  presentacion: string;
  colores: string[];
  diseno: string;
  textoPastel: string;
  alergias: 'NO' | 'SI';
  detalleAlergias: string;
  nombre: string;
  whatsapp: string;
  observaciones: string;
  aceptaAviso: boolean;
};

const initialPedido: Pedido = {
  categoria: 'PASTEL',
  producto: '',
  tipo: '',
  ocasion: '',
  fecha: '',
  hora: '',
  modalidad: 'RECOGIDA',
  direccion: '',
  zona: '',
  recibe: '',
  referencias: '',
  porciones: '',
  cantidad: '1',
  sabor: '',
  relleno: '',
  presentacion: '',
  colores: [],
  diseno: '',
  textoPastel: '',
  alergias: 'NO',
  detalleAlergias: '',
  nombre: '',
  whatsapp: '',
  observaciones: '',
  aceptaAviso: false,
};

const steps = [
  'Fecha y entrega',
  'Tamaño',
  'Sabor del pan',
  'Relleno',
  'Colores',
  'Diseño',
  'Referencia',
  'Tus datos',
  'Revisión',
];

const categoryChoices = [
  { value: 'PASTEL', icon: '🎂', label: 'Pastel personalizado' },
  { value: 'POSTRE', icon: '🧁', label: 'Postres' },
  { value: 'EVENTO', icon: '✨', label: 'Evento o mesa dulce' },
] as const;

export function PedidoForm() {
  const [step, setStep] = useState(0);
  const [pedido, setPedido] = useState<Pedido>(initialPedido);
  const [items, setItems] = useState<CatalogOption[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [reference, setReference] = useState<File | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sentCode, setSentCode] = useState('');
  const [draftId, setDraftId] = useState('');

  useEffect(() => {
    fetch('/api/catalogo')
      .then(async (response) => {
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
          items?: CatalogOption[];
          settings?: BusinessSettings;
          closures?: Closure[];
        };
        if (!response.ok || !data.ok)
          throw new Error(data.error || 'No pudimos cargar las opciones.');
        setItems(data.items || []);
        setSettings(data.settings || null);
        setClosures(data.closures || []);
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : 'No pudimos cargar las opciones.',
        ),
      )
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    let timeout = 0;
    try {
      const stored = window.localStorage.getItem('lucatta-order-draft');
      if (!stored) return;
      const restored = JSON.parse(stored) as {
        id?: string;
        pedido?: Partial<Pedido>;
      };
      if (restored.pedido?.aceptaAviso) {
        timeout = window.setTimeout(() => {
          setPedido((current) => ({ ...current, ...restored.pedido }));
          setDraftId(restored.id || '');
        });
      }
    } catch {
      window.localStorage.removeItem('lucatta-order-draft');
    }
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const whatsapp = pedido.whatsapp.replace(/\D/g, '');
    if (
      !pedido.aceptaAviso ||
      !pedido.nombre.trim() ||
      whatsapp.length !== 10 ||
      sentCode
    ) {
      return;
    }
    window.localStorage.setItem(
      'lucatta-order-draft',
      JSON.stringify({ id: draftId, pedido }),
    );
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/pedido/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...pedido,
            id: draftId || undefined,
            whatsapp,
          }),
        });
        const data = (await response.json()) as { ok?: boolean; id?: string };
        if (response.ok && data.ok && data.id) {
          setDraftId(data.id);
          window.localStorage.setItem(
            'lucatta-order-draft',
            JSON.stringify({ id: data.id, pedido }),
          );
        }
      } catch {
        // El formulario sigue funcionando aunque el guardado silencioso falle.
      }
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [draftId, pedido, sentCode]);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
  }, []);

  const options = (kind: CatalogKind) =>
    items.filter((item) => item.kind === kind);
  const setField = <K extends keyof Pedido>(key: K, value: Pedido[K]) => {
    setPedido((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const closedForDate = pedido.fecha
    ? closures.find(
        (item) =>
          item.starts_on <= pedido.fecha && item.ends_on >= pedido.fecha,
      )
    : undefined;

  const validate = () => {
    if (step === 0) {
      if (!pedido.ocasion.trim() || !pedido.fecha || !pedido.hora)
        return 'Elige ocasión, fecha y horario.';
      if (closedForDate)
        return `${closedForDate.message} Volvemos el ${closedForDate.resumes_on}.`;
      if (
        pedido.modalidad === 'DOMICILIO' &&
        (!pedido.direccion.trim() || !pedido.zona.trim())
      )
        return 'Agrega la dirección y la zona de entrega.';
    }
    if (step === 1) {
      if (!pedido.producto) return 'Elige el producto que necesitas.';
      const hasTypes = options('PRODUCT_TYPE').some((item) => {
        const category =
          typeof item.metadata?.category === 'string'
            ? item.metadata.category
            : '';
        return !category || category === pedido.categoria;
      });
      if (hasTypes && !pedido.tipo) return 'Elige el tipo de producto.';
      if (pedido.categoria === 'PASTEL' && !pedido.porciones)
        return 'Elige las porciones.';
      if (pedido.categoria !== 'PASTEL' && Number(pedido.cantidad) < 1)
        return 'Indica la cantidad.';
    }
    if (step === 2 && !pedido.sabor) return 'Elige un sabor de pan.';
    if (step === 3 && !pedido.relleno) return 'Elige un relleno.';
    if (step === 4 && !pedido.colores.length) return 'Elige al menos un color.';
    if (step === 5 && !pedido.diseno.trim())
      return 'Describe brevemente el diseño que imaginas.';
    if (step === 7) {
      if (pedido.alergias === 'SI' && !pedido.detalleAlergias.trim())
        return 'Describe la alergia para que una persona la revise.';
      if (
        !pedido.nombre.trim() ||
        pedido.whatsapp.replace(/\D/g, '').length !== 10
      )
        return 'Escribe tu nombre y un WhatsApp de 10 dígitos.';
      if (!pedido.aceptaAviso)
        return 'Confirma que leíste el aviso de privacidad.';
    }
    return '';
  };

  const next = () => {
    const message = validate();
    if (message) return setError(message);
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const form = new FormData();
      form.append(
        'payload',
        JSON.stringify({
          ...pedido,
          draftId: draftId || null,
          whatsapp: pedido.whatsapp.replace(/\D/g, ''),
        }),
      );
      if (reference) form.append('reference', reference);
      const response = await fetch('/api/pedido', {
        method: 'POST',
        body: form,
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        result?: { code?: string };
      };
      if (!response.ok || !data.ok)
        throw new Error(data.error || 'No pudimos guardar tu solicitud.');
      window.localStorage.removeItem('lucatta-order-draft');
      setSentCode(data.result?.code || '');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No pudimos guardar tu solicitud.',
      );
    } finally {
      setSending(false);
    }
  };

  const choiceCards = (
    kind: CatalogKind,
    field:
      | 'producto'
      | 'tipo'
      | 'porciones'
      | 'sabor'
      | 'relleno'
      | 'presentacion',
  ) => {
    const entries = options(kind).filter((item) => {
      const category =
        typeof item.metadata?.category === 'string'
          ? item.metadata.category
          : '';
      return !category || category === pedido.categoria;
    });
    if (!entries.length)
      return (
        <p className="order-empty-options">
          Lucátta aún no ha publicado opciones en esta sección.
        </p>
      );
    return (
      <div className="order-visual-grid">
        {entries.map((item) => {
          const selected = pedido[field] === item.name;
          return (
            <button
              className={
                selected ? 'order-visual-card selected' : 'order-visual-card'
              }
              type="button"
              onClick={() => setField(field, item.name)}
              key={item.id}
            >
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt=""
                  width={360}
                  height={224}
                  unoptimized
                />
              ) : (
                <span className="order-card-monogram">
                  {item.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span>
                <strong>{item.name}</strong>
                {item.description && <small>{item.description}</small>}
              </span>
              {selected && <Check aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    );
  };

  if (catalogLoading)
    return (
      <div className="order-form order-loading">
        <LoaderCircle className="order-spinner" /> Preparando las opciones de
        Lucátta…
      </div>
    );

  if (sentCode) {
    return (
      <output className="order-success">
        <span>
          <Check aria-hidden="true" />
        </span>
        <p className="eyebrow">Solicitud {sentCode}</p>
        <h2>Tu resumen ya está listo.</h2>
        <p>
          Te enviaremos el resumen a WhatsApp para que lo confirmes. Después una
          persona de Lucátta preparará la cotización.
        </p>
        <p className="order-form-note">
          Esto todavía no reserva la fecha ni genera un cobro.
        </p>
      </output>
    );
  }

  return (
    <form
      className="order-form order-form-dynamic"
      onSubmit={submit}
      noValidate
    >
      <div
        className="order-progress"
        aria-label={`Paso ${step + 1} de ${steps.length}`}
      >
        <p>
          Paso {step + 1} de {steps.length}
        </p>
        <div>
          <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <strong>{steps[step]}</strong>
      </div>

      {step === 0 && (
        <fieldset>
          <legend>¿Cuándo y cómo lo recibirás?</legend>
          <p className="order-form-lead">
            Primero cuéntanos qué celebraremos. La disponibilidad siempre se
            confirma personalmente.
          </p>
          <div className="order-choice-grid">
            {categoryChoices.map((choice) => (
              <button
                className={
                  pedido.categoria === choice.value
                    ? 'order-choice selected'
                    : 'order-choice'
                }
                type="button"
                key={choice.value}
                onClick={() => setField('categoria', choice.value)}
              >
                <span>{choice.icon}</span>
                <strong>{choice.label}</strong>
              </button>
            ))}
          </div>
          <label>
            ¿Qué celebraremos?
            <input
              value={pedido.ocasion}
              onChange={(event) => setField('ocasion', event.target.value)}
              placeholder="Por ejemplo: cumpleaños de Ana"
            />
          </label>
          <div className="order-two-columns">
            <label>
              Fecha
              <input
                type="date"
                min={today}
                value={pedido.fecha}
                onChange={(event) => setField('fecha', event.target.value)}
              />
            </label>
            <label>
              Horario
              <select
                value={pedido.hora}
                onChange={(event) => setField('hora', event.target.value)}
              >
                <option value="">Selecciona</option>
                {options('TIME_SLOT').map((item) => (
                  <option
                    key={item.id}
                    value={
                      typeof item.metadata?.time === 'string'
                        ? item.metadata.time
                        : item.name
                    }
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {pedido.fecha === today && (
            <p className="order-urgent-note">
              <Clock3 /> Un pedido para hoy requiere al menos{' '}
              {settings?.same_day_min_hours || 5} horas, insumos disponibles,
              cero compromisos y aprobación humana. El costo extra lo captura el
              personal.
            </p>
          )}
          {closedForDate && (
            <p className="order-error">
              {closedForDate.message} Volvemos el {closedForDate.resumes_on}.
            </p>
          )}
          <div className="order-choice-grid two">
            <button
              className={
                pedido.modalidad === 'RECOGIDA'
                  ? 'order-choice selected'
                  : 'order-choice'
              }
              type="button"
              onClick={() => setField('modalidad', 'RECOGIDA')}
            >
              <Store />
              <strong>Recoger en el local</strong>
            </button>
            <button
              className={
                pedido.modalidad === 'DOMICILIO'
                  ? 'order-choice selected'
                  : 'order-choice'
              }
              type="button"
              onClick={() => setField('modalidad', 'DOMICILIO')}
            >
              <MapPin />
              <strong>Entrega a domicilio</strong>
            </button>
          </div>
          {pedido.modalidad === 'RECOGIDA' ? (
            <div className="order-pickup-card">
              <strong>Lucátta · Casa Blanca</strong>
              <p>{settings?.address}</p>
              {settings?.maps_url && (
                <a href={settings.maps_url} target="_blank" rel="noreferrer">
                  Ver en Google Maps
                </a>
              )}
            </div>
          ) : (
            <>
              <label>
                Dirección completa
                <input
                  value={pedido.direccion}
                  onChange={(event) =>
                    setField('direccion', event.target.value)
                  }
                />
              </label>
              <div className="order-two-columns">
                <label>
                  Colonia o C.P.
                  <input
                    value={pedido.zona}
                    onChange={(event) => setField('zona', event.target.value)}
                  />
                </label>
                <label>
                  ¿Quién recibe?
                  <input
                    value={pedido.recibe}
                    onChange={(event) => setField('recibe', event.target.value)}
                  />
                </label>
              </div>
              <label>
                Referencias para llegar
                <textarea
                  rows={2}
                  value={pedido.referencias}
                  onChange={(event) =>
                    setField('referencias', event.target.value)
                  }
                />
              </label>
              <p className="order-form-note">
                La cobertura y el costo se capturan manualmente en tu
                cotización.
              </p>
            </>
          )}
          <p className="order-form-note">
            Recomendamos {settings?.booking_recommended_days || 3} días de
            anticipación. El mínimo es el día calendario anterior.
          </p>
        </fieldset>
      )}

      {step === 1 && (
        <fieldset>
          <legend>
            {pedido.categoria === 'PASTEL'
              ? 'Elige el tamaño'
              : 'Elige el producto'}
          </legend>
          <p className="order-form-lead">
            Estas opciones las mantiene actualizadas el equipo de Lucátta.
          </p>
          {choiceCards('PRODUCT', 'producto')}
          {options('PRODUCT_TYPE').some((item) => {
            const category =
              typeof item.metadata?.category === 'string'
                ? item.metadata.category
                : '';
            return !category || category === pedido.categoria;
          }) && (
            <>
              <h3 className="order-subheading">Elige el tipo</h3>
              {choiceCards('PRODUCT_TYPE', 'tipo')}
            </>
          )}
          {pedido.categoria === 'PASTEL' ? (
            <>
              <h3 className="order-subheading">¿Para cuántas personas?</h3>
              {choiceCards('PORTION', 'porciones')}
            </>
          ) : (
            <div className="order-two-columns">
              <label>
                Cantidad
                <input
                  type="number"
                  min="1"
                  value={pedido.cantidad}
                  onChange={(event) => setField('cantidad', event.target.value)}
                />
              </label>
              <div>
                {options('PRESENTATION').length > 0 && (
                  <>
                    <span className="order-label">Presentación</span>
                    <select
                      value={pedido.presentacion}
                      onChange={(event) =>
                        setField('presentacion', event.target.value)
                      }
                    >
                      <option value="">Por definir</option>
                      {options('PRESENTATION').map((item) => (
                        <option key={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>
          )}
        </fieldset>
      )}

      {step === 2 && (
        <fieldset>
          <legend>Elige el sabor del pan</legend>
          <p className="order-form-lead">
            Selecciona una opción. Si buscas otra combinación, anótala al
            describir el diseño.
          </p>
          {choiceCards('BREAD_FLAVOR', 'sabor')}
        </fieldset>
      )}

      {step === 3 && (
        <fieldset>
          <legend>Elige el relleno</legend>
          <p className="order-form-lead">
            La disponibilidad final se revisará al cotizar.
          </p>
          {choiceCards('FILLING', 'relleno')}
        </fieldset>
      )}

      {step === 4 && (
        <fieldset>
          <legend>¿Qué colores imaginas?</legend>
          <p className="order-form-lead">Puedes elegir varios.</p>
          <div className="order-color-grid">
            {options('COLOR').map((item) => {
              const selected = pedido.colores.includes(item.name);
              return (
                <button
                  type="button"
                  className={selected ? 'order-color selected' : 'order-color'}
                  key={item.id}
                  onClick={() =>
                    setField(
                      'colores',
                      selected
                        ? pedido.colores.filter((color) => color !== item.name)
                        : [...pedido.colores, item.name],
                    )
                  }
                >
                  <span style={{ background: item.color_hex || '#eee' }} />
                  {item.name}
                  {selected && <Check />}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {step === 5 && (
        <fieldset>
          <legend>Danos vida a tu idea</legend>
          <p className="order-form-lead">
            No tiene que quedar perfecto. El equipo te ayudará a aterrizar los
            detalles.
          </p>
          <label>
            Estilo, tema o decoración
            <textarea
              rows={6}
              value={pedido.diseno}
              onChange={(event) => setField('diseno', event.target.value)}
              placeholder="Describe temática, acabado, personajes, flores u otros elementos…"
            />
          </label>
          <label>
            Texto que llevará el producto
            <input
              value={pedido.textoPastel}
              onChange={(event) => setField('textoPastel', event.target.value)}
              placeholder="Opcional"
            />
          </label>
        </fieldset>
      )}

      {step === 6 && (
        <fieldset>
          <legend>¿Tienes una imagen de referencia?</legend>
          <p className="order-form-lead">
            Es opcional. Sirve como inspiración; el resultado artesanal puede
            tener variaciones y no constituye una copia exacta.
          </p>
          <label className="order-reference-upload">
            <ImagePlus />
            <strong>{reference ? reference.name : 'Elegir imagen'}</strong>
            <small>JPG, PNG o WEBP · máximo 10 MB</small>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setReference(event.target.files?.[0] || null)
              }
            />
          </label>
          {reference && (
            <button
              className="admin-text-button"
              type="button"
              onClick={() => setReference(null)}
            >
              Quitar imagen
            </button>
          )}
        </fieldset>
      )}

      {step === 7 && (
        <fieldset>
          <legend>Tus datos y cuidados especiales</legend>
          <div className="order-sensitive-note">
            <strong>¿Existe alguna alergia o restricción?</strong>
            <p>
              La cocina maneja distintos ingredientes y no puede garantizar
              ausencia total de trazas. Si indicas una alergia, una persona
              revisará tu caso antes de aceptar el pedido.
            </p>
          </div>
          <div className="order-choice-grid two">
            <button
              className={
                pedido.alergias === 'NO'
                  ? 'order-choice selected'
                  : 'order-choice'
              }
              type="button"
              onClick={() => setField('alergias', 'NO')}
            >
              <strong>No</strong>
            </button>
            <button
              className={
                pedido.alergias === 'SI'
                  ? 'order-choice selected'
                  : 'order-choice'
              }
              type="button"
              onClick={() => setField('alergias', 'SI')}
            >
              <strong>Sí, necesito revisión</strong>
            </button>
          </div>
          {pedido.alergias === 'SI' && (
            <label>
              Describe la alergia o restricción
              <textarea
                rows={3}
                value={pedido.detalleAlergias}
                onChange={(event) =>
                  setField('detalleAlergias', event.target.value)
                }
              />
            </label>
          )}
          <div className="order-two-columns">
            <label>
              Tu nombre
              <input
                value={pedido.nombre}
                onChange={(event) => setField('nombre', event.target.value)}
                autoComplete="name"
              />
            </label>
            <label>
              WhatsApp a 10 dígitos
              <input
                inputMode="numeric"
                value={pedido.whatsapp}
                onChange={(event) => setField('whatsapp', event.target.value)}
                placeholder="222 123 4567"
              />
            </label>
          </div>
          <label>
            Observaciones
            <textarea
              rows={3}
              value={pedido.observaciones}
              onChange={(event) =>
                setField('observaciones', event.target.value)
              }
              placeholder="Opcional"
            />
          </label>
          <label className="order-check">
            <input
              type="checkbox"
              checked={pedido.aceptaAviso}
              onChange={(event) =>
                setField('aceptaAviso', event.target.checked)
              }
            />
            <span>
              Leí el{' '}
              <Link href="/privacidad" target="_blank">
                aviso de privacidad
              </Link>{' '}
              y autorizo el uso de estos datos para atender mi solicitud.
            </span>
          </label>
        </fieldset>
      )}

      {step === 8 && (
        <fieldset>
          <legend>Revisa tu solicitud</legend>
          <p className="order-form-lead">
            Al enviarla recibirás un resumen por WhatsApp. La fecha se reserva
            únicamente cuando Lucátta verifica el anticipo.
          </p>
          <dl className="order-review">
            <div>
              <dt>Pedido</dt>
              <dd>
                {pedido.producto || pedido.categoria}
                {pedido.tipo ? ` · ${pedido.tipo}` : ''}
              </dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>
                {pedido.fecha} · {pedido.hora}
              </dd>
            </div>
            <div>
              <dt>Entrega</dt>
              <dd>
                {pedido.modalidad === 'RECOGIDA'
                  ? 'Recoger en local'
                  : `A domicilio · ${pedido.zona}`}
              </dd>
            </div>
            <div>
              <dt>Tamaño</dt>
              <dd>{pedido.porciones || `${pedido.cantidad} pieza(s)`}</dd>
            </div>
            <div>
              <dt>Pan y relleno</dt>
              <dd>
                {pedido.sabor} · {pedido.relleno}
              </dd>
            </div>
            <div>
              <dt>Colores</dt>
              <dd>{pedido.colores.join(', ')}</dd>
            </div>
            <div>
              <dt>Diseño</dt>
              <dd>{pedido.diseno}</dd>
            </div>
            <div>
              <dt>Referencia</dt>
              <dd>{reference ? reference.name : 'Sin imagen'}</dd>
            </div>
            <div>
              <dt>Contacto</dt>
              <dd>
                {pedido.nombre} · {pedido.whatsapp}
              </dd>
            </div>
          </dl>
        </fieldset>
      )}

      {error && (
        <p className="order-error" role="alert">
          {error}
        </p>
      )}
      <div className="order-form-actions">
        {step > 0 && (
          <button
            className="button button-outline"
            type="button"
            onClick={() => {
              setStep((current) => current - 1);
              setError('');
            }}
          >
            <ArrowLeft /> Anterior
          </button>
        )}
        {step < steps.length - 1 ? (
          <button className="button" type="button" onClick={next}>
            Continuar <ArrowRight />
          </button>
        ) : (
          <button className="button" type="submit" disabled={sending}>
            {sending ? (
              <>
                <LoaderCircle className="order-spinner" /> Enviando
              </>
            ) : (
              <>
                Enviar solicitud <ArrowRight />
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
}
