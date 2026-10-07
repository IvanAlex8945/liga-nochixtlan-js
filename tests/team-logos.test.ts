import { describe, it, expect } from 'vitest';
import { getTeamLogoUrl, normalizeTeamKey } from '../lib/team-logos';

describe('team-logos resolver', () => {
  it('normalizes team names with accents, quotes, and whitespace', () => {
    expect(normalizeTeamKey('  Eléctrica y Plomería "GS"  ')).toBe('ELECTRICA Y PLOMERIA GS');
    expect(normalizeTeamKey('Plomería GS')).toBe('PLOMERIA GS');
    expect(normalizeTeamKey('Guerreros')).toBe('GUERREROS');
  });

  it('resolves Plomeria GS logo correctly across variations', () => {
    expect(getTeamLogoUrl('ELECTRICA Y PLOMERIA GS')).toBe('/logos/plomeria-gs.png');
    expect(getTeamLogoUrl('ELECTRICA Y PLOMERIA "GS"')).toBe('/logos/plomeria-gs.png');
    expect(getTeamLogoUrl('Eléctrica y Plomería GS')).toBe('/logos/plomeria-gs.png');
    expect(getTeamLogoUrl('Plomeria GS')).toBe('/logos/plomeria-gs.png');
    expect(getTeamLogoUrl('PLOMERIA GS')).toBe('/logos/plomeria-gs.png');
  });

  it('resolves other known team logos and returns null for unknown teams', () => {
    expect(getTeamLogoUrl('Guerreros')).toBe('/logos/guerreros.jpg');
    expect(getTeamLogoUrl('Alacranes')).toBe('/logos/alacranes.jpg');
    expect(getTeamLogoUrl('Equipo Desconocido 123')).toBeNull();
  });
});
