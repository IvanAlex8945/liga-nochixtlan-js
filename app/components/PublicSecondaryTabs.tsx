'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Select, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

import type {
  PublicMatch as MatchData,
  PublicPlayer as PlayerData,
  PublicPlayerStats as PlayerStats,
  PublicTeam as TeamData,
} from '@/lib/public-data';
import {
  buildTeamEncounters,
  isPlayedStatus,
  isRegularPhase,
  type TeamEncounter,
} from '@/lib/public-team-matches';
import { formatPlayerNumber } from '@/lib/player-number';

dayjs.locale('es');

const { Text } = Typography;
const thStyle: CSSProperties = { textAlign: 'center' };
const tdStyle: CSSProperties = { textAlign: 'center' };

function sortTeamsByName(teams: TeamData[]) {
  return [...teams].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

function sortSelectOptions<T extends { label: string }>(a: T, b: T) {
  return a.label.localeCompare(b.label, 'es', { sensitivity: 'base' });
}

function formatShortPlayerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 2) return fullName;
  if (parts.length === 3) return `${parts[0]} ${parts[1]}`;

  return `${parts[0]} ${parts[parts.length - 2]}`;
}

interface SecondaryTabProps {
  seasonId: number | null;
  teams: TeamData[];
  players: PlayerData[];
  matches: MatchData[];
  stats: PlayerStats[];
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="premium-section-card" style={{ padding: 20 }}>
      {children}
    </section>
  );
}

