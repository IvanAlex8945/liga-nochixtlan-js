import { redirect } from 'next/navigation';

interface ManualPageProps {
  searchParams?: Promise<{ code?: string }>;
}

export default async function VerifyManualRedirectPage({ searchParams }: ManualPageProps) {
  const query = (await searchParams) ?? {};
  const code = query.code?.trim().toUpperCase();

  if (!code) {
    redirect('/verificar');
  }

  redirect(`/verificar/no-token?code=${encodeURIComponent(code)}`);
}
