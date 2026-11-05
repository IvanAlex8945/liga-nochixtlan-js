import type { PlayerRow } from '@/app/components/PlayerAttendanceTable';

/**
 * Jugador extraído por la IA desde el dictado de voz.
 */
export interface ParsedPlayerStat {
  number: number | null;
  name: string;
  played?: boolean;
  points_1pt: number;
  points_2pt: number;
  points_3pt: number;
  total_points: number;
  matched_player_id?: number | null;
}

/**
 * Equipo extraído por la IA desde el dictado de voz.
 */
export interface ParsedTeamBoxScore {
  team_name: string;
  team_side?: 'home' | 'away' | 'unknown';
  total_team_score: number;
  players: ParsedPlayerStat[];
}

/**
 * Respuesta JSON estructurada devuelta por /api/parse-box-score.
 */
export interface ParsedBoxScoreResponse {
  teams: ParsedTeamBoxScore[];
}

/**
 * Estado del semáforo de conciliación contra la cédula oficial:
 * - exact: Coincide número y/o nombre sin conflicto (Verde)
 * - discrepancy: Se encontró por nombre pero el número difiere, o el número existe pero con otro nombre en cédula (Amarillo)
 * - not_found: Ni el dorsal ni el nombre existen en la cédula activa del equipo (Rojo)
 */
export type MatchStatus = 'exact' | 'discrepancy' | 'not_found';

export interface ReconciledPlayerItem {
  /** ID interno único de la fila en el reporte */
  key: string;
  /** Datos originales dictados */
  dictatedNumber: number | null;
  dictatedName: string;
  played: boolean;
  points1pt: number;
  points2pt: number;
  points3pt: number;
  /** Cantidad de triples encestados (points_3pt / 3 redondeado) */
  triplesCount: number;
  /** Puntos totales que se aplicarán a la tabla */
  totalPoints: number;
  /** Estado del semáforo */
  status: MatchStatus;
  /** Explicación legible para la mesa de control */
  statusReason: string;
  /** player_id de la cédula oficial asignado (null si no se encontró o se ignora) */
  assignedPlayerId: number | null;
  /** Si el usuario decidió ignorar esta fila al aplicar */
  ignored: boolean;
}

export interface TeamReconciliationReport {
  side: 'home' | 'away';
  officialTeamId: number;
  officialTeamName: string;
  dictatedTeamName: string;
  dictatedTeamTotalScore: number;
  calculatedPlayersSum: number;
  items: ReconciledPlayerItem[];
}

/**
 * Normaliza un texto en español quitando acentos, signos y espacios extra
 * para comparar nombres dictados vs nombres en base de datos.
 */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determina si un nombre dictado es genérico ("Jugador Desconocido", "Sin nombre", etc.)
 */
export function isUnknownPlayerName(name: string | null | undefined): boolean {
  const norm = normalizeText(name);
  if (!norm) return true;
  return (
    norm.includes('jugador desconocido') ||
    norm.includes('jugadora desconocida') ||
    norm.includes('desconocido') ||
    norm.includes('desconocida') ||
    norm.includes('sin nombre') ||
    /^dorsal\s+\d+$/.test(norm) ||
    /^numero\s+\d+$/.test(norm)
  );
}

/**
 * Calcula un puntaje de similitud entre dos nombres de jugadores (0 a 1).
 */
export function computeNameSimilarity(dictated: string, official: string): number {
  const normA = normalizeText(dictated);
  const normB = normalizeText(official);

  if (!normA || !normB || isUnknownPlayerName(dictated)) return 0;
  if (normA === normB) return 1;
  if (normB.includes(normA) || normA.includes(normB)) return 0.9;

  const tokensA = normA.split(' ').filter((t) => t.length >= 2);
  const tokensB = normB.split(' ').filter((t) => t.length >= 2);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  let matches = 0;
  for (const tokenA of tokensA) {
    if (tokensB.some((tokenB) => tokenB === tokenA || tokenB.startsWith(tokenA) || tokenA.startsWith(tokenB))) {
      matches++;
    }
  }

  return matches / Math.max(1, Math.min(tokensA.length, tokensB.length));
}

/**
 * Empareja un jugador dictado contra el roster oficial del equipo en Supabase.
 */