function useIsCoarsePointer() {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const update = () => setIsCoarsePointer(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isCoarsePointer;
}

export function PublicLeadersTab({
  teams,
  matches,
  stats,
}: Pick<SecondaryTabProps, 'teams' | 'matches' | 'stats'>) {
  const regularMatches = useMemo(
    () => matches.filter((match) => !match.phase || match.phase === 'Fase Regular'),
    [matches]
  );

  const { leaders, tripleros, bestPoints, bestTriples } = useMemo(() => {
    const matchIds = new Set(regularMatches.map((match) => match.id));
    const matchById = new Map(regularMatches.map((match) => [match.id, match]));
    const playerTotals = new Map<number, {
      id: number;
      name: string;
      teamId: number;
      points: number;
      triples: number;
    }>();
    let pointsRecord: { name: string; value: number; team: string; jornada: number | null } | null = null;
    let triplesRecord: { name: string; value: number; team: string; jornada: number | null } | null = null;

    for (const stat of stats) {
      if (!matchIds.has(stat.match_id) || !stat.played || !stat.players) continue;

      const player = stat.players;
      const shortName = formatShortPlayerName(player.name);
      const current = playerTotals.get(player.id) ?? {
        id: player.id,
        name: shortName,
        teamId: stat.team_id,
        points: 0,
        triples: 0,
      };

      current.points += stat.points ?? 0;
      current.triples += stat.triples ?? 0;
      playerTotals.set(player.id, current);

      const teamName = teams.find((team) => team.id === stat.team_id)?.name ?? '?';
      const jornada = matchById.get(stat.match_id)?.jornada ?? null;

      if ((stat.points ?? 0) > (pointsRecord?.value ?? -1)) {
        pointsRecord = { name: shortName, value: stat.points ?? 0, team: teamName, jornada };
      }
      if ((stat.triples ?? 0) > (triplesRecord?.value ?? -1)) {
        triplesRecord = { name: shortName, value: stat.triples ?? 0, team: teamName, jornada };
      }
    }

    const totals = Array.from(playerTotals.values());

    return {
      leaders: totals.filter((player) => player.points > 0).sort((a, b) => b.points - a.points).slice(0, 10),
      tripleros: totals.filter((player) => player.triples > 0).sort((a, b) => b.triples - a.triples).slice(0, 10),
      bestPoints: pointsRecord?.value ? pointsRecord : null,
      bestTriples: triplesRecord?.value ? triplesRecord : null,
    };
  }, [regularMatches, stats, teams]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <SectionCard>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div>
            <div className="premium-section-label" style={{ marginBottom: 10 }}>🏀 Top Anotadores</div>
            <LeadersTable data={leaders} valueKey="points" color="#FAAD14" teams={teams} />
          </div>
          <div>
            <div className="premium-section-label" style={{ marginBottom: 10 }}>🎯 Top Tripleros</div>
            <LeadersTable data={tripleros} valueKey="triples" color="#6fb5ff" teams={teams} />
          </div>
        </div>
      </SectionCard>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {bestPoints && <RecordBadge icon="🔥" label="Record de puntos" color="#FAAD14" record={bestPoints} />}
        {bestTriples && <RecordBadge icon="🎯" label="Record de triples" color="#6fb5ff" record={bestTriples} />}
      </div>
    </div>
  );
}

function LeadersTable({
  data,
  valueKey,
  color,
  teams,
}: {
  data: Array<{ id: number; name: string; teamId: number; points: number; triples: number }>;
  valueKey: 'points' | 'triples';
  color: string;
  teams: TeamData[];
}) {
  if (data.length === 0) {
    return <Text style={{ color: '#94a3b8' }}>Sin estadísticas registradas</Text>;
  }

  return (
    <div className="premium-table-shell">
      <div style={{ overflowX: 'auto' }}>
        <table className="premium-data-table">
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Jugador</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Equipo</th>
              <th style={thStyle}>{valueKey === 'points' ? 'Puntos' : '3PT'}</th>
              {valueKey === 'triples' && <th style={thStyle}>Pts Eq.</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((player, index) => (
              <tr key={player.id} style={index < 3 ? { background: `${color}12` } : undefined}>
                <td style={tdStyle}>
                  <span className="premium-stat-pill" style={{ color: index < 3 ? color : '#efe7cf', minWidth: 54 }}>
                    {index + 1}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{player.name}</td>
                <td style={{ ...tdStyle, textAlign: 'left', color: 'rgba(245, 241, 232, 0.62)', fontSize: 12 }}>
                  {teams.find((team) => team.id === player.teamId)?.name ?? '?'}
                </td>
                <td style={tdStyle}>
                  <span className="premium-stat-pill" style={{ color }}>{player[valueKey]}</span>
                </td>
                {valueKey === 'triples' && (
                  <td style={tdStyle}>{player.triples * 3}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecordBadge({
  icon,
  label,
  color,
  record,
}: {
  icon: string;
  label: string;
  color: string;
  record: { name: string; value: number; team: string; jornada: number | null };
}) {
  return (
    <div className="premium-record-badge" style={{ padding: '14px 16px' }}>
      <div style={{ color, fontWeight: 800, fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase' }}>
        {icon} {label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10, gap: 10 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{record.name}</div>
          <div style={{ color: 'rgba(245, 241, 232, 0.58)', fontSize: 12 }}>
            {record.team} · J{record.jornada ?? '?'}
          </div>
        </div>
        <div className="premium-stat-pill" style={{ color }}>{record.value}</div>
      </div>
    </div>
  );
}

export function PublicTeamStatsTab({
  seasonId,
  teams,
  players,
  matches,
  stats,
}: SecondaryTabProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'Fase Regular' | 'Liguilla'>('Fase Regular');
  const isCoarsePointer = useIsCoarsePointer();
  const activeTeams = useMemo(
    () => sortTeamsByName(teams.filter((team) => team.season_id === seasonId)),
    [seasonId, teams]
  );

  const playerRows = useMemo(() => {
    if (!selectedTeamId) return [];

    const filteredMatches = matches.filter((match) => {
      if (phaseFilter === 'all') return true;
      if (phaseFilter === 'Fase Regular') return !match.phase || match.phase === 'Fase Regular';
      return Boolean(match.phase && match.phase !== 'Fase Regular');
    });
    const matchIds = new Set(filteredMatches.map((match) => match.id));
    const rows = new Map<number, { id: number; number: string | null; name: string; triples: number; points: number }>();

    players.filter((player) => player.team_id === selectedTeamId).forEach((player) => {
      rows.set(player.id, {
        id: player.id,
        number: player.number ?? null,
        name: player.name,
        triples: 0,
        points: 0,
      });
    });

    stats.forEach((stat) => {
      if (!matchIds.has(stat.match_id) || stat.team_id !== selectedTeamId || !stat.played || !stat.players) return;
      const row = rows.get(stat.players.id) ?? {
        id: stat.players.id,
        number: null,
        name: stat.players.name,
        triples: 0,
        points: 0,
      };
      row.triples += stat.triples ?? 0;
      row.points += stat.points ?? 0;
      rows.set(row.id, row);
    });

    return Array.from(rows.values()).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  }, [matches, phaseFilter, players, selectedTeamId, stats]);

  return (
    <SectionCard>
      {!seasonId ? (
        <Text style={{ color: '#94a3b8' }}>Selecciona una temporada arriba.</Text>
      ) : (
        <>
          <div style={{ marginBottom: 18, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px' }}>
              <Text className="premium-helper-text" style={{ display: 'block', marginBottom: 8 }}>Selecciona un equipo:</Text>
              <Select
                className="premium-select"
                style={{ width: '100%', maxWidth: 420 }}
                placeholder="Seleccionar equipo"
                value={selectedTeamId}
                onChange={setSelectedTeamId}
                options={activeTeams.map((team) => ({ label: team.name, value: team.id }))}
                showSearch={!isCoarsePointer}
                filterOption={(input, option) => (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
                filterSort={sortSelectOptions}
              />
            </div>
            <div style={{ flex: '0 1 220px' }}>
              <Text className="premium-helper-text" style={{ display: 'block', marginBottom: 8 }}>Fase:</Text>
              <Select
                className="premium-select"
                style={{ width: '100%' }}
                value={phaseFilter}
                onChange={setPhaseFilter}
                options={[
                  { label: 'Toda la temporada', value: 'all' },
                  { label: 'Fase Regular', value: 'Fase Regular' },
                  { label: 'Liguilla / Play-offs', value: 'Liguilla' },
                ]}
              />
            </div>
          </div>

          {selectedTeamId && (
            playerRows.length === 0 ? (
              <Text style={{ color: '#94a3b8' }}>Sin estadísticas registradas para este equipo.</Text>
            ) : (
              <div className="premium-table-shell">
                <div style={{ overflowX: 'auto' }}>
                  <table className="premium-data-table">
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Jugador</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Nombre</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Triples</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerRows.map((player) => (
                        <tr key={player.id}>
                          <td style={{ ...tdStyle, textAlign: 'left', color: 'rgba(245, 241, 232, 0.58)', width: 72 }}>
                            {player.number !== null ? `#${formatPlayerNumber(player.number)}` : '-'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{player.name}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}><span className="premium-stat-pill">{player.triples}</span></td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}><span className="premium-stat-pill">{player.points}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </>
      )}
    </SectionCard>
  );
}

function getOpponent(match: MatchData, teamId: number) {
  return match.home_team_id === teamId ? match.away_team : match.home_team;
}

function formatDate(match: MatchData) {
  const details = [
    match.time_str ? `${match.time_str} hrs` : null,
    match.court,
  ].filter(Boolean);

  if (!match.scheduled_date) {
    const fallback = [
      typeof match.jornada === 'number' ? `Jornada ${match.jornada}` : 'Sin fecha aún',
      ...details,
    ];
    return fallback.join(' · ');
  }

  return [dayjs(match.scheduled_date).format('DD MMM YYYY'), ...details].join(' · ');
}

function getMatchSortValue(match: MatchData) {
  const datedValue = dayjs(match.played_date ?? match.scheduled_date ?? '').valueOf();
  if (Number.isFinite(datedValue)) return datedValue;
  if (typeof match.jornada === 'number') return match.jornada;
  return 0;
}

function isPastCalendarMatch(match: MatchData) {
  if (isPlayedStatus(match.status)) return true;
  if (!match.scheduled_date) return false;
  return dayjs(match.scheduled_date).isBefore(dayjs(), 'day');
}

function getResult(match: MatchData, teamId: number) {
  const isHome = match.home_team_id === teamId;
  const pointsFor = isHome ? match.home_score : match.away_score;
  const pointsAgainst = isHome ? match.away_score : match.home_score;

  if (typeof pointsFor !== 'number' || typeof pointsAgainst !== 'number') {
    return { label: match.status ?? 'Jugado', score: match.status ?? 'Resultado pendiente', color: '#f7d774' };
  }

  if (pointsFor === pointsAgainst) {
    return { label: 'Empate', score: `${pointsFor} - ${pointsAgainst}`, color: '#f7d774' };
  }

  return {
    label: pointsFor > pointsAgainst ? 'Ganaron' : 'Perdieron',
    score: `${pointsFor} - ${pointsAgainst}`,
    color: pointsFor > pointsAgainst ? '#95de64' : '#ff9c9d',
  };
}

export function PublicTeamMatchesTab({
  seasonId,
  teams,
  matches,
}: Pick<SecondaryTabProps, 'seasonId' | 'teams' | 'matches'>) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const isCoarsePointer = useIsCoarsePointer();
  const activeTeams = useMemo(
    () => sortTeamsByName(teams.filter((team) => team.season_id === seasonId)),
    [seasonId, teams]
  );

  const { pending, played, playoffs } = useMemo(() => {
    if (!selectedTeamId) return { pending: [], played: [], playoffs: [] };

    const teamMatches = matches.filter(
      (match) => match.home_team_id === selectedTeamId || match.away_team_id === selectedTeamId
    );
    const encounters = buildTeamEncounters(selectedTeamId, activeTeams, matches);

    return {
      pending: encounters.filter((encounter) => !encounter.match || !isPlayedStatus(encounter.match.status)),
      played: encounters
        .filter((encounter): encounter is TeamEncounter<MatchData> & { match: MatchData } => Boolean(encounter.match && isPlayedStatus(encounter.match.status)))
        .sort((a, b) => getMatchSortValue(b.match) - getMatchSortValue(a.match)),
      playoffs: teamMatches.filter((match) => !isRegularPhase(match.phase)),
    };
  }, [activeTeams, matches, selectedTeamId]);

  return (
    <SectionCard>
      {!seasonId ? (
        <Text style={{ color: '#94a3b8' }}>Selecciona una temporada arriba.</Text>
      ) : (
        <>
          <div style={{ marginBottom: 18 }}>
            <Text className="premium-helper-text" style={{ display: 'block', marginBottom: 8 }}>Selecciona tu equipo:</Text>
            <Select
              className="premium-select"
              style={{ width: '100%', maxWidth: 440 }}
              placeholder="Seleccionar equipo"
              value={selectedTeamId}
              onChange={setSelectedTeamId}
              options={activeTeams.map((team) => ({ label: team.name, value: team.id }))}
              showSearch={!isCoarsePointer}
              filterOption={(input, option) => (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
              filterSort={sortSelectOptions}
            />
          </div>

          {!selectedTeamId ? (
            <Text style={{ color: '#94a3b8', display: 'block', textAlign: 'center', padding: 32 }}>
              Selecciona tu equipo para ver sus partidos.
            </Text>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <EncounterList title="Partidos que faltan" encounters={pending} teamId={selectedTeamId} />
              <EncounterList title="Partidos ya jugados" encounters={played} teamId={selectedTeamId} showResult />
              {playoffs.length > 0 && <PlayoffList matches={playoffs} teamId={selectedTeamId} />}
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

function EncounterList({
  title,
  encounters,
  teamId,
  showResult = false,
}: {
  title: string;
  encounters: TeamEncounter<MatchData>[];
  teamId: number;
  showResult?: boolean;
}) {
  return (
    <div>
      <div className="premium-section-label">{title}</div>
      {encounters.length === 0 ? (
        <Text style={{ color: '#94a3b8' }}>No hay partidos en esta sección.</Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {encounters.map((encounter) => {
            const match = encounter.match;
            const result = showResult && match && isPlayedStatus(match.status) ? getResult(match, teamId) : null;
            return (
              <div key={encounter.key} className="premium-calendar-card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#fff5dd', fontWeight: 700 }}>{encounter.opponent.name}</div>
                  <div style={{ color: 'rgba(245, 241, 232, 0.58)', fontSize: 12, marginTop: 4 }}>
                    {encounter.leg === 'ida' ? 'Primer enfrentamiento' : 'Segundo enfrentamiento'}
                  </div>
                </div>
                <div style={{ color: result?.color ?? 'rgba(245, 241, 232, 0.7)', fontSize: 12, textAlign: 'right' }}>
                  {result ? `${result.score} · ${result.label}` : match ? formatDate(match) : 'Por programar · Aún no registrado'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayoffList({ matches, teamId }: { matches: MatchData[]; teamId: number }) {
  return (
    <div>
      <div className="premium-section-label">Liguilla</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {matches.map((match) => {
          const result = isPlayedStatus(match.status) ? getResult(match, teamId) : null;
          return (
            <div key={match.id} className="premium-calendar-card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#fff5dd', fontWeight: 700 }}>{getOpponent(match, teamId)?.name ?? 'Rival por definir'}</div>
                <div style={{ color: 'rgba(245, 241, 232, 0.58)', fontSize: 12, marginTop: 4 }}>{match.phase ?? 'Liguilla'}</div>
              </div>
              <div style={{ color: result?.color ?? 'rgba(245, 241, 232, 0.7)', fontSize: 12, textAlign: 'right' }}>
                {result ? `${result.score} · ${result.label}` : formatDate(match)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PublicCalendarTab({
  seasonId,
  teams,
  matches,
}: Pick<SecondaryTabProps, 'seasonId' | 'teams' | 'matches'>) {
  const [jornadaFilter, setJornadaFilter] = useState<number | 'all'>('all');
  const [teamFilter, setTeamFilter] = useState<number | 'all'>('all');
  const [viewFilter, setViewFilter] = useState<'upcoming' | 'all'>('upcoming');
  const isCoarsePointer = useIsCoarsePointer();
  const jornadas = useMemo(
    () => Array.from(new Set(matches.map((match) => match.jornada).filter((value): value is number => typeof value === 'number'))).sort((a, b) => a - b),
    [matches]
  );
  const activeTeams = useMemo(
    () => sortTeamsByName(teams.filter((team) => team.season_id === seasonId)),
    [seasonId, teams]
  );
  const teamOptions = useMemo(
    () => activeTeams.map((team) => ({ label: team.name, value: team.id })),
    [activeTeams]
  );
  const filtered = matches.filter((match) => {
    const matchesJornada = jornadaFilter === 'all' || match.jornada === jornadaFilter;
    const matchesTeam = teamFilter === 'all' || match.home_team_id === teamFilter || match.away_team_id === teamFilter;
    const matchesView = viewFilter === 'all' || !isPastCalendarMatch(match);
    return matchesJornada && matchesTeam && matchesView;
  });
  const grouped = filtered.reduce((result, match) => {
    const phase = match.phase || 'Fase Regular';
    const phaseMatches = result.get(phase) ?? [];
    phaseMatches.push(match);
    result.set(phase, phaseMatches);
    return result;
  }, new Map<string, MatchData[]>());
  const phaseOrder = ['Fase Regular', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Tercer Lugar', 'Final'];
  const phases = Array.from(grouped.keys()).sort((a, b) => phaseOrder.indexOf(a) - phaseOrder.indexOf(b));

  return (
    <SectionCard>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <Text className="premium-helper-text" style={{ display: 'block', marginBottom: 8 }}>Jornada:</Text>
          <Select
            className="premium-select"
            value={jornadaFilter}
            onChange={setJornadaFilter}
            style={{ width: 180 }}
            options={[
              { label: 'Todas las jornadas', value: 'all' },
              ...jornadas.map((jornada) => ({ label: `Jornada ${jornada}`, value: jornada })),
            ]}
          />
        </div>
        <div>
          <Text className="premium-helper-text" style={{ display: 'block', marginBottom: 8 }}>Equipo:</Text>
          <Select
            className="premium-select"
            value={teamFilter}
            onChange={setTeamFilter}
            style={{ width: 240 }}
            options={[
              { label: 'Todos los equipos', value: 'all' },
              ...teamOptions,
            ]}
            showSearch={!isCoarsePointer}
            filterOption={(input, option) => (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
            filterSort={sortSelectOptions}
          />
        </div>
        <div>
          <Text className="premium-helper-text" style={{ display: 'block', marginBottom: 8 }}>Vista:</Text>
          <Select
            className="premium-select"
            value={viewFilter}
            onChange={setViewFilter}
            style={{ width: 190 }}
            options={[
              { label: 'Próximos partidos', value: 'upcoming' },
              { label: 'Todos, con pasados', value: 'all' },
            ]}
          />
        </div>
      </div>

      {matches.length === 0 ? (
        <Text style={{ color: '#94a3b8', display: 'block', textAlign: 'center', padding: 32 }}>Sin partidos</Text>
      ) : filtered.length === 0 ? (
        <Text style={{ color: '#94a3b8', display: 'block', textAlign: 'center', padding: 32 }}>Sin partidos con estos filtros</Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {phases.map((phase) => (
            <div key={phase}>
              <div className="premium-section-label" style={{ marginBottom: 10 }}>
                {phase === 'Fase Regular' ? 'Temporada Regular' : phase}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(grouped.get(phase) ?? []).map((match) => (
                  <div key={match.id} className="premium-calendar-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Tag className={`premium-tag${phase !== 'Fase Regular' ? ' premium-tag--active' : ''}`}>J{match.jornada ?? '?'}</Tag>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <Text style={{ fontSize: 14, fontWeight: phase !== 'Fase Regular' ? 700 : 500, color: '#fff5dd' }}>
                        {match.home_team?.name ?? '?'} vs {match.away_team?.name ?? '?'}
                      </Text>
                      <div style={{ color: 'rgba(245, 241, 232, 0.58)', fontSize: 12, marginTop: 4 }}>
                        {formatDate(match)}
                      </div>
                    </div>
                    {match.status === 'Jugado' ? (
                      <Tag className="premium-tag premium-tag--active">{match.home_score} - {match.away_score}</Tag>
                    ) : (
                      <Tag className="premium-tag">{match.status ?? 'Programado'}</Tag>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
