import type { Metadata } from 'next';
import { AdminPanel } from './admin-panel';

export const metadata: Metadata = {
  title: 'Administración | Lucátta',
  description: 'Panel privado de operación de Lucátta.',
  robots: { index: false, follow: false },
};

export default function AdministrationPage() {
  return <AdminPanel />;
}