export function matchPlayerAgainstRoster(
  dictated: ParsedPlayerStat,
  roster: PlayerRow[],
  index: number,
  side: 'home' | 'away'
): ReconciledPlayerItem {
  const dictatedNum =
    dictated.number !== null && dictated.number !== undefined && Number.isFinite(Number(dictated.number))
      ? Number(dictated.number)
      : null;

  const p1 = Math.max(0, Number(dictated.points_1pt) || 0);
  const p2 = Math.max(0, Number(dictated.points_2pt) || 0);
  const p3 = Math.max(0, Number(dictated.points_3pt) || 0);
  const computedSum = p1 + p2 + p3;
  const rawTotal = Math.max(0, Number(dictated.total_points) || 0);
  const totalPoints = rawTotal > 0 ? rawTotal : computedSum;
  const triplesCount = p3 > 0 ? (p3 % 3 === 0 ? p3 / 3 : Math.round(p3 / 3) || 1) : 0;
  const played = dictated.played !== undefined ? dictated.played : totalPoints > 0;

  const unknownName = isUnknownPlayerName(dictated.name);

  // 1. Buscar por dorsal exacto en la cédula
  const byNumber =
    dictatedNum !== null
      ? roster.find((r) => r.number !== null && Number(r.number) === dictatedNum)
      : undefined;

  // 2. Buscar mejor coincidencia por nombre en la cédula
  let bestByName: PlayerRow | undefined;
  let bestNameScore = 0;

  if (!unknownName) {
    for (const candidate of roster) {
      const score = computeNameSimilarity(dictated.name, candidate.name);
      if (score > bestNameScore) {
        bestNameScore = score;
        bestByName = candidate;
      }
    }
  }

  // Caso A: Existe dorsal exacto en la cédula
  if (byNumber) {
    if (unknownName) {
      return {
        key: `${side}-${index}-${dictatedNum ?? 'x'}`,
        dictatedNumber: dictatedNum,
        dictatedName: dictated.name || 'Jugador Desconocido',
        played,
        points1pt: p1,
        points2pt: p2,
        points3pt: p3,
        triplesCount,
        totalPoints,
        status: 'exact',
        statusReason: `Dorsal #${dictatedNum} encontrado en cédula (${byNumber.name}).`,
        assignedPlayerId: byNumber.player_id,
        ignored: false,
      };
    }

    const similarityWithSameNumber = computeNameSimilarity(dictated.name, byNumber.name);
    if (similarityWithSameNumber >= 0.4) {
      return {
        key: `${side}-${index}-${dictatedNum}`,
        dictatedNumber: dictatedNum,
        dictatedName: dictated.name,
        played,
        points1pt: p1,
        points2pt: p2,
        points3pt: p3,
        triplesCount,
        totalPoints,
        status: 'exact',
        statusReason: `Coincidencia exacta en cédula (#${byNumber.number ?? 'S/N'} ${byNumber.name}).`,
        assignedPlayerId: byNumber.player_id,
        ignored: false,
      };
    }

    if (bestByName && bestByName.player_id !== byNumber.player_id && bestNameScore >= 0.75) {
      return {
        key: `${side}-${index}-${dictatedNum}`,
        dictatedNumber: dictatedNum,
        dictatedName: dictated.name,
        played,
        points1pt: p1,
        points2pt: p2,
        points3pt: p3,
        triplesCount,
        totalPoints,
        status: 'discrepancy',
        statusReason: `En el dictado dijiste #${dictatedNum} (${dictated.name}), pero en cédula "${bestByName.name}" tiene el #${bestByName.number ?? 'S/N'} y el #${dictatedNum} es de "${byNumber.name}".`,
        assignedPlayerId: bestByName.player_id,
        ignored: false,
      };
    }

    return {
      key: `${side}-${index}-${dictatedNum}`,
      dictatedNumber: dictatedNum,
      dictatedName: dictated.name,
      played,
      points1pt: p1,
      points2pt: p2,
      points3pt: p3,
      triplesCount,
      totalPoints,
      status: 'exact',
      statusReason: `Dorsal #${dictatedNum} encontrado (${byNumber.name}).`,
      assignedPlayerId: byNumber.player_id,
      ignored: false,
    };
  }

  // Caso B: El dorsal NO existe en la cédula, pero el nombre sí coincide
  if (bestByName && bestNameScore >= 0.6) {
    return {
      key: `${side}-${index}-${dictatedNum ?? 'sn'}`,
      dictatedNumber: dictatedNum,
      dictatedName: dictated.name,
      played,
      points1pt: p1,
      points2pt: p2,
      points3pt: p3,
      triplesCount,
      totalPoints,
      status: 'discrepancy',
      statusReason:
        dictatedNum !== null
          ? `El dorsal #${dictatedNum} no existe en cédula, pero por nombre coincide con "${bestByName.name}" (dorsal oficial: #${bestByName.number ?? 'S/N'}).`
          : `Encontrada por nombre en cédula: "${bestByName.name}" (#${bestByName.number ?? 'S/N'}).`,
      assignedPlayerId: bestByName.player_id,
      ignored: false,
    };
  }

  // Caso C: Si la IA sugirió un matched_player_id válido
  if (dictated.matched_player_id) {
    const byId = roster.find((r) => r.player_id === Number(dictated.matched_player_id));
    if (byId) {
      return {
        key: `${side}-${index}-${dictatedNum ?? 'ai'}`,
        dictatedNumber: dictatedNum,
        dictatedName: dictated.name,
        played,
        points1pt: p1,
        points2pt: p2,
        points3pt: p3,
        triplesCount,
        totalPoints,
        status: 'exact',
        statusReason: `Sugerida por IA: "${byId.name}" (#${byId.number ?? 'S/N'}).`,
        assignedPlayerId: byId.player_id,
        ignored: false,
      };
    }
  }

  // Caso D: Ni el dorsal ni el nombre se encontraron (Rojo)
  return {
    key: `${side}-${index}-${dictatedNum ?? 'unmatched'}`,
    dictatedNumber: dictatedNum,
    dictatedName: dictated.name || 'Jugador Desconocido',
    played,
    points1pt: p1,
    points2pt: p2,
    points3pt: p3,
    triplesCount,
    totalPoints,
    status: 'not_found',
    statusReason:
      dictatedNum !== null
        ? `El dorsal #${dictatedNum} (${dictated.name || 'Jugador Desconocido'}) NO está registrado en la cédula de este equipo.`
        : `"${dictated.name}" NO aparece en la cédula de este equipo.`,
    assignedPlayerId: null,
    ignored: false,
  };
}

