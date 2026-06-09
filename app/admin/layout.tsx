import { redirect } from 'next/navigation';

import { AdminAccessProvider } from '@/app/components/AdminAccessProvider';
import { getCurrentAdminAccess } from '@/lib/access-control-server';

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getCurrentAdminAccess();

  if (!access.role) {
    redirect('/no-access');
  }

  return (
    <AdminAccessProvider access={access}>
      {children}
    </AdminAccessProvider>
  );
}
