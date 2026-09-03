import { redirect } from 'next/navigation';

import AdminLayout from '@/app/components/AdminLayout';
import { getCurrentAdminAccess } from '@/lib/access-control-server';
import { hasPermission } from '@/lib/access-control';

import CedulaInscripcion from './CedulaInscripcion';
import { fetchCedulaInscripcionData } from './data';

interface CedulaPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function CedulaPage({ params }: CedulaPageProps) {
  const access = await getCurrentAdminAccess();

  if (!hasPermission(access.permissions, 'manage_teams')) {
    redirect('/no-access');
  }

  const { teamId } = await params;
  const numericTeamId = Number(teamId);

  if (!Number.isFinite(numericTeamId) || numericTeamId <= 0) {
    redirect('/admin/teams');
  }

  const data = await fetchCedulaInscripcionData(numericTeamId);

  return (
    <AdminLayout>
      <CedulaInscripcion data={data} />
    </AdminLayout>
  );
}
