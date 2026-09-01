import { describe, expect, it } from 'vitest';

import {
  formatPlayerNumber,
  normalizePlayerNumberForStorage,
} from '../lib/player-number';

describe('player number helpers', () => {
  it('conserva 0 y 00 como dorsales distintos', () => {
    expect(normalizePlayerNumberForStorage('0')).toBe('0');
    expect(normalizePlayerNumberForStorage('00')).toBe('00');
    expect(formatPlayerNumber('0')).toBe('0');
    expect(formatPlayerNumber('00')).toBe('00');
  });

  it('mantiene el valor vacio configurable cuando no hay dorsal', () => {
    expect(normalizePlayerNumberForStorage('')).toBeNull();
    expect(formatPlayerNumber(null, '?')).toBe('?');
  });
});
