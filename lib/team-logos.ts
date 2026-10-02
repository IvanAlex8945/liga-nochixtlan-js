/**
 * Team Logo Resolver and Sports Emblem System
 * Maps team names to high-definition AI generated logos or athletic SVG crests.
 */

const KNOWN_LOGOS: Record<string, string> = {
  'ALACRANES': '/logos/alacranes.jpg',
  'GUERREROS': '/logos/guerreros.jpg',
  'CORRECAMINOS': '/logos/correcaminos.jpg',
  'CORPUS CHRISTI': '/logos/corpus-christi.jpg',
  'MADERERIA EL ORO': '/logos/madereria-el-oro.jpg',
  'MUEBLES CARLITOS': '/logos/muebles-carlitos.jpg',
  'PRIMOS': '/logos/primos.jpg',
  'M-SPORT': '/logos/m-sport.jpg',
  'ALEBRIJES': '/logos/alebrijes.jpg',
  'MIXTECOS': '/logos/mixtecos.jpg',
};

export function normalizeTeamKey(name: string): string {
  return (name || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getTeamLogoUrl(teamName: string): string | null {
  const key = normalizeTeamKey(teamName);
  return KNOWN_LOGOS[key] || null;
}
