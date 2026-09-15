'use client';

import Link from 'next/link';
import { SubmitEvent, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from 'lucide-react';

type Pedido = {
  categoria: 'PASTEL' | 'POSTRE' | 'EVENTO';
  ocasion: string;
  fecha: string;
  hora: string;
  porciones: string;
  producto: string;
  cantidad: string;
  sabor: string;
  relleno: string;
  presentacion: string;
  diseno: string;
  colores: string;
  textoPastel: string;
  tieneReferencia: boolean;
  modalidad: 'RECOGIDA' | 'DOMICILIO';
  direccion: string;
  zona: string;
  recibe: string;
  referencias: string;
  nombre: string;
  whatsapp: string;
  observaciones: string;
  aceptaAviso: boolean;
};

const initialPedido: Pedido = {
  categoria: 'PASTEL', ocasion: '', fecha: '', hora: '', porciones: '', producto: '', cantidad: '1',
  sabor: '', relleno: '', presentacion: '', diseno: '', colores: '', textoPastel: '',
  tieneReferencia: false, modalidad: 'RECOGIDA', direccion: '', zona: '', recibe: '',
  referencias: '', nombre: '', whatsapp: '', observaciones: '', aceptaAviso: false,
};

const stepLabels = ['Tu celebración', 'Los detalles', 'Entrega', 'Confirmación'];

export function PedidoForm() {
  const [step, setStep] = useState(0);
  const [pedido, setPedido] = useState<Pedido>(initialPedido);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const today = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }, []);

  const setField = <K extends keyof Pedido>(key: K, value: Pedido[K]) => {
    setPedido((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const validateStep = () => {
    if (step === 0 && (!pedido.ocasion.trim() || !pedido.fecha || !pedido.hora)) {
      return 'Cuéntanos la ocasión y elige la fecha y la hora.';
    }
    if (step === 1) {
      if (!pedido.sabor.trim() || !pedido.diseno.trim()) return 'Agrega el sabor y describe la idea que tienes en mente.';
      if (pedido.categoria === 'PASTEL' && !pedido.porciones.trim()) return 'Indica para cuántas personas será el pastel.';
      if (pedido.categoria !== 'PASTEL' && !pedido.producto.trim()) return 'Indica qué producto o servicio necesitas.';
    }
    if (step === 2 && pedido.modalidad === 'DOMICILIO' && (!pedido.direccion.trim() || !pedido.zona.trim())) {
      return 'Agrega la dirección y la zona para revisar la cobertura.';
    }
    if (step === 3) {
      if (!pedido.nombre.trim() || pedido.whatsapp.replace(/\D/g, '').length !== 10) return 'Escribe tu nombre y un número de WhatsApp de 10 dígitos.';
      if (!pedido.aceptaAviso) return 'Confirma que leíste el aviso de privacidad.';
    }
    return '';
  };

  const next = () => {
    const message = validateStep();
    if (message) return setError(message);
    setStep((current) => Math.min(current + 1, stepLabels.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = validateStep();
    if (message) return setError(message);
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || 'No pudimos guardar tu solicitud.');
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar tu solicitud.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <output className="order-success">
        <span><Check aria-hidden="true" /></span>
        <p className="eyebrow">Borrador recibido</p>
        <h2>Tu resumen ya va camino a WhatsApp.</h2>
        <p>Regresa a la conversación con Luca para revisarlo y confirmar que todo esté correcto.</p>
        <p className="order-form-note">Esto todavía no reserva la fecha ni genera un cobro.</p>
      </output>
    );
  }

  return (
    <form className="order-form" onSubmit={submit} noValidate>
      <div className="order-progress" aria-label={`Paso ${step + 1} de ${stepLabels.length}`}>
        <p>Paso {step + 1} de {stepLabels.length}</p>
        <div><span style={{ width: `${((step + 1) / stepLabels.length) * 100}%` }} /></div>
        <strong>{stepLabels[step]}</strong>
      </div>

      {step === 0 && (
        <fieldset>
          <legend>¿Qué tienes en mente?</legend>
          <p className="order-form-lead">Empecemos por la celebración. Los detalles pueden ajustarse después con Lucátta.</p>
          <div className="order-choice-grid">
            {([
              ['PASTEL', '🎂', 'Pastel personalizado'],
              ['POSTRE', '🧁', 'Postres'],
              ['EVENTO', '✨', 'Evento o mesa dulce'],
            ] as const).map(([value, icon, label]) => (
              <button className={pedido.categoria === value ? 'order-choice selected' : 'order-choice'} type="button" onClick={() => setField('categoria', value)} key={value}>
                <span>{icon}</span><strong>{label}</strong>
              </button>
            ))}
          </div>
          <label>¿Qué celebraremos?<input value={pedido.ocasion} onChange={(event) => setField('ocasion', event.target.value)} placeholder="Por ejemplo: cumpleaños de Ana" /></label>
          <div className="order-two-columns">
            <label>Fecha<input type="date" min={today} value={pedido.fecha} onChange={(event) => setField('fecha', event.target.value)} /></label>
            <label>Hora<input type="time" value={pedido.hora} onChange={(event) => setField('hora', event.target.value)} /></label>
          </div>
          <p className="order-form-note">Recomendamos pedir con 3 días de anticipación. Los pedidos urgentes requieren revisión humana.</p>
        </fieldset>
      )}

      {step === 1 && (
        <fieldset>
          <legend>Demos forma a tu idea</legend>
          <p className="order-form-lead">No tiene que quedar perfecto: cuéntanos lo que imaginas y nosotros te ayudamos a aterrizarlo.</p>
          {pedido.categoria === 'PASTEL' ? (
            <>
              <label>¿Para cuántas personas?<input value={pedido.porciones} onChange={(event) => setField('porciones', event.target.value)} placeholder="Por ejemplo: 20 personas" /></label>
              <div className="order-two-columns">
                <label>Sabor del pan<input value={pedido.sabor} onChange={(event) => setField('sabor', event.target.value)} placeholder="El que tienes en mente" /></label>
                <label>Relleno<input value={pedido.relleno} onChange={(event) => setField('relleno', event.target.value)} placeholder="Puede quedar por definir" /></label>
              </div>
            </>
          ) : (
            <>
              <div className="order-two-columns">
                <label>Producto o servicio<input value={pedido.producto} onChange={(event) => setField('producto', event.target.value)} placeholder={pedido.categoria === 'EVENTO' ? 'Mesa de postres, coffee break…' : 'Cupcakes, fresas, galletas…'} /></label>
                <label>Cantidad aproximada<input type="number" min="1" value={pedido.cantidad} onChange={(event) => setField('cantidad', event.target.value)} /></label>
              </div>
              <div className="order-two-columns">
                <label>Sabor<input value={pedido.sabor} onChange={(event) => setField('sabor', event.target.value)} placeholder="Sabores que te gustaría incluir" /></label>
                <label>Presentación<input value={pedido.presentacion} onChange={(event) => setField('presentacion', event.target.value)} placeholder="Individual, charola, mesa…" /></label>
              </div>
            </>
          )}
          <label>Describe el estilo, tema o decoración<textarea rows={5} value={pedido.diseno} onChange={(event) => setField('diseno', event.target.value)} placeholder="Colores, temática, flores, personajes, acabado…" /></label>
          {pedido.categoria === 'PASTEL' && <div className="order-two-columns"><label>Colores<input value={pedido.colores} onChange={(event) => setField('colores', event.target.value)} /></label><label>Texto del pastel<input value={pedido.textoPastel} onChange={(event) => setField('textoPastel', event.target.value)} placeholder="Opcional" /></label></div>}
          <label className="order-check"><input type="checkbox" checked={pedido.tieneReferencia} onChange={(event) => setField('tieneReferencia', event.target.checked)} /><span>Tengo una imagen de referencia y la enviaré por WhatsApp.</span></label>
          <p className="order-form-note">La imagen es opcional. Lucátta puede solicitarla después si el diseño la necesita.</p>
        </fieldset>
      )}

      {step === 2 && (
        <fieldset>
          <legend>¿Cómo lo recibirás?</legend>
          <div className="order-choice-grid two">
            <button className={pedido.modalidad === 'RECOGIDA' ? 'order-choice selected' : 'order-choice'} type="button" onClick={() => setField('modalidad', 'RECOGIDA')}><span>🏡</span><strong>Recoger en el local</strong></button>
            <button className={pedido.modalidad === 'DOMICILIO' ? 'order-choice selected' : 'order-choice'} type="button" onClick={() => setField('modalidad', 'DOMICILIO')}><span>🚗</span><strong>Entrega a domicilio</strong></button>
          </div>
          {pedido.modalidad === 'RECOGIDA' ? (
            <div className="order-pickup-card"><strong>Lucátta · Casa Blanca</strong><p>Nacional 54, San Juan, 72990 Casa Blanca, Puebla.</p></div>
          ) : (
            <>
              <label>Dirección completa<input value={pedido.direccion} onChange={(event) => setField('direccion', event.target.value)} /></label>
              <div className="order-two-columns"><label>Colonia o código postal<input value={pedido.zona} onChange={(event) => setField('zona', event.target.value)} /></label><label>¿Quién recibe?<input value={pedido.recibe} onChange={(event) => setField('recibe', event.target.value)} /></label></div>
              <label>Referencias para llegar<textarea rows={3} value={pedido.referencias} onChange={(event) => setField('referencias', event.target.value)} /></label>
              <p className="order-form-note">La cobertura y el costo de entrega se revisan personalmente y aparecerán en tu cotización.</p>
            </>
          )}
        </fieldset>
      )}

      {step === 3 && (
        <fieldset>
          <legend>¿A dónde enviamos tu resumen?</legend>
          <p className="order-form-lead">Usa el mismo número desde el que comenzaste la conversación con Luca.</p>
          <div className="order-two-columns"><label>Tu nombre<input value={pedido.nombre} onChange={(event) => setField('nombre', event.target.value)} autoComplete="name" /></label><label>WhatsApp a 10 dígitos<input inputMode="numeric" value={pedido.whatsapp} onChange={(event) => setField('whatsapp', event.target.value)} placeholder="222 123 4567" /></label></div>
          <label>Algo más que quieras contarnos<textarea rows={4} value={pedido.observaciones} onChange={(event) => setField('observaciones', event.target.value)} placeholder="Opcional" /></label>
          <div className="order-sensitive-note"><strong>¿Existe una alergia o necesidad de salud?</strong><p>No la escribas aquí. Al volver a WhatsApp, elige hablar con una persona para revisar tu caso.</p></div>
          <label className="order-check"><input type="checkbox" checked={pedido.aceptaAviso} onChange={(event) => setField('aceptaAviso', event.target.checked)} /><span>Leí el <Link href="/privacidad" target="_blank">aviso de privacidad</Link> y autorizo el uso de estos datos para atender mi solicitud.</span></label>
        </fieldset>
      )}

      {error && <p className="order-error" role="alert">{error}</p>}
      <div className="order-form-actions">
        {step > 0 && <button className="button button-outline" type="button" onClick={() => setStep((current) => current - 1)}><ArrowLeft aria-hidden="true" /> Anterior</button>}
        {step < stepLabels.length - 1 ? <button className="button" type="button" onClick={next}>Continuar <ArrowRight aria-hidden="true" /></button> : <button className="button" type="submit" disabled={sending}>{sending ? <><LoaderCircle className="order-spinner" aria-hidden="true" /> Enviando</> : <>Enviar a WhatsApp <ArrowRight aria-hidden="true" /></>}</button>}
      </div>
    </form>
  );
}
