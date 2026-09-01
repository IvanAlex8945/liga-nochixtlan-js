'use client';

interface PublicCacheInvalidation {
  seasonId?: number | null;
  seasons?: boolean;
}

export async function invalidatePublicCache({
  seasonId,
  seasons = false,
}: PublicCacheInvalidation): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/revalidate-public-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId, seasons }),
    });

    if (!response.ok) {
      console.warn('No se pudo invalidar el caché público.', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.warn('No se pudo solicitar la invalidación del caché público.', error);
    return false;
  }
}
