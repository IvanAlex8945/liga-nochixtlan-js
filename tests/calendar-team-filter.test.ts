import { describe, expect, it } from 'vitest';
import { filterTeamOption } from '../lib/scheduling';

describe('Calendar team filter and option matching', () => {
  const sampleOptions = [
    { label: 'ALACRANES', value: 1 },
    { label: 'ALEBRIJES', value: 2 },
    { label: 'COYOTES', value: 3 },
    { label: 'CORPUS CHRISTI', value: 4 },
    { label: 'GUERREROS', value: 5 },
    { label: 'INTERCAB', value: 6 },
    { label: 'M-SPORT', value: 7 },
    { label: 'MORRIS', value: 8 },
    { label: 'NOVEDADES ORTIZ', value: 9 },
    { label: 'PRIMOS', value: 10 },
    { label: 'SILMOR', value: 11 },
    { label: 'UNIVERSIDAD', value: 12 },
  ];

  it('permite buscar sin importar mayúsculas o minúsculas', () => {
    expect(filterTeamOption('guerreros', sampleOptions[4])).toBe(true);
    expect(filterTeamOption('GUERREROS', sampleOptions[4])).toBe(true);
    expect(filterTeamOption('GueRreRos', sampleOptions[4])).toBe(true);
    expect(filterTeamOption('coyotes', sampleOptions[2])).toBe(true);
    expect(filterTeamOption('intercab', sampleOptions[5])).toBe(true);
  });

  it('permite buscar nombres con acentos o sin acentos de forma tolerante', () => {
    const accentedOption = { label: 'ELÉCTRICA Y PLOMERÍA GS', value: 13 };
    expect(filterTeamOption('electrica', accentedOption)).toBe(true);
    expect(filterTeamOption('eléctrica', accentedOption)).toBe(true);
    expect(filterTeamOption('plomeria', accentedOption)).toBe(true);
    expect(filterTeamOption('plomería', accentedOption)).toBe(true);

    const ortizOption = { label: 'NOVEDADES ORTÍZ', value: 9 };
    expect(filterTeamOption('ortiz', ortizOption)).toBe(true);
    expect(filterTeamOption('ortíz', ortizOption)).toBe(true);
    expect(filterTeamOption('novedades', ortizOption)).toBe(true);
  });

  it('no descarta equipos cuando el texto de búsqueda es cadena vacía', () => {
    for (const opt of sampleOptions) {
      expect(filterTeamOption('', opt)).toBe(true);
    }
  });

  it('filtra correctamente sin devolver coincidencias falsas', () => {
    expect(filterTeamOption('morris', sampleOptions[4])).toBe(false); // GUERREROS is not MORRIS
    expect(filterTeamOption('alacranes', sampleOptions[0])).toBe(true);
    expect(filterTeamOption('alacranes', sampleOptions[1])).toBe(false); // ALEBRIJES is not ALACRANES
  });
});
