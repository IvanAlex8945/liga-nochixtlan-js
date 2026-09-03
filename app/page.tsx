import PublicPageClient from './components/PublicPageClient';
import {
  getCachedActiveSeasons,
  getCachedPublicSeasonData,
} from '@/lib/public-data';

export const revalidate = 300;

export default async function Home() {
  const seasons = await getCachedActiveSeasons();
  const initialSeasonId = seasons[0]?.id ?? null;
  const initialData = initialSeasonId
    ? await getCachedPublicSeasonData(initialSeasonId)
    : { teams: [], players: [], matches: [], stats: [] };

  return (
    <PublicPageClient
      seasons={seasons}
      initialSeasonId={initialSeasonId}
      initialData={initialData}
    />
  );
}
