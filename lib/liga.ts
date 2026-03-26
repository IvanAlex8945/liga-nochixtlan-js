/**
 * Reglas de negocio – Liga Nochixtlan
 * Regla 3-1-0: Victoria=3, Derrota=1, WO perdido=0, Doble WO=0 ambos
 */

/**
 * Minimum attendances required for playoff eligibility.
 * Formula: floor(totalGames / 2) + 1
 * Example: 11 games → floor(11/2)+1 = 6
 */
export function elegibilidadLiguilla(partidosTotales: number): number {
  return Math.floor(partidosTotales / 2) + 1;
}

/**
 * Points scored on the court in a W.O. (default/forfeit) game.
 * Winner: 20 points. Loser: 0 points.
 */
export function puntosEnCanchaWO(esGanador: boolean): number {
  return esGanador ? 20 : 0;
}

/**
 * Table (standings) points earned from a single game result.
 * NEW RULE 3-1-0:
 *  - W.O. win      → 3 pts
 *  - W.O. loss     → 0 pts
 *  - Double W.O.   → 0 pts each
 *  - Regular win   → 3 pts
 *  - Regular loss  → 1 pt
 */
export function calcularPuntosTabla(esWO: boolean, esGanador: boolean): number {
  if (esWO) return esGanador ? 3 : 0;
  return esGanador ? 3 : 1;
}
