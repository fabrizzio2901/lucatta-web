'use client';

import Image from 'next/image';
import {
  ChangeEvent,
  SubmitEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  Eye,
  ImagePlus,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  Settings2,
  Store,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type {
  BusinessSettings,
  CatalogKind,
  CatalogOption,
  Closure,
  OrderRecord,
  PaymentReceipt,
} from '@/lib/lucatta-types';

type Tab = 'orders' | 'agenda' | 'clients' | 'catalog' | 'settings';
type JsonResult<T = unknown> = { ok?: boolean; error?: string } & T;

const kindLabels: Record<CatalogKind, string> = {
  PRODUCT: 'Productos',
  PRODUCT_TYPE: 'Tipos de producto',
  PORTION: 'Porciones',
  BREAD_FLAVOR: 'Sabores de pan',
  FILLING: 'Rellenos',
  COLOR: 'Colores',
  TIME_SLOT: 'Horarios seleccionables',
  PRESENTATION: 'Presentaciones',
};

const kinds = Object.keys(kindLabels) as CatalogKind[];
const statusLabels: Record<string, string> = {
  NUEVA_SOLICITUD: 'Nueva solicitud',
  EN_REVISION: 'En revisión',
  COTIZADA: 'Cotizada',
  RESERVA_PENDIENTE: 'Reserva pendiente',
  ANTICIPO_EN_REVISION: 'Anticipo en revisión',
  CONFIRMADA: 'Confirmada',
  EN_PRODUCCION: 'En producción',
  LISTA: 'Lista',
  ENTREGADA: 'Entregada',
  CANCELADA: 'Cancelada',
};

const detailLabels: Record<string, string> = {
  producto: 'Producto',
  tipo: 'Tipo',
  ocasion: 'Ocasión',
  porciones: 'Porciones',
  cantidad: 'Cantidad',
  sabor: 'Sabor del pan',
  relleno: 'Relleno',
  presentacion: 'Presentación',
  colores: 'Colores',
  diseno: 'Diseño',
  textoPastel: 'Texto',
  alergias: 'Alergias',
  detalleAlergias: 'Detalle de alergias',
  direccion: 'Dirección',
  zona: 'Zona',
  recibe: 'Recibe',
  referencias: 'Referencias',
  observaciones: 'Observaciones',
};

function readableValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(readableValue).join(', ');
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  )
    return `${value}`;
  if (value && typeof value === 'object') return JSON.stringify(value);
  return '';
}

function readableDetails(details: Record<string, unknown>) {
  return Object.entries(details)
    .filter(([key, value]) => {
      if (['nombre', 'whatsapp', 'aceptaAviso'].includes(key)) return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined;
    })
    .map(([key, value]) => ({
      label: detailLabels[key] || key.replaceAll('_', ' '),
      value: readableValue(value),
    }));
}

const emptyOption: Omit<CatalogOption, 'id'> = {
  kind: 'PRODUCT',
  name: '',
  slug: '',
  description: '',
  image_url: '',
  color_hex: '#E5A6B6',
  sort_order: 10,
  active: true,
  metadata: {},
};

const emptyClosure: Omit<Closure, 'id'> = {
  starts_on: '',
  ends_on: '',
  resumes_on: '',
  kind: 'VACACIONES',
  message:
    'Estaremos de vacaciones. Podemos recibir solicitudes para fechas posteriores a nuestro regreso.',
};

async function api<T>(url: string, init?: RequestInit): Promise<JsonResult<T>> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  const response = await fetch(url, {
    ...init,
    headers,
  });
  const data = (await response.json().catch(() => ({}))) as JsonResult<T>;
  if (!response.ok || !data.ok)
    throw new Error(data.error || 'Ocurrió un error inesperado.');
  return data;
}

