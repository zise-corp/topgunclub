import type { Metadata } from 'next';
import AdminPanel from '@/components/admin/AdminPanel';

export const metadata: Metadata = {
  title: 'Panel de Administración',
  description: 'Administración de la tienda de Top Gun Club SRL',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}
