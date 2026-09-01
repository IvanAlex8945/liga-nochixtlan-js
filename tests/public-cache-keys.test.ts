import { describe, expect, it } from 'vitest';

import {
  getPublicSeasonTag,
  PUBLIC_SEASONS_TAG,
} from '../lib/public-cache-keys';

describe('public cache keys', () => {
  it('mantiene una etiqueta global para el catálogo de temporadas', () => {
    expect(PUBLIC_SEASONS_TAG).toBe('public-seasons');
  });

  it('separa el caché de cada temporada', () => {
    expect(getPublicSeasonTag(4)).toBe('public-season:4');
    expect(getPublicSeasonTag(5)).toBe('public-season:5');
    expect(getPublicSeasonTag(4)).not.toBe(getPublicSeasonTag(5));
  });
});
