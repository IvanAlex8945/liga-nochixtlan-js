'use client';

import { useState, useMemo } from 'react';
import { Tabs, Typography, Tag, Select, Button, FloatButton } from 'antd';
import { FilePdfOutlined, TrophyOutlined } from '@ant-design/icons';
import StandingsTable from './StandingsTable';
import TeamDetailModal from './TeamDetailModal';
import { calcularPosiciones, MatchForStandings, TeamStats } from '@/lib/standings';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { generateEligibilityPDF } from '@/lib/pdfReport';
dayjs.locale('es');

const { Title, Text } = Typography;

interface Season { id: number; name: string; category: string; year: number; is_active: boolean; }

interface HistoricalRecord {
  nombre: string;
  equipo: string;
  temporada: string;
  jornada: number | null;
  phase: string | null;
  puntos?: number;
  triples?: number;
}

interface Props {
  seasons: Season[];
  teams: any[];
  allPlayers: any[];
  allMatches: any[];
  allStats: any[];
}

export default function PublicPageClient({ seasons, teams, allPlayers, allMatches, allStats }: Props) {
  const [activeTab, setActiveTab] = useState('standings');
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(
    seasons.find((s) => s.is_active)?.id ?? seasons[0]?.id ?? null
  );
  const [selectedTeam, setSelectedTeam] = useState<TeamStats | null>(null);
  const [jornadaFilter, setJornadaFilter] = useState<number | 'all'>('all');

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId) ?? null;

  const categories = useMemo(() =>
    [...new Set(seasons.map((s) => s.category))].filter(Boolean),
    [seasons]);

  const seasonOptions = useMemo(() =>
    seasons.map((s) => ({ label: `${s.name}${s.is_active ? ' ✓' : ''}`, value: s.id, })),
    [seasons]);

  const seasonMatches = useMemo(() =>
    allMatches.filter((m) => m.season_id === selectedSeasonId),
    [allMatches, selectedSeasonId]);

  const standings = useMemo(() =>
    calcularPosiciones(
      seasonMatches.filter((m) => ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status ?? '')) as MatchForStandings[]
    ),
    [seasonMatches]);

  // Leaders for selected season
  const leaders = useMemo(() => {
    const matchIds = new Set(seasonMatches.map((m: any) => m.id));
    const map: Record<number, { id: number; nombre: string; puntos: number; triples: number; team_id: number }> = {};
    for (const s of allStats as any[]) {
      if (!matchIds.has(s.match_id) || !s.played) continue;
      const p = s.players;
      if (!p) continue;
      if (!map[p.id]) map[p.id] = { id: p.id, nombre: p.name, puntos: 0, triples: 0, team_id: s.team_id };
      map[p.id].puntos += s.points ?? 0;
      map[p.id].triples += s.triples ?? 0;
    }
    return Object.values(map).filter((l) => l.puntos > 0).sort((a, b) => b.puntos - a.puntos).slice(0, 10);
  }, [allStats, seasonMatches]);

  // Top tripleros for selected season
  const tripleros = useMemo(() => {
    const matchIds = new Set(seasonMatches.map((m: any) => m.id));
    const map: Record<number, { id: number; nombre: string; puntos: number; triples: number; team_id: number }> = {};
    for (const s of allStats as any[]) {
      if (!matchIds.has(s.match_id) || !s.played) continue;
      const p = s.players;
      if (!p || !s.triples) continue;
      if (!map[p.id]) map[p.id] = { id: p.id, nombre: p.name, puntos: 0, triples: 0, team_id: s.team_id };
      map[p.id].puntos += s.points ?? 0;
      map[p.id].triples += s.triples ?? 0;
    }
    return Object.values(map).filter((l) => l.triples > 0).sort((a, b) => b.triples - a.triples).slice(0, 10);
  }, [allStats, seasonMatches]);

  // Season-level record (best single game scorers and tripler for this season)
  const seasonRecords = useMemo(() => {
    const matchIds = new Set(seasonMatches.map((m: any) => m.id));
    let bestPuntos: { nombre: string; valor: number; equipo: string; jornada: number | null } | null = null;
    let bestTriples: { nombre: string; valor: number; equipo: string; jornada: number | null } | null = null;

    for (const s of allStats as any[]) {
      if (!matchIds.has(s.match_id) || !s.played) continue;
      const p = s.players;
      if (!p) continue;
      
      const team = teams.find((t) => t.id === s.team_id);
      const teamName = team?.name ?? '?';
      const m = (seasonMatches as any[]).find((match) => match.id === s.match_id);

      if (s.points && (!bestPuntos || s.points > bestPuntos.valor)) {
        bestPuntos = { nombre: p.name, valor: s.points, equipo: teamName, jornada: m?.jornada ?? null };
      }
      if (s.triples && (!bestTriples || s.triples > bestTriples.valor)) {
        bestTriples = { nombre: p.name, valor: s.triples, equipo: teamName, jornada: m?.jornada ?? null };
      }
    }
    return { bestPuntos, bestTriples };
  }, [allStats, seasonMatches, teams]);

  const jornadasDropdown = useMemo(() => {
    const js = new Set(seasonMatches.map((m: any) => m.jornada).filter(Boolean));
    return Array.from(js).sort((a, b) => a - b);
  }, [seasonMatches]);

  const handlePDF = () => {
    if (!selectedSeason) return;
    generateEligibilityPDF(standings, seasonMatches, selectedSeason.name, allStats as any[]);
  };

  return (
    <main style={{ minHeight: '100vh', background: '#141414', padding: '0 0 80px' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '24px 12px 0' }}>
        <div style={{ fontSize: 48, lineHeight: 1 }}>🏀</div>
        <Title level={2} style={{ color: '#FAAD14', margin: '8px 0 2px', letterSpacing: 1 }}>
          Liga Nochixtlán
        </Title>
        {selectedSeason ? (
          <Text style={{ color: '#888' }}>
            {selectedSeason.name} · <Tag color="orange">{selectedSeason.category}</Tag>
          </Text>
        ) : (
          <Text style={{ color: '#555' }}>Sin temporada seleccionada</Text>
        )}

        {/* Season selector + category tags */}
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Select
            value={selectedSeasonId}
            onChange={setSelectedSeasonId}
            options={seasonOptions}
            style={{ width: 260, textAlign: 'left' }}
            placeholder="Seleccionar temporada"
            showSearch
            filterOption={(input, opt) => (opt?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {categories.map((cat) => (
              <Tag
                key={cat}
                color={selectedSeason?.category === cat ? 'orange' : 'default'}
                style={{ cursor: 'pointer', fontSize: 12 }}
                onClick={() => {
                  const found = seasons.find((s) => s.category === cat && s.is_active) ?? seasons.find((s) => s.category === cat);
                  if (found) setSelectedSeasonId(found.id);
                }}
              >
                {cat}
              </Tag>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <a href="/admin" style={{ color: '#555', fontSize: 12, border: '1px solid #333', padding: '4px 12px', borderRadius: 4 }}>⚙️ Admin</a>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div style={{ maxWidth: 960, margin: '16px auto 0', padding: '0 12px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            {
              key: 'standings',
              label: '🏆 Posiciones',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                    <Button icon={<FilePdfOutlined />} onClick={handlePDF} disabled={standings.length === 0} style={{ fontSize: 12 }}>
                      Reporte Elegibilidad PDF
                    </Button>
                  </div>
                  {standings.length === 0 ? (
                    <Text style={{ color: '#555', display: 'block', textAlign: 'center', padding: 32 }}>Sin partidos registrados</Text>
                  ) : (
                    <>
                      <StandingsTable data={standings} onTeamClick={setSelectedTeam} />
                      <div style={{ marginTop: 8, color: '#444', fontSize: 11 }}>
                        Haz clic en un equipo para detalles · PJ/PG/PP/WO/PF/PC/DP · Victoria +3 · Derrota +1 · W.O. ganado +3 · W.O. perdido 0 · Doble W.O. = 0
                      </div>
                    </>
                  )}
                </div>
              ),
            },
            {
              key: 'leaders',
              label: '⭐ Líderes',
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* ── Top 10 Anotadores ────────────────────── */}
                  <div>
                    <Text style={{ color: '#FAAD14', fontWeight: 700, fontSize: 14, display: 'block', marginBottom: 8 }}>
                      🏀 Top 10 Anotadores — {selectedSeason?.name}
                    </Text>
                    <LeadersTable data={leaders} type="puntos" color="#FAAD14" teams={teams} />
                  </div>

                  {/* ── Top 10 Tripleros ─────────────────────── */}
                  <div>
                    <Text style={{ color: '#1677ff', fontWeight: 700, fontSize: 14, display: 'block', marginBottom: 8 }}>
                      🎯 Top 10 Tripleros — {selectedSeason?.name}
                    </Text>
                    <LeadersTable data={tripleros} type="triples" color="#1677ff" teams={teams} />
                  </div>

                  {/* ── Season Records (Bottom) ───────────────── */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
                    {seasonRecords.bestPuntos && (
                      <SmallRecordBadge
                        icon="🔥"
                        label="RÉCORD PUNTOS (TORNEO)"
                        color="#FAAD14"
                        jugador={seasonRecords.bestPuntos.nombre}
                        equipo={seasonRecords.bestPuntos.equipo}
                        valor={seasonRecords.bestPuntos.valor}
                        jornada={seasonRecords.bestPuntos.jornada}
                      />
                    )}
                    {seasonRecords.bestTriples && (
                      <SmallRecordBadge
                        icon="🎯"
                        label="RÉCORD TRIPLES (TORNEO)"
                        color="#1677ff"
                        jugador={seasonRecords.bestTriples.nombre}
                        equipo={seasonRecords.bestTriples.equipo}
                        valor={seasonRecords.bestTriples.valor}
                        jornada={seasonRecords.bestTriples.jornada}
                      />
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: 'team-stats',
              label: '📊 Estadísticas de Equipos',
              children: (
                <TeamStatsTab
                  seasonId={selectedSeasonId}
                  teams={teams}
                  allPlayers={allPlayers}
                  allStats={allStats}
                  seasonMatches={seasonMatches}
                />
              ),
            },
            {
              key: 'bracket',
              label: '🔥 Liguilla',
              children: (
                <LiguillaBracketTab seasonMatches={seasonMatches} />
              ),
            },
            {
              key: 'calendar',
              label: '📅 Calendario',
              children: (
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#888' }}>Filtrar:</Text>
                    <Select
                      value={jornadaFilter}
                      onChange={setJornadaFilter}
                      style={{ width: 160 }}
                      options={[
                        { label: 'Todas las jornadas', value: 'all' },
                        ...jornadasDropdown.map((j) => ({ label: `Jornada ${j}`, value: j }))
                      ]}
                    />
                  </div>

                  {seasonMatches.length === 0 ? (
                    <Text style={{ color: '#555', display: 'block', textAlign: 'center', padding: 32 }}>Sin partidos</Text>
                  ) : (
                    <CalendarList matches={seasonMatches} jornadaFilter={jornadaFilter} />
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {selectedTeam && selectedSeason && (
        <TeamDetailModal
          team={selectedTeam}
          seasonId={selectedSeason.id}
          seasonName={selectedSeason.name}
          seasonMatches={seasonMatches}
          allStats={allStats}
          onClose={() => setSelectedTeam(null)}
        />
      )}

      <FloatButton icon={<FilePdfOutlined />} tooltip="Reporte Elegibilidad PDF" style={{ bottom: 24, right: 24 }} onClick={handlePDF} />
    </main>
  );
}

// ── Sub-components ──────────────────────────────────────────

function SmallRecordBadge({ icon, label, color, jugador, equipo, valor, jornada }: { icon: string; label: string; color: string; jugador: string; equipo: string; valor: number; jornada: number | null }) {
  return (
    <div style={{
      flex: '1 1 240px', background: '#111', border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`,
      borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <Text style={{ color, fontWeight: 700, fontSize: 10, letterSpacing: 0.5 }}>{label}</Text>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{jugador}</div>
          <div style={{ color: '#666', fontSize: 11 }}>{equipo} • J{jornada ?? '?'}</div>
        </div>
        <div style={{ color, fontWeight: 800, fontSize: 20, lineHeight: 1 }}>{valor}</div>
      </div>
    </div>
  );
}

function LeadersTable({ data, type, color, teams }: { data: any[]; type: 'puntos' | 'triples'; color: string; teams: any[] }) {
  if (data.length === 0) {
    return <Text style={{ color: '#555' }}>Sin estadísticas registradas</Text>;
  }

  return (
    <div style={{ overflowX: 'auto', background: '#111', borderRadius: 8, border: '1px solid #222' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
            <th style={thS}>#</th>
            <th style={{ ...thS, textAlign: 'left' }}>Jugador</th>
            <th style={{ ...thS, textAlign: 'left' }}>Equipo</th>
            {type === 'puntos' ? (
              <th style={thS}>Pts</th>
            ) : (
              <>
                <th style={thS}>3PT</th>
                <th style={thS}>Pts (Eq.)</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((l, i) => {
            const team = teams.find((t) => t.id === l.team_id);
            return (
              <tr key={l.id ?? i} style={{ borderBottom: '1px solid #1a1a1a', background: i === 0 ? `${color}0d` : undefined }}>
                <td style={tdS}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}°`}</td>
                <td style={{ ...tdS, textAlign: 'left', fontWeight: 500 }}>{l.nombre}</td>
                <td style={{ ...tdS, textAlign: 'left', color: '#888', fontSize: 11 }}>{team?.name ?? '?'}</td>
                {type === 'puntos' ? (
                  <td style={tdS}><span style={{ color, fontWeight: 700 }}>{l.puntos}</span></td>
                ) : (
                  <>
                    <td style={tdS}><span style={{ color, fontWeight: 700 }}>{l.triples}</span></td>
                    <td style={tdS}><span style={{ color: '#888' }}>{Math.floor((l.triples ?? 0) * 3)}</span></td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamStatsTab({ seasonId, teams, allPlayers, allStats, seasonMatches }: { seasonId: number | null; teams: any[]; allPlayers: any[]; allStats: any[]; seasonMatches: any[] }) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'Fase Regular' | 'Liguilla'>('all');

  const activeTeams = useMemo(() => teams.filter((t) => t.season_id === seasonId), [teams, seasonId]);

  const filteredMatches = useMemo(() => {
    if (phaseFilter === 'all') return seasonMatches;
    // Default null phase to 'Fase Regular'
    if (phaseFilter === 'Fase Regular') return seasonMatches.filter((m) => !m.phase || m.phase === 'Fase Regular');
    // For Liguilla, we include everything that is not Fase Regular
    return seasonMatches.filter((m) => m.phase && m.phase !== 'Fase Regular');
  }, [seasonMatches, phaseFilter]);

  // Aggregate stats for the selected team across filtered matches up to the latest jornada
  const teamStats = useMemo(() => {
    if (!selectedTeamId) return [];
    
    // Start with ALL players associated with the team
    const byPlayer: Record<number, { id: number; number: string | null; nombre: string; triples: number; puntos: number }> = {};
    for (const p of allPlayers) {
      if (p.team_id === selectedTeamId) {
        byPlayer[p.id] = { id: p.id, number: p.number, nombre: p.name, triples: 0, puntos: 0 };
      }
    }

    const matchIds = new Set(filteredMatches.map((m: any) => m.id));

    for (const s of allStats as any[]) {
      if (!matchIds.has(s.match_id) || s.team_id !== selectedTeamId || !s.played) continue;
      const p = s.players;
      if (!p) continue;
      if (!byPlayer[p.id]) byPlayer[p.id] = { id: p.id, number: null, nombre: p.name, triples: 0, puntos: 0 };
      byPlayer[p.id].triples += s.triples ?? 0;
      byPlayer[p.id].puntos += s.points ?? 0;
    }
    return Object.values(byPlayer).sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre));
  }, [allPlayers, allStats, filteredMatches, selectedTeamId]);

  if (!seasonId) return <Text style={{ color: '#555' }}>Selecciona una temporada arriba.</Text>;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}>
          <Text style={{ color: '#888', display: 'block', marginBottom: 6 }}>Selecciona un equipo para ver sus estadísticas acumuladas:</Text>
          <Select
            style={{ width: '100%', maxWidth: 400 }}
            placeholder="-- Seleccionar equipo --"
            value={selectedTeamId}
            onChange={setSelectedTeamId}
            options={activeTeams.map((t) => ({ label: t.name, value: t.id }))}
            showSearch
            filterOption={(input, opt) => (opt?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
          />
        </div>
        <div style={{ flex: '0 1 200px' }}>
          <Text style={{ color: '#888', display: 'block', marginBottom: 6 }}>Fase:</Text>
          <Select
            style={{ width: '100%' }}
            value={phaseFilter}
            onChange={setPhaseFilter}
            options={[
              { label: 'Totales (Toda la temporada)', value: 'all' },
              { label: 'Fase Regular', value: 'Fase Regular' },
              { label: 'Liguilla / Play-offs', value: 'Liguilla' },
            ]}
          />
        </div>
      </div>

      {selectedTeamId && (
        <>
          {teamStats.length === 0 ? (
            <Text style={{ color: '#555' }}>Sin estadísticas registradas para este equipo.</Text>
          ) : (
            <div style={{ overflowX: 'auto', background: '#111', borderRadius: 8, border: '1px solid #222' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                    <th style={{ ...thS, textAlign: 'left' }}># Jugador</th>
                    <th style={{ ...thS, textAlign: 'left' }}>Nombre</th>
                    <th style={{ ...thS, textAlign: 'right' }}>Triples Realizados</th>
                    <th style={{ ...thS, textAlign: 'right' }}>Puntos Llevados</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={{ ...tdS, textAlign: 'left', color: '#666', width: 40 }}>{s.number ? `#${s.number}` : '-'}</td>
                      <td style={{ ...tdS, textAlign: 'left', fontWeight: 500 }}>{s.nombre}</td>
                      <td style={{ ...tdS, textAlign: 'right', color: s.triples > 0 ? '#1677ff' : '#444', fontWeight: s.triples > 0 ? 700 : 400 }}>{s.triples}</td>
                      <td style={{ ...tdS, textAlign: 'right', color: s.puntos > 0 ? '#FAAD14' : '#444', fontWeight: s.puntos > 0 ? 700 : 400 }}>{s.puntos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const thS: React.CSSProperties = { padding: '7px 10px', color: '#FAAD14', fontWeight: 600, fontSize: 11, textAlign: 'center' };
const tdS: React.CSSProperties = { padding: '7px 10px', fontSize: 13, textAlign: 'center', color: '#fff' };

function CalendarList({ matches, jornadaFilter }: { matches: any[]; jornadaFilter: number | 'all' }) {
  const filtered = matches.filter((m) => jornadaFilter === 'all' || m.jornada === jornadaFilter);

  // Group by phase
  const grouped: Record<string, any[]> = {};
  filtered.forEach(m => {
    const p = m.phase || 'Fase Regular';
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(m);
  });

  // Phases rendering order: Regular, Octavos, Cuartos, Semis, Tercer, Final
  const phaseOrder = ['Fase Regular', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Tercer Lugar', 'Final'];
  const sortedPhases = Object.keys(grouped).sort((a, b) => phaseOrder.indexOf(a) - phaseOrder.indexOf(b));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {sortedPhases.map((phase) => (
        <div key={phase}>
          {phase !== 'Fase Regular' && (
            <div style={{ borderBottom: '1px solid #333', marginBottom: 10, paddingBottom: 4 }}>
              <Text style={{ color: '#FAAD14', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                🏆 {phase}
              </Text>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grouped[phase].map((m) => (
              <div key={m.id} style={{
                background: phase !== 'Fase Regular' ? '#1f1406' : '#1a1a1a', 
                border: phase !== 'Fase Regular' ? '1px solid #d46b0855' : '1px solid #2a2a2a', 
                borderRadius: 8,
                padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              }}>
                <Tag color={phase !== 'Fase Regular' ? 'gold' : '#333'} style={{ color: phase !== 'Fase Regular' ? '#000' : '#888', fontSize: 11 }}>J{m.jornada ?? '?'}</Tag>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <Text style={{ fontSize: 13, fontWeight: phase !== 'Fase Regular' ? 600 : 400 }}>
                    {m.home_team?.name ?? '?'} vs {m.away_team?.name ?? '?'}
                  </Text>
                  <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                    {m.scheduled_date ? dayjs(m.scheduled_date).format('DD MMM') : ''}
                    {m.time_str && ` • ${m.time_str} hrs`}
                    {m.court && ` • ${m.court}`}
                  </div>
                </div>
                {m.status === 'Jugado'
                  ? <Tag color="green">{m.home_score} – {m.away_score}</Tag>
                  : m.status?.startsWith('WO') || m.status?.startsWith('W')
                    ? <Tag color="orange">{m.status}</Tag>
                    : <Tag color="default" style={{ color: '#888' }}>
                        {m.scheduled_date ? dayjs(m.scheduled_date).format('DD MMM') : 'Programado'}
                      </Tag>
                }
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Liguilla Bracket Visualizer ─────────────────────────────────

function LiguillaBracketTab({ seasonMatches }: { seasonMatches: any[] }) {
  const liguillaMatches = useMemo(() => {
    return seasonMatches.filter((m) => m.phase && m.phase !== 'Fase Regular');
  }, [seasonMatches]);

  if (liguillaMatches.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 48, filter: 'grayscale(1)', opacity: 0.5 }}>🏆</div>
        <Text style={{ color: '#555', display: 'block', marginTop: 12 }}>Aún no hay encuentros de Liguilla definidos para esta temporada.</Text>
      </div>
    );
  }

  const cuartos = liguillaMatches.filter((m) => m.phase === 'Cuartos de Final' || m.phase === 'Octavos de Final');
  const semis = liguillaMatches.filter((m) => m.phase === 'Semifinal');
  const final = liguillaMatches.filter((m) => m.phase === 'Final');
  const tercero = liguillaMatches.filter((m) => m.phase === 'Tercer Lugar');

  const BracketColumn = ({ title, matches }: { title: string; matches: any[] }) => (
    <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #222', paddingBottom: 8, marginBottom: 8 }}>
        <Text style={{ color: '#FAAD14', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Text>
      </div>
      {matches.length === 0 ? (
        <Text style={{ color: '#444', textAlign: 'center', fontSize: 12, marginTop: 20 }}>Por definir</Text>
      ) : (
        matches.map((m) => <MatchBox key={m.id} match={m} />)
      )}
    </div>
  );

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 20 }}>
      {/* Horizontal container simulating an NBA Playoff bracket structure */}
      <div style={{ display: 'flex', gap: 24, minWidth: 800, padding: '10px 0', alignItems: 'stretch' }}>
        <BracketColumn title="Cuartos de Final" matches={cuartos} />
        <BracketColumn title="Semifinales" matches={semis} />
        <BracketColumn title="Gran Final" matches={[...final, ...tercero]} />
      </div>
    </div>
  );
}

function MatchBox({ match }: { match: any }) {
  const isJugado = ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(match.status);
  const homeWin = isJugado && (match.home_score ?? 0) > (match.away_score ?? 0) || match.status === 'WO Visitante';
  const awayWin = isJugado && (match.away_score ?? 0) > (match.home_score ?? 0) || match.status === 'WO Local';

  return (
    <div style={{
      background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', position: 'relative',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    }}>
      {/* Etiqueta superior */}
      <div style={{ background: '#0a0a0a', padding: '4px 8px', fontSize: 10, color: '#888', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a1a1a' }}>
        <span>Jornada {match.jornada}</span>
        {match.phase === 'Tercer Lugar' && <span style={{ color: '#1677ff', fontWeight: 700 }}>3er Lugar</span>}
        {match.phase === 'Final' && <span style={{ color: '#FAAD14', fontWeight: 700 }}>Final</span>}
      </div>
      
      {/* Equipo Local */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #1a1a1a', background: homeWin ? '#FAAD1411' : 'transparent' }}>
        <Text style={{ color: homeWin ? '#fff' : '#aaa', fontWeight: homeWin ? 700 : 400 }}>{match.home_team?.name ?? 'Por definir'}</Text>
        <Text style={{ color: homeWin ? '#FAAD14' : '#666', fontWeight: 700 }}>{isJugado ? (match.status === 'WO Doble' ? 'W' : match.home_score) : '-'}</Text>
      </div>

      {/* Equipo Visitante */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: awayWin ? '#FAAD1411' : 'transparent' }}>
        <Text style={{ color: awayWin ? '#fff' : '#aaa', fontWeight: awayWin ? 700 : 400 }}>{match.away_team?.name ?? 'Por definir'}</Text>
        <Text style={{ color: awayWin ? '#FAAD14' : '#666', fontWeight: 700 }}>{isJugado ? (match.status === 'WO Doble' ? 'W' : match.away_score) : '-'}</Text>
      </div>
    </div>
  );
}