export function AdminPanel() {
  const [auth, setAuth] = useState<'checking' | 'guest' | 'ready'>('checking');
  const [email, setEmail] = useState('lucatta.bakery@gmail.com');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [tab, setTab] = useState<Tab>('orders');
  const [catalog, setCatalog] = useState<CatalogOption[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [kind, setKind] = useState<CatalogKind>('PRODUCT');
  const [editing, setEditing] = useState<CatalogOption | null>(null);
  const [draft, setDraft] = useState<Omit<CatalogOption, 'id'>>(emptyOption);
  const [image, setImage] = useState<File | null>(null);
  const [closureDraft, setClosureDraft] = useState(emptyClosure);
  const [receiptReasons, setReceiptReasons] = useState<Record<string, string>>(
    {},
  );
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAll = useCallback(async () => {
    const [catalogData, ordersData, settingsData, closuresData] =
      await Promise.all([
        api<{ items: CatalogOption[] }>('/api/admin/catalog'),
        api<{ items: OrderRecord[] }>('/api/admin/orders'),
        api<{ settings: BusinessSettings }>('/api/admin/settings'),
        api<{ items: Closure[] }>('/api/admin/closures'),
      ]);
    setCatalog(catalogData.items);
    setOrders(ordersData.items);
    setSettings(settingsData.settings);
    setClosures(closuresData.items);
  }, []);

  useEffect(() => {
    api<{ email: string }>('/api/admin/auth/session')
      .then(async () => {
        setAuth('ready');
        await loadAll();
      })
      .catch(() => setAuth('guest'));
  }, [loadAll]);

  const feedback = (message: string) => {
    setNotice(message);
    setError('');
    window.setTimeout(() => setNotice(''), 3500);
  };

  const sendCode = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy('auth');
    setError('');
    try {
      await api('/api/admin/auth/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setCodeSent(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No fue posible enviar el código.',
      );
    } finally {
      setBusy('');
    }
  };

  const verifyCode = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy('auth');
    setError('');
    try {
      await api('/api/admin/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      setAuth('ready');
      await loadAll();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No fue posible entrar.',
      );
    } finally {
      setBusy('');
    }
  };

  const logout = async () => {
    await api('/api/admin/auth/logout', { method: 'POST' }).catch(
      () => undefined,
    );
    setAuth('guest');
  };

  const beginCreate = () => {
    setEditing(null);
    setDraft({
      ...emptyOption,
      kind,
      sort_order:
        (catalog.filter((item) => item.kind === kind).length + 1) * 10,
    });
    setImage(null);
  };

  const beginEdit = (item: CatalogOption) => {
    setEditing(item);
    setDraft({
      kind: item.kind,
      name: item.name,
      slug: item.slug,
      description: item.description,
      image_url: item.image_url,
      color_hex: item.color_hex || '#E5A6B6',
      sort_order: item.sort_order,
      active: item.active,
      metadata: item.metadata || {},
    });
    setImage(null);
  };

  const saveOption = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy('catalog');
    setError('');
    try {
      let imageUrl = draft.image_url;
      if (image) {
        const formData = new FormData();
        formData.append('file', image);
        const uploaded = await api<{ url: string }>(
          '/api/admin/catalog/image',
          { method: 'POST', body: formData },
        );
        imageUrl = uploaded.url;
      }
      const url = editing
        ? `/api/admin/catalog/${editing.id}`
        : '/api/admin/catalog';
      const data = await api<{ item: CatalogOption }>(url, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...draft, image_url: imageUrl }),
      });
      setCatalog((current) =>
        editing
          ? current.map((item) => (item.id === data.item.id ? data.item : item))
          : [...current, data.item],
      );
      setEditing(null);
      setDraft({ ...emptyOption, kind });
      setImage(null);
      feedback(editing ? 'Cambio guardado.' : 'Elemento agregado.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No fue posible guardar.',
      );
    } finally {
      setBusy('');
    }
  };

  const toggleOption = async (item: CatalogOption) => {
    setBusy(item.id);
    try {
      const data = await api<{ item: CatalogOption }>(
        `/api/admin/catalog/${item.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ ...item, active: !item.active }),
        },
      );
      setCatalog((current) =>
        current.map((entry) => (entry.id === item.id ? data.item : entry)),
      );
      feedback(
        data.item.active
          ? 'Elemento visible para clientes.'
          : 'Elemento oculto para clientes.',
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No fue posible cambiar la visibilidad.',
      );
    } finally {
      setBusy('');
    }
  };

  const removeOption = async (item: CatalogOption) => {
    if (
      !window.confirm(
        `¿Eliminar “${item.name}”? Los pedidos anteriores conservarán su información.`,
      )
    )
      return;
    setBusy(item.id);
    try {
      await api(`/api/admin/catalog/${item.id}`, { method: 'DELETE' });
      setCatalog((current) => current.filter((entry) => entry.id !== item.id));
      if (editing?.id === item.id) beginCreate();
      feedback('Elemento eliminado.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No fue posible eliminar.',
      );
    } finally {
      setBusy('');
    }
  };

  const saveSettings = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) return;
    setBusy('settings');
    try {
      const data = await api<{ settings: BusinessSettings }>(
        '/api/admin/settings',
        {
          method: 'PATCH',
          body: JSON.stringify(settings),
        },
      );
      setSettings(data.settings);
      feedback('Horarios y reglas guardados.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No fue posible guardar.',
      );
    } finally {
      setBusy('');
    }
  };

  const addClosure = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy('closure');
    try {
      const data = await api<{ item: Closure }>('/api/admin/closures', {
        method: 'POST',
        body: JSON.stringify(closureDraft),
      });
      setClosures((current) => [data.item, ...current]);
      setClosureDraft(emptyClosure);
      feedback('Cierre agregado.');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No fue posible agregar el cierre.',
      );
    } finally {
      setBusy('');
    }
  };

  const removeClosure = async (item: Closure) => {
    if (!window.confirm('¿Eliminar este cierre del calendario?')) return;
    setBusy(item.id);
    try {
      await api(`/api/admin/closures/${item.id}`, { method: 'DELETE' });
      setClosures((current) => current.filter((entry) => entry.id !== item.id));
      feedback('Cierre eliminado.');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No fue posible eliminar el cierre.',
      );
    } finally {
      setBusy('');
    }
  };

  const saveOrder = async (order: OrderRecord) => {
    setBusy(order.id);
    try {
      const data = await api<{ item: OrderRecord }>(
        `/api/admin/orders/${order.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: order.status,
            quote_total: order.quote_total,
            quote_notes: order.quote_notes,
            deposit_amount: order.deposit_amount,
            payment_status: order.payment_status,
          }),
        },
      );
      setOrders((current) =>
        current.map((entry) => (entry.id === order.id ? data.item : entry)),
      );
      feedback(`Pedido ${order.public_code} actualizado.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No fue posible guardar el pedido.',
      );
    } finally {
      setBusy('');
    }
  };

  const reviewReceipt = async (
    order: OrderRecord,
    receipt: PaymentReceipt,
    action: 'APPROVE' | 'REJECT',
  ) => {
    setBusy(receipt.id);
    setError('');
    try {
      const data = await api<{
        item: OrderRecord;
        receipt: PaymentReceipt | null;
      }>(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          receipt_action: action,
          receipt_id: receipt.id,
          deposit_amount: order.deposit_amount,
          receipt_rejection_reason: receiptReasons[receipt.id] || '',
        }),
      });
      setOrders((current) =>
        current.map((entry) => {
          if (entry.id !== order.id) return entry;
          return {
            ...entry,
            ...data.item,
            receipts: (entry.receipts || []).map((item) =>
              item.id === receipt.id && data.receipt
                ? { ...item, ...data.receipt }
                : item,
            ),
          };
        }),
      );
      feedback(
        action === 'APPROVE'
          ? `Anticipo aprobado. ${order.public_code} quedó confirmado.`
          : 'Comprobante rechazado y cliente notificado.',
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No fue posible revisar el comprobante.',
      );
    } finally {
      setBusy('');
    }
  };

  const visibleCatalog = useMemo(
    () =>
      catalog
        .filter((item) => item.kind === kind)
        .sort((a, b) => a.sort_order - b.sort_order),
    [catalog, kind],
  );

  const agenda = useMemo(() => {
    const grouped = new Map<string, OrderRecord[]>();
    orders
      .filter((order) => order.status !== 'CANCELADA')
      .forEach((order) => {
        grouped.set(order.requested_date, [
          ...(grouped.get(order.requested_date) || []),
          order,
        ]);
      });
    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, entries]) => ({
        date,
        entries: entries.sort((left, right) =>
          left.requested_time.localeCompare(right.requested_time),
        ),
      }));
  }, [orders]);

  const clients = useMemo(() => {
    const grouped = new Map<
      string,
      {
        whatsapp: string;
        name: string;
        orders: OrderRecord[];
        lastActivity: string;
      }
    >();
    orders.forEach((order) => {
      const current = grouped.get(order.whatsapp);
      grouped.set(order.whatsapp, {
        whatsapp: order.whatsapp,
        name: order.customer_name,
        orders: [...(current?.orders || []), order],
        lastActivity:
          !current || order.updated_at > current.lastActivity
            ? order.updated_at
            : current.lastActivity,
      });
    });
    return [...grouped.values()].sort((left, right) =>
      right.lastActivity.localeCompare(left.lastActivity),
    );
  }, [orders]);

  if (auth === 'checking') {
    return (
      <main className="admin-loading">
        <LoaderCircle className="order-spinner" aria-hidden="true" /> Preparando
        el panel…
      </main>
    );
  }

  if (auth === 'guest') {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <div className="admin-brand">
            <span>LU</span>
            <div>
              <strong>Lucátta</strong>
              <small>Panel del propietario</small>
            </div>
          </div>
          <p className="eyebrow">Acceso privado</p>
          <h1>Todo tu catálogo en un solo lugar.</h1>
          <p>
            Recibirás un código de un solo uso en el correo autorizado. No
            necesitas recordar otra contraseña.
          </p>
          <form onSubmit={codeSent ? verifyCode : sendCode}>
            <label>
              Correo del propietario
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={codeSent}
                autoComplete="email"
              />
            </label>
            {codeSent && (
              <label>
                Código recibido
                <input
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 8))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                />
              </label>
            )}
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            <button className="button" type="submit" disabled={busy === 'auth'}>
              {busy === 'auth' ? (
                <LoaderCircle className="order-spinner" />
              ) : codeSent ? (
                'Entrar al panel'
              ) : (
                'Enviar código'
              )}
            </button>
            {codeSent && (
              <button
                className="admin-text-button"
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode('');
                }}
              >
                Usar otro correo
              </button>
            )}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span>LU</span>
          <div>
            <strong>Lucátta</strong>
            <small>Administración</small>
          </div>
        </div>
        <nav>
          <button
            className={tab === 'orders' ? 'active' : ''}
            onClick={() => setTab('orders')}
          >
            <ClipboardList /> Pedidos{' '}
            <b>
              {orders.filter((order) => order.status === 'NUEVA_SOLICITUD')
                .length || ''}
            </b>
          </button>
          <button
            className={tab === 'agenda' ? 'active' : ''}
            onClick={() => setTab('agenda')}
          >
            <CalendarDays /> Agenda
          </button>
          <button
            className={tab === 'clients' ? 'active' : ''}
            onClick={() => setTab('clients')}
          >
            <Users /> Clientes
          </button>
          <button
            className={tab === 'catalog' ? 'active' : ''}
            onClick={() => setTab('catalog')}
          >
            <PackagePlus /> Catálogo
          </button>
          <button
            className={tab === 'settings' ? 'active' : ''}
            onClick={() => setTab('settings')}
          >
            <Settings2 /> Horarios y cierres
          </button>
        </nav>
        <button className="admin-logout" onClick={logout}>
          <LogOut /> Cerrar sesión
        </button>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Control de Lucátta</p>
            <h1>
              {tab === 'orders'
                ? 'Pedidos'
                : tab === 'agenda'
                  ? 'Agenda de entregas'
                  : tab === 'clients'
                    ? 'Clientes'
                    : tab === 'catalog'
                      ? 'Catálogo'
                      : 'Horarios y disponibilidad'}
            </h1>
          </div>
          <a href="/" target="_blank" rel="noreferrer">
            <Store /> Ver sitio
          </a>
        </header>
        {notice && (
          <div className="admin-notice">
            <CheckCircle2 /> {notice}
          </div>
        )}
        {error && (
          <div className="admin-error banner">
            <X />
            <span>{error}</span>
            <button onClick={() => setError('')}>Cerrar</button>
          </div>
        )}

        {tab === 'orders' && (
          <section className="admin-section">
            <div className="admin-stats">
              <article>
                <ClipboardList />
                <span>
                  <strong>{orders.length}</strong> solicitudes
                </span>
              </article>
              <article>
                <Clock3 />
                <span>
                  <strong>
                    {
                      orders.filter((item) =>
                        ['NUEVA_SOLICITUD', 'EN_REVISION'].includes(
                          item.status,
                        ),
                      ).length
                    }
                  </strong>{' '}
                  por revisar
                </span>
              </article>
              <article>
                <CheckCircle2 />
                <span>
                  <strong>
                    {
                      orders.filter((item) => item.status === 'CONFIRMADA')
                        .length
                    }
                  </strong>{' '}
                  confirmadas
                </span>
              </article>
            </div>
            {!orders.length ? (
              <div className="admin-empty">
                <ClipboardList />
                <h2>Aún no hay solicitudes</h2>
                <p>Los pedidos enviados desde la web aparecerán aquí.</p>
              </div>
            ) : (
              <div className="admin-order-list">
                {orders.map((order) => (
                  <article className="admin-order-card" key={order.id}>
                    <header>
                      <div>
                        <span
                          className={`status-dot ${order.status.toLowerCase()}`}
                        />{' '}
                        <strong>{order.public_code}</strong>
                        <small>
                          {new Date(order.created_at).toLocaleString('es-MX')}
                        </small>
                      </div>
                      <span className="admin-pill">
                        {statusLabels[order.status] || order.status}
                      </span>
                    </header>
                    <div className="admin-order-summary">
                      <p>
                        <b>{order.customer_name}</b>
                        <br />
                        {order.whatsapp}
                      </p>
                      <p>
                        <b>{order.category}</b>
                        <br />
                        {order.requested_date} · {order.requested_time}
                      </p>
                      <p>
                        <b>
                          {order.fulfillment === 'RECOGIDA'
                            ? 'Recoge'
                            : 'A domicilio'}
                        </b>
                        <br />
                        {typeof order.details.ocasion === 'string'
                          ? order.details.ocasion
                          : 'Sin ocasión indicada'}
                      </p>
                    </div>
                    <details>
                      <summary>Ver todos los detalles</summary>
                      {order.reference_image_url && (
                        <a
                          className="admin-reference-link"
                          href={order.reference_image_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver imagen de referencia
                        </a>
                      )}
                      <dl className="admin-detail-grid">
                        {readableDetails(order.details).map((detail) => (
                          <div key={detail.label}>
                            <dt>{detail.label}</dt>
                            <dd>{detail.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                    {!!order.receipts?.length && (
                      <section className="admin-receipts">
                        <header>
                          <CreditCard />
                          <div>
                            <strong>Comprobantes de anticipo</strong>
                            <small>
                              Revisa la imagen, captura el importe y aprueba o
                              rechaza.
                            </small>
                          </div>
                        </header>
                        {order.receipts.map((receipt) => (
                          <article key={receipt.id}>
                            <div>
                              <span
                                className={`receipt-status ${receipt.status.toLowerCase()}`}
                              >
                                {receipt.status === 'PENDING'
                                  ? 'Pendiente'
                                  : receipt.status === 'APPROVED'
                                    ? 'Aprobado'
                                    : 'Rechazado'}
                              </span>
                              <small>
                                {new Date(receipt.received_at).toLocaleString(
                                  'es-MX',
                                )}
                              </small>
                            </div>
                            {receipt.signed_url && (
                              <a
                                className="button small button-outline"
                                href={receipt.signed_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Eye /> Ver comprobante
                              </a>
                            )}
                            {receipt.status === 'PENDING' && (
                              <div className="admin-receipt-review">
                                <label>
                                  Importe recibido
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={order.deposit_amount ?? ''}
                                    onChange={(event) =>
                                      setOrders((current) =>
                                        current.map((item) =>
                                          item.id === order.id
                                            ? {
                                                ...item,
                                                deposit_amount: event.target
                                                  .value
                                                  ? Number(event.target.value)
                                                  : null,
                                              }
                                            : item,
                                        ),
                                      )
                                    }
                                    placeholder="$0.00"
                                  />
                                </label>
                                <button
                                  className="button small"
                                  type="button"
                                  disabled={busy === receipt.id}
                                  onClick={() =>
                                    reviewReceipt(order, receipt, 'APPROVE')
                                  }
                                >
                                  <CheckCircle2 /> Aprobar y confirmar
                                </button>
                                <label className="wide">
                                  Motivo si se rechaza
                                  <input
                                    value={receiptReasons[receipt.id] || ''}
                                    onChange={(event) =>
                                      setReceiptReasons((current) => ({
                                        ...current,
                                        [receipt.id]: event.target.value,
                                      }))
                                    }
                                    placeholder="Ej. el importe o la referencia no son legibles"
                                  />
                                </label>
                                <button
                                  className="button small admin-danger-button"
                                  type="button"
                                  disabled={busy === receipt.id}
                                  onClick={() =>
                                    reviewReceipt(order, receipt, 'REJECT')
                                  }
                                >
                                  <X /> Rechazar
                                </button>
                              </div>
                            )}
                            {receipt.rejection_reason && (
                              <p>Motivo: {receipt.rejection_reason}</p>
                            )}
                          </article>
                        ))}
                      </section>
                    )}
                    <div className="admin-order-controls">
                      <label>
                        Estado
                        <select
                          value={order.status}
                          onChange={(event) =>
                            setOrders((current) =>
                              current.map((item) =>
                                item.id === order.id
                                  ? { ...item, status: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        >
                          {Object.entries(statusLabels).map(
                            ([value, label]) => (
                              <option value={value} key={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <label>
                        Total cotizado
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={order.quote_total ?? ''}
                          onChange={(event) =>
                            setOrders((current) =>
                              current.map((item) =>
                                item.id === order.id
                                  ? {
                                      ...item,
                                      quote_total: event.target.value
                                        ? Number(event.target.value)
                                        : null,
                                    }
                                  : item,
                              ),
                            )
                          }
                          placeholder="$0.00"
                        />
                      </label>
                      <label>
                        Anticipo
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={order.deposit_amount ?? ''}
                          onChange={(event) =>
                            setOrders((current) =>
                              current.map((item) =>
                                item.id === order.id
                                  ? {
                                      ...item,
                                      deposit_amount: event.target.value
                                        ? Number(event.target.value)
                                        : null,
                                    }
                                  : item,
                              ),
                            )
                          }
                          placeholder="$0.00"
                        />
                      </label>
                      <label>
                        Estado del pago
                        <select
                          value={order.payment_status || 'SIN_ANTICIPO'}
                          onChange={(event) =>
                            setOrders((current) =>
                              current.map((item) =>
                                item.id === order.id
                                  ? {
                                      ...item,
                                      payment_status: event.target.value,
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="SIN_ANTICIPO">Sin anticipo</option>
                          <option value="EN_REVISION">En revisión</option>
                          <option value="ANTICIPO_VERIFICADO">
                            Anticipo verificado
                          </option>
                          <option value="COMPROBANTE_RECHAZADO">
                            Comprobante rechazado
                          </option>
                          <option value="PAGADO">Pagado</option>
                        </select>
                      </label>
                      <label className="wide">
                        Notas de cotización
                        <input
                          value={order.quote_notes || ''}
                          onChange={(event) =>
                            setOrders((current) =>
                              current.map((item) =>
                                item.id === order.id
                                  ? { ...item, quote_notes: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          placeholder="Incluye decoración, entrega…"
                        />
                      </label>
                      <button
                        className="button small"
                        onClick={() => saveOrder(order)}
                        disabled={busy === order.id}
                      >
                        {busy === order.id ? (
                          <LoaderCircle className="order-spinner" />
                        ) : (
                          <Save />
                        )}{' '}
                        Guardar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'agenda' && (
          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <p className="eyebrow">Carga por fecha</p>
                <h2>Próximas entregas</h2>
                <p>
                  No existe un límite automático: el propietario decide cuándo
                  dejar de recibir pedidos.
                </p>
              </div>
            </div>
            {!agenda.length ? (
              <div className="admin-empty">
                <CalendarDays />
                <h2>No hay entregas programadas</h2>
              </div>
            ) : (
              <div className="admin-agenda-list">
                {agenda.map((day) => (
                  <article className="admin-agenda-day" key={day.date}>
                    <header>
                      <div>
                        <CalendarDays />
                        <span>
                          <strong>
                            {new Date(
                              `${day.date}T12:00:00`,
                            ).toLocaleDateString('es-MX', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </strong>
                          <small>{day.entries.length} pedido(s)</small>
                        </span>
                      </div>
                      <button
                        className="admin-text-button"
                        onClick={() => setTab('orders')}
                      >
                        Administrar pedidos
                      </button>
                    </header>
                    <div>
                      {day.entries.map((order) => (
                        <button
                          className="admin-agenda-order"
                          key={order.id}
                          onClick={() => setTab('orders')}
                        >
                          <time>
                            {String(order.requested_time).slice(0, 5)}
                          </time>
                          <span>
                            <strong>{order.customer_name}</strong>
                            <small>
                              {order.public_code} ·{' '}
                              {typeof order.details.producto === 'string'
                                ? order.details.producto
                                : order.category}
                            </small>
                          </span>
                          <em>{statusLabels[order.status] || order.status}</em>
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'clients' && (
          <section className="admin-section">
            <div className="admin-stats">
              <article>
                <Users />
                <span>
                  <strong>{clients.length}</strong> clientes
                </span>
              </article>
              <article>
                <ClipboardList />
                <span>
                  <strong>{orders.length}</strong> pedidos registrados
                </span>
              </article>
              <article>
                <CheckCircle2 />
                <span>
                  <strong>
                    {
                      clients.filter((client) =>
                        client.orders.some((order) =>
                          ['CONFIRMADA', 'EN_PRODUCCION', 'LISTA'].includes(
                            order.status,
                          ),
                        ),
                      ).length
                    }
                  </strong>{' '}
                  con pedidos activos
                </span>
              </article>
            </div>
            {!clients.length ? (
              <div className="admin-empty">
                <Users />
                <h2>Aún no hay clientes</h2>
              </div>
            ) : (
              <div className="admin-client-grid">
                {clients.map((client) => {
                  const active = client.orders.filter(
                    (order) =>
                      !['ENTREGADA', 'CANCELADA'].includes(order.status),
                  ).length;
                  const latest = [...client.orders].sort((left, right) =>
                    right.created_at.localeCompare(left.created_at),
                  )[0];
                  return (
                    <article
                      className="admin-client-card"
                      key={client.whatsapp}
                    >
                      <header>
                        <span>{client.name.slice(0, 2).toUpperCase()}</span>
                        <div>
                          <strong>{client.name}</strong>
                          <a
                            href={`https://wa.me/52${client.whatsapp}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {client.whatsapp}
                          </a>
                        </div>
                      </header>
                      <dl>
                        <div>
                          <dt>Pedidos</dt>
                          <dd>{client.orders.length}</dd>
                        </div>
                        <div>
                          <dt>Activos</dt>
                          <dd>{active}</dd>
                        </div>
                        <div>
                          <dt>Último folio</dt>
                          <dd>{latest.public_code}</dd>
                        </div>
                      </dl>
                      <small>
                        Última actividad:{' '}
                        {new Date(client.lastActivity).toLocaleString('es-MX')}
                      </small>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'catalog' && (
          <section className="admin-catalog-layout">
            <div className="admin-kind-list">
              {kinds.map((entry) => (
                <button
                  className={kind === entry ? 'active' : ''}
                  key={entry}
                  onClick={() => {
                    setKind(entry);
                    setEditing(null);
                    setDraft({ ...emptyOption, kind: entry });
                  }}
                >
                  {kindLabels[entry]}
                  <span>
                    {catalog.filter((item) => item.kind === entry).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="admin-catalog-content">
              <div className="admin-section-heading">
                <div>
                  <p className="eyebrow">Configurable</p>
                  <h2>{kindLabels[kind]}</h2>
                  <p>
                    Lo que esté activo aparece automáticamente en el formulario
                    del cliente.
                  </p>
                </div>
                <button className="button small" onClick={beginCreate}>
                  <Plus /> Agregar
                </button>
              </div>
              <div className="admin-option-grid">
                {visibleCatalog.map((item) => (
                  <article
                    className={
                      !item.active
                        ? 'admin-option-card inactive'
                        : 'admin-option-card'
                    }
                    key={item.id}
                  >
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt=""
                        width={132}
                        height={132}
                        unoptimized
                      />
                    ) : item.color_hex ? (
                      <span
                        className="admin-color-preview"
                        style={{ background: item.color_hex }}
                      />
                    ) : (
                      <span className="admin-option-placeholder">
                        {item.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.description || 'Sin descripción'}</p>
                      <small>
                        Orden {item.sort_order} ·{' '}
                        {item.active ? 'Visible' : 'Oculto'}
                      </small>
                    </div>
                    <footer>
                      <button
                        onClick={() => toggleOption(item)}
                        disabled={busy === item.id}
                      >
                        {item.active ? 'Ocultar' : 'Mostrar'}
                      </button>
                      <button
                        onClick={() => beginEdit(item)}
                        aria-label={`Editar ${item.name}`}
                      >
                        <Pencil />
                      </button>
                      <button
                        className="danger"
                        onClick={() => removeOption(item)}
                        aria-label={`Eliminar ${item.name}`}
                      >
                        <Trash2 />
                      </button>
                    </footer>
                  </article>
                ))}
                {!visibleCatalog.length && (
                  <div className="admin-empty compact">
                    <PackagePlus />
                    <h3>Agrega la primera opción</h3>
                    <p>El cliente verá aquí las opciones que tú decidas.</p>
                  </div>
                )}
              </div>
            </div>
            <form className="admin-editor" onSubmit={saveOption}>
              <header>
                <div>
                  <small>{editing ? 'Editar' : 'Nueva opción'}</small>
                  <h2>{editing?.name || kindLabels[draft.kind]}</h2>
                </div>
                {editing && (
                  <button type="button" onClick={beginCreate}>
                    <X />
                  </button>
                )}
              </header>
              <label>
                Tipo
                <select
                  value={draft.kind}
                  onChange={(event) => {
                    const nextKind = event.target.value as CatalogKind;
                    setDraft((current) => ({ ...current, kind: nextKind }));
                    setKind(nextKind);
                  }}
                >
                  {kinds.map((entry) => (
                    <option value={entry} key={entry}>
                      {kindLabels[entry]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nombre
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder={
                    draft.kind === 'TIME_SLOT'
                      ? 'Ej. 16:30'
                      : 'Nombre que verá el cliente'
                  }
                  required
                />
              </label>
              <label>
                Descripción
                <textarea
                  rows={3}
                  value={draft.description || ''}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                />
              </label>
              {!['COLOR', 'TIME_SLOT'].includes(draft.kind) && (
                <label>
                  Se usa para
                  <select
                    value={
                      typeof draft.metadata.category === 'string'
                        ? draft.metadata.category
                        : ''
                    }
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        metadata: {
                          ...current.metadata,
                          category: event.target.value || undefined,
                        },
                      }))
                    }
                  >
                    <option value="">Todas las categorías</option>
                    <option value="PASTEL">Pasteles</option>
                    <option value="POSTRE">Postres</option>
                    <option value="EVENTO">Eventos y mesas dulces</option>
                  </select>
                </label>
              )}
              {draft.kind === 'COLOR' && (
                <label>
                  Color
                  <div className="admin-color-input">
                    <input
                      type="color"
                      value={draft.color_hex || '#E5A6B6'}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          color_hex: event.target.value,
                        }))
                      }
                    />
                    <input
                      value={draft.color_hex || ''}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          color_hex: event.target.value,
                        }))
                      }
                    />
                  </div>
                </label>
              )}
              <label>
                Foto opcional
                <span className="admin-upload">
                  <ImagePlus />
                  {image
                    ? image.name
                    : draft.image_url
                      ? 'Cambiar fotografía'
                      : 'Elegir JPG, PNG o WEBP'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setImage(event.target.files?.[0] || null)
                    }
                  />
                </span>
              </label>
              <div className="admin-two">
                <label>
                  Orden
                  <input
                    type="number"
                    value={draft.sort_order}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        sort_order: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <label className="admin-switch-label">
                  <span>Visible</span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-checked={draft.active}
                    aria-label="Visible para clientes"
                    checked={draft.active}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        active: event.target.checked,
                      }))
                    }
                  />
                </label>
              </div>
              <button
                className="button"
                type="submit"
                disabled={busy === 'catalog'}
              >
                {busy === 'catalog' ? (
                  <LoaderCircle className="order-spinner" />
                ) : (
                  <Save />
                )}{' '}
                {editing ? 'Guardar cambios' : 'Agregar al catálogo'}
              </button>
            </form>
          </section>
        )}

        {tab === 'settings' && settings && (
          <section className="admin-settings-grid">
            <form className="admin-settings-card" onSubmit={saveSettings}>
              <header>
                <LayoutDashboard />
                <div>
                  <h2>Operación diaria</h2>
                  <p>
                    Estos cambios se reflejan en el formulario y en la atención
                    automática.
                  </p>
                </div>
              </header>
              <label className="admin-accepting">
                <span>
                  <strong>Aceptar nuevas solicitudes</strong>
                  <small>
                    Apágalo cuando ya no puedas recibir más pedidos.
                  </small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={settings.accepting_orders}
                  aria-label="Aceptar nuevas solicitudes"
                  checked={settings.accepting_orders}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      accepting_orders: event.target.checked,
                    })
                  }
                />
              </label>
              <label>
                Mensaje cuando no se reciben pedidos
                <textarea
                  rows={2}
                  value={settings.paused_message}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      paused_message: event.target.value,
                    })
                  }
                />
              </label>
              <div className="admin-two">
                <label>
                  WhatsApp abre
                  <input
                    type="time"
                    value={settings.whatsapp_open.slice(0, 5)}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        whatsapp_open: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  WhatsApp cierra
                  <input
                    type="time"
                    value={settings.whatsapp_close.slice(0, 5)}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        whatsapp_close: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <div className="admin-two">
                <label>
                  Local abre
                  <input
                    type="time"
                    value={settings.store_open.slice(0, 5)}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        store_open: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Local cierra
                  <input
                    type="time"
                    value={settings.store_close.slice(0, 5)}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        store_close: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Dirección
                <input
                  value={settings.address}
                  onChange={(event) =>
                    setSettings({ ...settings, address: event.target.value })
                  }
                />
              </label>
              <label>
                Enlace de Google Maps
                <input
                  value={settings.maps_url}
                  onChange={(event) =>
                    setSettings({ ...settings, maps_url: event.target.value })
                  }
                />
              </label>
              <div className="admin-three">
                <label>
                  Días recomendados
                  <input
                    type="number"
                    min="0"
                    value={settings.booking_recommended_days}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        booking_recommended_days: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Mínimo calendario
                  <input
                    type="number"
                    min="0"
                    value={settings.booking_min_calendar_days}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        booking_min_calendar_days: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Horas urgentes
                  <input
                    type="number"
                    min="0"
                    value={settings.same_day_min_hours}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        same_day_min_hours: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <button className="button" disabled={busy === 'settings'}>
                {busy === 'settings' ? (
                  <LoaderCircle className="order-spinner" />
                ) : (
                  <Save />
                )}{' '}
                Guardar configuración
              </button>
            </form>

            <div className="admin-closures-card">
              <header>
                <CalendarOff />
                <div>
                  <h2>Vacaciones y cierres</h2>
                  <p>
                    Los pedidos existentes nunca se cancelan ni modifican
                    automáticamente.
                  </p>
                </div>
              </header>
              <form onSubmit={addClosure}>
                <label>
                  Tipo
                  <select
                    value={closureDraft.kind}
                    onChange={(event) =>
                      setClosureDraft({
                        ...closureDraft,
                        kind: event.target.value as Closure['kind'],
                      })
                    }
                  >
                    <option value="VACACIONES">Vacaciones</option>
                    <option value="CIERRE_ESPECIAL">Cierre especial</option>
                    <option value="NO_DISPONIBLE">Fecha no disponible</option>
                  </select>
                </label>
                <div className="admin-three">
                  <label>
                    Desde
                    <input
                      type="date"
                      value={closureDraft.starts_on}
                      onChange={(event) =>
                        setClosureDraft({
                          ...closureDraft,
                          starts_on: event.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label>
                    Hasta
                    <input
                      type="date"
                      value={closureDraft.ends_on}
                      onChange={(event) =>
                        setClosureDraft({
                          ...closureDraft,
                          ends_on: event.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label>
                    Regresamos
                    <input
                      type="date"
                      value={closureDraft.resumes_on}
                      onChange={(event) =>
                        setClosureDraft({
                          ...closureDraft,
                          resumes_on: event.target.value,
                        })
                      }
                      required
                    />
                  </label>
                </div>
                <label>
                  Mensaje al cliente
                  <textarea
                    rows={3}
                    value={closureDraft.message}
                    onChange={(event) =>
                      setClosureDraft({
                        ...closureDraft,
                        message: event.target.value,
                      })
                    }
                  />
                </label>
                <button
                  className="button button-outline"
                  disabled={busy === 'closure'}
                >
                  {busy === 'closure' ? (
                    <LoaderCircle className="order-spinner" />
                  ) : (
                    <Plus />
                  )}{' '}
                  Agregar cierre
                </button>
              </form>
              <div className="admin-closure-list">
                {closures.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.kind.replaceAll('_', ' ')}</strong>
                      <p>
                        {item.starts_on} a {item.ends_on} · Regreso{' '}
                        {item.resumes_on}
                      </p>
                      <small>{item.message}</small>
                    </div>
                    <button
                      onClick={() => removeClosure(item)}
                      disabled={busy === item.id}
                    >
                      <Trash2 />
                    </button>
                  </article>
                ))}
                {!closures.length && (
                  <p className="admin-muted">No hay cierres programados.</p>
                )}
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
