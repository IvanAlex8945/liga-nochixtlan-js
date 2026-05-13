import { describe, expect, it } from 'vitest';
import { calcularPuntosTabla, elegibilidadLiguilla, puntosEnCanchaWO } from '../lib/liga';

describe('lib/liga', () => {
  it('calcula la formula de elegibilidad de liguilla', () => {
    expect(elegibilidadLiguilla(0)).toBe(1);
    expect(elegibilidadLiguilla(1)).toBe(1);
    expect(elegibilidadLiguilla(2)).toBe(2);
    expect(elegibilidadLiguilla(11)).toBe(6);
  });

  it('asigna marcador de cancha correcto para W.O.', () => {
    expect(puntosEnCanchaWO(true)).toBe(20);
    expect(puntosEnCanchaWO(false)).toBe(0);
  });

  it('aplica la regla 3-1-0 para tabla', () => {
    expect(calcularPuntosTabla(false, true)).toBe(3);
    expect(calcularPuntosTabla(false, false)).toBe(1);
    expect(calcularPuntosTabla(true, true)).toBe(3);
    expect(calcularPuntosTabla(true, false)).toBe(0);
  });
});
