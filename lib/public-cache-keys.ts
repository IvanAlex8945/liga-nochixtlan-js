export const PUBLIC_SEASONS_TAG = 'public-seasons';

export function getPublicSeasonTag(seasonId: number) {
  return `public-season:${seasonId}`;
}