/**
 * Construye el reporte completo de conciliación para el equipo Local y Visitante.
 */
export function buildMatchReconciliationReport(
  parsed: ParsedBoxScoreResponse,
  homeTeam: { id: number; name: string },
  awayTeam: { id: number; name: string },
  homePlayers: PlayerRow[],
  awayPlayers: PlayerRow[]
): { homeReport: TeamReconciliationReport; awayReport: TeamReconciliationReport } {
  const teams = Array.isArray(parsed?.teams) ? parsed.teams : [];

  let homeParsed: ParsedTeamBoxScore | undefined;
  let awayParsed: ParsedTeamBoxScore | undefined;

  for (const t of teams) {
    if (t.team_side === 'home' && !homeParsed) {
      homeParsed = t;
      continue;
    }
    if (t.team_side === 'away' && !awayParsed) {
      awayParsed = t;
      continue;
    }

    const simHome = computeNameSimilarity(t.team_name, homeTeam.name);
    const simAway = computeNameSimilarity(t.team_name, awayTeam.name);

    if (simHome > simAway && simHome >= 0.4 && !homeParsed) {
      homeParsed = t;
    } else if (simAway > simHome && simAway >= 0.4 && !awayParsed) {
      awayParsed = t;
    }
  }

  const remaining = teams.filter((t) => t !== homeParsed && t !== awayParsed);
  if (!homeParsed && remaining.length > 0) {
    homeParsed = remaining.shift();
  }
  if (!awayParsed && remaining.length > 0) {
    awayParsed = remaining.shift();
  }

  const buildTeamReport = (
    side: 'home' | 'away',
    officialTeam: { id: number; name: string },
    roster: PlayerRow[],
    parsedTeam?: ParsedTeamBoxScore
  ): TeamReconciliationReport => {
    const rawPlayers = Array.isArray(parsedTeam?.players) ? parsedTeam!.players : [];
    const items = rawPlayers.map((p, idx) => matchPlayerAgainstRoster(p, roster, idx, side));
    const calculatedPlayersSum = items.reduce(
      (sum, item) => sum + (item.ignored ? 0 : item.totalPoints),
      0
    );

    return {
      side,
      officialTeamId: officialTeam.id,
      officialTeamName: officialTeam.name,
      dictatedTeamName: parsedTeam?.team_name || officialTeam.name,
      dictatedTeamTotalScore: Number(parsedTeam?.total_team_score) || calculatedPlayersSum,
      calculatedPlayersSum,
      items,
    };
  };

  return {
    homeReport: buildTeamReport('home', homeTeam, homePlayers, homeParsed),
    awayReport: buildTeamReport('away', awayTeam, awayPlayers, awayParsed),
  };
}

/**
 * Aplica los puntos y triples conciliados sobre las filas de PlayerAttendanceTable.
 * - Marca played = true a las que asistieron o anotaron.
 * - Desmarca (played = false) a las que NO se mencionaron en el dictado.
 */
export function applyReconciledItemsToLineup(
  currentLineup: PlayerRow[],
  reconciledItems: ReconciledPlayerItem[],
  mode: 'replace' | 'merge' = 'replace'
): PlayerRow[] {
  const aggregatedByPlayerId = new Map<
    number,
    { played: boolean; points: number; triples: number }
  >();

  for (const item of reconciledItems) {
    if (item.ignored || !item.assignedPlayerId) continue;
    const prev = aggregatedByPlayerId.get(item.assignedPlayerId) ?? {
      played: item.played,
      points: 0,
      triples: 0,
    };
    aggregatedByPlayerId.set(item.assignedPlayerId, {
      played: prev.played || item.played,
      points: prev.points + (Number(item.totalPoints) || 0),
      triples: prev.triples + (Number(item.triplesCount) || 0),
    });
  }

  return currentLineup.map((row) => {
    const match = aggregatedByPlayerId.get(row.player_id);
    if (match) {
      return {
        ...row,
        played: match.played,
        points: mode === 'merge' ? (Number(row.points) || 0) + match.points : match.points,
        triples: mode === 'merge' ? (Number(row.triples) || 0) + match.triples : match.triples,
      };
    }

    if (mode === 'replace') {
      return {
        ...row,
        played: false,
        points: 0,
        triples: 0,
      };
    }

    return row;
  });
}
