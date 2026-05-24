'use client';

import { startTransition, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Tabs, Typography, Tag, Select, Button, FloatButton } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import StandingsTable from './StandingsTable';
import TeamDetailModal from './TeamDetailModal';
import { calcularPosiciones, MatchForStandings, TeamStats } from '@/lib/standings';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { generateEligibilityPDF } from '@/lib/pdfReport';
import GameDayBillboard from './GameDayBillboard';
import { LiguillaBracketTab } from './LiguillaBracket';

dayjs.locale('es');

const { Title, Text } = Typography;

interface Season { id: number; name: string; category: string; year: number; is_active: boolean; }

export interface TeamData {
  id: number;
  season_id?: number | null;
  name: string;
}

export interface PlayerData {
  id: number;
  team_id?: number;
  number?: string | null;
  name: string;
}

export interface MatchData {
  id: number;
  season_id?: number | null;
  jornada?: number | null;
  phase?: string | null;
  status?: string | null;
  home_team_id?: number;
  away_team_id?: number;
  home_score?: number | null;
  away_score?: number | null;
  home_team?: TeamData;
  away_team?: TeamData;
  scheduled_date?: string | null;
  time_str?: string | null;
  court?: string | null;
}

export interface PlayerStats {
  match_id: number;
  team_id: number;
  played: boolean;
  points?: number | null;
  triples?: number | null;
  players?: PlayerData | null;
}

interface Props {
  seasons: Season[];
  teams: TeamData[];
  allPlayers: PlayerData[];
  allMatches: MatchData[];
  allStats: PlayerStats[];
}

const sectionGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 16,
};

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
    seasons.map((s) => ({ label: `${s.name}${s.is_active ? ' ✓' : ''}`, value: s.id })),
    [seasons]);

  const seasonMatches = useMemo(() =>
    allMatches.filter((m) => m.season_id === selectedSeasonId),
    [allMatches, selectedSeasonId]);

  const regularMatches = useMemo(() =>
    seasonMatches.filter((m) => !m.phase || m.phase === 'Fase Regular'),
    [seasonMatches]);

  const standings = useMemo(() =>
    calcularPosiciones(
      regularMatches.filter((m) =>
        ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status ?? '')
      ) as MatchForStandings[]
    ),
    [regularMatches]);

  const leaders = useMemo(() => {
    const matchIds = new Set(regularMatches.map((m) => m.id));
    const map: Record<number, { id: number; nombre: string; puntos: number; triples: number; team_id: number }> = {};
    for (const s of allStats) {
      if (!matchIds.has(s.match_id) || !s.played) continue;
      const p = s.players;
      if (!p) continue;
      if (!map[p.id]) map[p.id] = { id: p.id, nombre: p.name, puntos: 0, triples: 0, team_id: s.team_id };
      map[p.id].puntos += s.points ?? 0;
      map[p.id].triples += s.triples ?? 0;
    }
    return Object.values(map).filter((l) => l.puntos > 0).sort((a, b) => b.puntos - a.puntos).slice(0, 10);
  }, [allStats, regularMatches]);

  const tripleros = useMemo(() => {
    const matchIds = new Set(regularMatches.map((m) => m.id));
    const map: Record<number, { id: number; nombre: string; puntos: number; triples: number; team_id: number }> = {};
    for (const s of allStats) {
      if (!matchIds.has(s.match_id) || !s.played) continue;
      const p = s.players;
      if (!p || !s.triples) continue;
      if (!map[p.id]) map[p.id] = { id: p.id, nombre: p.name, puntos: 0, triples: 0, team_id: s.team_id };
      map[p.id].puntos += s.points ?? 0;
      map[p.id].triples += s.triples ?? 0;
    }
    return Object.values(map).filter((l) => l.triples > 0).sort((a, b) => b.triples - a.triples).slice(0, 10);
  }, [allStats, regularMatches]);

  const seasonRecords = useMemo(() => {
    const matchIds = new Set(regularMatches.map((m) => m.id));
    let bestPuntos: { nombre: string; valor: number; equipo: string; jornada: number | null } | null = null;
    let bestTriples: { nombre: string; valor: number; equipo: string; jornada: number | null } | null = null;

    for (const s of allStats) {
      if (!matchIds.has(s.match_id) || !s.played) continue;
      const p = s.players;
      if (!p) continue;

      const team = teams.find((t) => t.id === s.team_id);
      const teamName = team?.name ?? '?';
      const m = regularMatches.find((match) => match.id === s.match_id);

      if (s.points && (!bestPuntos || s.points > bestPuntos.valor)) {
        bestPuntos = { nombre: p.name, valor: s.points, equipo: teamName, jornada: m?.jornada ?? null };
      }
      if (s.triples && (!bestTriples || s.triples > bestTriples.valor)) {
        bestTriples = { nombre: p.name, valor: s.triples, equipo: teamName, jornada: m?.jornada ?? null };
      }
    }
    return { bestPuntos, bestTriples };
  }, [allStats, regularMatches, teams]);

  const jornadasDropdown = useMemo(() => {
    const js = new Set(seasonMatches.map((m) => m.jornada).filter(Boolean));
    return Array.from(js).sort((a, b) => (a as number) - (b as number));
  }, [seasonMatches]);

  const handlePDF = () => {
    if (!selectedSeason) return;
    generateEligibilityPDF(
      standings,
      seasonMatches as unknown as Record<string, unknown>[],
      selectedSeason.name,
      allStats as unknown as Parameters<typeof generateEligibilityPDF>[3]
    );
  };

  return (
    <main className="public-glass-shell" style={{ minHeight: '100vh', padding: '0 0 80px' }}>
      <GoldParticles />
      <div className="premium-orb premium-orb--left" />
      <div className="premium-orb premium-orb--right" />
      <div className="premium-orb premium-orb--bottom" />

      <div className="public-glass-header" style={{ textAlign: 'center', padding: '28px 16px 22px' }}>
        <div className="premium-hero-mark">Liga Municipal de Basquetbol</div>
        <Title className="premium-title" level={1} style={{ color: '#fff5d4', margin: '18px 0 4px', fontSize: 'clamp(2.6rem, 7vw, 4.8rem)', lineHeight: 0.9 }}>
          Liga Nochixtlan
        </Title>

        {selectedSeason ? (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Tag className="premium-tag premium-tag--active">{selectedSeason.name}</Tag>
            <Tag className="premium-tag">{selectedSeason.category}</Tag>
            <Tag className="premium-tag">{seasonMatches.length} partidos</Tag>
          </div>
        ) : (
          <Text style={{ color: '#7e7c76', display: 'block', marginTop: 16 }}>Sin temporada seleccionada</Text>
        )}

        <div className="premium-section-card" style={{ marginTop: 22, padding: 18, textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="premium-section-label" style={{ marginBottom: 0 }}>Temporada</div>
            <a
              href="/admin"
              className="premium-button"
              style={{ textDecoration: 'none', padding: '12px 16px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700 }}
            >
              ⚙ Panel Admin
            </a>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', alignItems: 'stretch' }}>
            <Select
              className="premium-select"
              value={selectedSeasonId}
              onChange={(value) => startTransition(() => setSelectedSeasonId(value))}
              options={seasonOptions}
              style={{ width: 280, textAlign: 'left' }}
              placeholder="Seleccionar temporada"
              showSearch
              filterOption={(input, opt) => (opt?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {categories.map((cat) => (
                <Tag
                  key={cat}
                  className={`premium-tag${selectedSeason?.category === cat ? ' premium-tag--active' : ''}`}
                  style={{ cursor: 'pointer', marginInlineEnd: 0 }}
                  onClick={() => {
                    const found = seasons.find((s) => s.category === cat && s.is_active) ?? seasons.find((s) => s.category === cat);
                    if (found) startTransition(() => setSelectedSeasonId(found.id));
                  }}
                >
                  {cat}
                </Tag>
              ))}
            </div>
          </div>
        </div>
      </div>

      <GameDayBillboard seasonMatches={seasonMatches as never[]} />

      <div style={{ maxWidth: 1120, margin: '18px auto 0', padding: '0 12px' }}>
        <Tabs
          className="public-glass-tabs"
          activeKey={activeTab}
          onChange={(key) => startTransition(() => setActiveTab(key))}
          centered
          items={[
            {
              key: 'standings',
              label: <TabLabel icon="🏆" text="Posiciones" />,
              children: (
                <GlassSectionCard
                  action={(
                    <Button icon={<FilePdfOutlined />} onClick={handlePDF} disabled={standings.length === 0} className="premium-button">
                      Reporte PDF
                    </Button>
                  )}
                >
                  <MobileLandscapeHint />
                  {standings.length === 0 ? (
                    <Text style={{ color: '#7e7c76', display: 'block', textAlign: 'center', padding: 32 }}>Sin partidos registrados</Text>
                  ) : (
                    <>
                      <StandingsTable data={standings} onTeamClick={setSelectedTeam} />
                    </>
                  )}
                </GlassSectionCard>
              ),
            },
            {
              key: 'leaders',
              label: <TabLabel icon="⭐" text="Lideres" />,
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <GlassSectionCard
                  >
                    <div style={sectionGridStyle}>
                      <div>
                        <div className="premium-section-label" style={{ marginBottom: 10 }}>🏀 Top Anotadores</div>
                        <LeadersTable data={leaders} type="puntos" color="#FAAD14" teams={teams} />
                      </div>
                      <div>
                        <div className="premium-section-label" style={{ marginBottom: 10 }}>🎯 Top Tripleros</div>
                        <LeadersTable data={tripleros} type="triples" color="#6fb5ff" teams={teams} />
                      </div>
                    </div>
                  </GlassSectionCard>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {seasonRecords.bestPuntos && (
                      <SmallRecordBadge
                        icon="🔥"
                        label="Record de puntos"
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
                        label="Record de triples"
                        color="#6fb5ff"
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
              label: <TabLabel icon="📊" text="Estadisticas" />,
              children: (
                <GlassSectionCard>
                  <TeamStatsTab
                    seasonId={selectedSeasonId}
                    teams={teams}
                    allPlayers={allPlayers}
                    allStats={allStats}
                    seasonMatches={seasonMatches}
                  />
                </GlassSectionCard>
              ),
            },
            {
              key: 'bracket',
              label: <TabLabel icon="🔥" text="Liguilla" />,
              children: (
                <GlassSectionCard>
                  <LiguillaBracketTab seasonMatches={seasonMatches as unknown as Parameters<typeof LiguillaBracketTab>[0]['seasonMatches']} />
                </GlassSectionCard>
              ),
            },
            {
              key: 'calendar',
              label: <TabLabel icon="📅" text="Calendario" />,
              children: (
                <GlassSectionCard>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text className="premium-helper-text">Filtrar por jornada:</Text>
                    <Select
                      className="premium-select"
                      value={jornadaFilter}
                      onChange={(value) => startTransition(() => setJornadaFilter(value))}
                      style={{ width: 180 }}
                      options={[
                        { label: 'Todas las jornadas', value: 'all' },
                        ...jornadasDropdown.map((j) => ({ label: `Jornada ${j}`, value: j })),
                      ]}
                    />
                  </div>

                  {seasonMatches.length === 0 ? (
                    <Text style={{ color: '#7e7c76', display: 'block', textAlign: 'center', padding: 32 }}>Sin partidos</Text>
                  ) : (
                    <CalendarList matches={seasonMatches} jornadaFilter={jornadaFilter} />
                  )}
                </GlassSectionCard>
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

      <FloatButton
        icon={<FilePdfOutlined />}
        tooltip="Reporte Elegibilidad PDF"
        style={{ bottom: 24, right: 24, background: '#f7d774' }}
        onClick={handlePDF}
      />
    </main>
  );
}

function TabLabel({ icon, text }: { icon: string; text: string }) {
  return <span style={{ fontWeight: 700 }}>{icon} {text}</span>;
}

function GlassSectionCard({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="premium-section-card" style={{ padding: 20 }}>
      {action ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function MobileLandscapeHint() {
  return (
    <div className="mobile-landscape-hint" role="note" aria-label="Sugerencia de visualizacion">
      <span className="mobile-landscape-hint__icon" aria-hidden="true">↻</span>
      <span>Para una mejor visualizacion en celular, gira tu dispositivo a horizontal.</span>
    </div>
  );
}

function GoldParticles() {
  const particles = [
    { left: '4%', top: '14%', size: 5, delay: '0s', duration: '10s' },
    { left: '8%', top: '52%', size: 4, delay: '1.3s', duration: '12s' },
    { left: '12%', top: '28%', size: 6, delay: '2.1s', duration: '11s' },
    { left: '16%', top: '72%', size: 4, delay: '0.6s', duration: '9s' },
    { left: '22%', top: '18%', size: 5, delay: '1.8s', duration: '10s' },
    { left: '27%', top: '44%', size: 7, delay: '0.9s', duration: '13s' },
    { left: '33%', top: '66%', size: 4, delay: '2.8s', duration: '12s' },
    { left: '39%', top: '24%', size: 5, delay: '1.1s', duration: '11s' },
    { left: '45%', top: '56%', size: 8, delay: '2.5s', duration: '14s' },
    { left: '51%', top: '12%', size: 5, delay: '0.4s', duration: '10s' },
    { left: '57%', top: '36%', size: 6, delay: '1.7s', duration: '12s' },
    { left: '63%', top: '74%', size: 4, delay: '2.2s', duration: '10s' },
    { left: '69%', top: '22%', size: 5, delay: '0.8s', duration: '11s' },
    { left: '74%', top: '48%', size: 7, delay: '2.9s', duration: '13s' },
    { left: '79%', top: '66%', size: 4, delay: '1.5s', duration: '9s' },
    { left: '84%', top: '16%', size: 6, delay: '2.4s', duration: '12s' },
    { left: '88%', top: '58%', size: 5, delay: '0.7s', duration: '11s' },
    { left: '93%', top: '34%', size: 7, delay: '1.9s', duration: '13s' },
    { left: '96%', top: '78%', size: 4, delay: '2.7s', duration: '10s' },
  ];

  return (
    <div className="gold-particles" aria-hidden="true">
      {particles.map((particle, index) => (
        <span
          key={index}
          className="gold-particle"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}
    </div>
  );
}

function SmallRecordBadge({
  icon,
  label,
  color,
  jugador,
  equipo,
  valor,
  jornada,
}: {
  icon: string;
  label: string;
  color: string;
  jugador: string;
  equipo: string;
  valor: number;
  jornada: number | null;
}) {
  return (
    <div className="premium-record-badge" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <Text style={{ color, fontWeight: 800, fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase' }}>{label}</Text>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10, gap: 10 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{jugador}</div>
          <div style={{ color: 'rgba(245, 241, 232, 0.58)', fontSize: 12 }}>{equipo} · J{jornada ?? '?'}</div>
        </div>
        <div className="premium-stat-pill" style={{ color }}>{valor}</div>
      </div>
    </div>
  );
}

function LeadersTable({
  data,
  type,
  color,
  teams,
}: {
  data: { id: number; nombre: string; team_id: number; puntos: number; triples: number }[];
  type: 'puntos' | 'triples';
  color: string;
  teams: TeamData[];
}) {
  if (data.length === 0) {
    return <Text style={{ color: '#7e7c76' }}>Sin estadisticas registradas</Text>;
  }

  return (
    <div className="premium-table-shell">
      <div style={{ overflowX: 'auto' }}>
        <table className="premium-data-table">
          <thead>
            <tr>
              <th style={thS}>#</th>
              <th style={{ ...thS, textAlign: 'left' }}>Jugador</th>
              <th style={{ ...thS, textAlign: 'left' }}>Equipo</th>
              {type === 'puntos' ? (
                <th style={thS}>Puntos</th>
              ) : (
                <>
                  <th style={thS}>3PT</th>
                  <th style={thS}>Pts Eq.</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((l, i) => {
              const team = teams.find((t) => t.id === l.team_id);
              const isTop = i < 3;
              return (
                <tr key={l.id ?? i} style={isTop ? { background: `${color}12` } : undefined}>
                  <td style={tdS}>
                    <span className="premium-stat-pill" style={{ color: isTop ? color : '#efe7cf', minWidth: 54 }}>
                      {i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : `${i + 1}`}
                    </span>
                  </td>
                  <td style={{ ...tdS, textAlign: 'left', fontWeight: 600 }}>{l.nombre}</td>
                  <td style={{ ...tdS, textAlign: 'left', color: 'rgba(245, 241, 232, 0.62)', fontSize: 12 }}>{team?.name ?? '?'}</td>
                  {type === 'puntos' ? (
                    <td style={tdS}><span className="premium-stat-pill" style={{ color }}>{l.puntos}</span></td>
                  ) : (
                    <>
                      <td style={tdS}><span className="premium-stat-pill" style={{ color }}>{l.triples}</span></td>
                      <td style={tdS}><span style={{ color: 'rgba(245, 241, 232, 0.64)' }}>{Math.floor((l.triples ?? 0) * 3)}</span></td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamStatsTab({
  seasonId,
  teams,
  allPlayers,
  allStats,
  seasonMatches,
}: {
  seasonId: number | null;
  teams: TeamData[];
  allPlayers: PlayerData[];
  allStats: PlayerStats[];
  seasonMatches: MatchData[];
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'Fase Regular' | 'Liguilla'>('Fase Regular');

  const activeTeams = useMemo(() => teams.filter((t) => t.season_id === seasonId), [teams, seasonId]);

  const filteredMatches = useMemo(() => {
    if (phaseFilter === 'all') return seasonMatches;
    if (phaseFilter === 'Fase Regular') return seasonMatches.filter((m) => !m.phase || m.phase === 'Fase Regular');
    return seasonMatches.filter((m) => m.phase && m.phase !== 'Fase Regular');
  }, [seasonMatches, phaseFilter]);

  const teamStats = useMemo(() => {
    if (!selectedTeamId) return [];

    const byPlayer: Record<number, { id: number; number: string | null; nombre: string; triples: number; puntos: number }> = {};
    for (const p of allPlayers) {
      if (p.team_id === selectedTeamId) {
        byPlayer[p.id] = { id: p.id, number: p.number ?? null, nombre: p.name, triples: 0, puntos: 0 };
      }
    }

    const matchIds = new Set(filteredMatches.map((m) => m.id));

    for (const s of allStats) {
      if (!matchIds.has(s.match_id) || s.team_id !== selectedTeamId || !s.played) continue;
      const p = s.players;
      if (!p) continue;
      if (!byPlayer[p.id]) byPlayer[p.id] = { id: p.id, number: null, nombre: p.name, triples: 0, puntos: 0 };
      byPlayer[p.id].triples += s.triples ?? 0;
      byPlayer[p.id].puntos += s.points ?? 0;
    }
    return Object.values(byPlayer).sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre));
  }, [allPlayers, allStats, filteredMatches, selectedTeamId]);

  if (!seasonId) return <Text style={{ color: '#7e7c76' }}>Selecciona una temporada arriba.</Text>;

  return (
    <div>
      <div style={{ marginBottom: 18, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}>
          <Text className="premium-helper-text" style={{ display: 'block', marginBottom: 8 }}>Selecciona un equipo:</Text>
          <Select
            className="premium-select"
            style={{ width: '100%', maxWidth: 420 }}
            placeholder="Seleccionar equipo"
            value={selectedTeamId}
            onChange={(v) => setSelectedTeamId(v as number | null)}
            options={activeTeams.map((t) => ({ label: t.name, value: t.id }))}
            showSearch
            filterOption={(input, opt) => (opt?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
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
        <>
          {teamStats.length === 0 ? (
            <Text style={{ color: '#7e7c76' }}>Sin estadisticas registradas para este equipo.</Text>
          ) : (
            <div className="premium-table-shell">
              <div style={{ overflowX: 'auto' }}>
                <table className="premium-data-table">
                  <thead>
                    <tr>
                      <th style={{ ...thS, textAlign: 'left' }}>Jugador</th>
                      <th style={{ ...thS, textAlign: 'left' }}>Nombre</th>
                      <th style={{ ...thS, textAlign: 'right' }}>Triples</th>
                      <th style={{ ...thS, textAlign: 'right' }}>Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamStats.map((s) => (
                      <tr key={s.id}>
                        <td style={{ ...tdS, textAlign: 'left', color: 'rgba(245, 241, 232, 0.58)', width: 72 }}>{s.number ? `#${s.number}` : '-'}</td>
                        <td style={{ ...tdS, textAlign: 'left', fontWeight: 600 }}>{s.nombre}</td>
                        <td style={{ ...tdS, textAlign: 'right' }}>
                          <span className="premium-stat-pill" style={{ color: s.triples > 0 ? '#6fb5ff' : '#6d7480' }}>{s.triples}</span>
                        </td>
                        <td style={{ ...tdS, textAlign: 'right' }}>
                          <span className="premium-stat-pill" style={{ color: s.puntos > 0 ? '#f7d774' : '#6d7480' }}>{s.puntos}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const thS: CSSProperties = { textAlign: 'center' };
const tdS: CSSProperties = { textAlign: 'center' };

function CalendarList({ matches, jornadaFilter }: { matches: MatchData[]; jornadaFilter: number | 'all' }) {
  const filtered = matches.filter((m) => jornadaFilter === 'all' || m.jornada === jornadaFilter);

  const grouped: Record<string, MatchData[]> = {};
  filtered.forEach((m) => {
    const p = m.phase || 'Fase Regular';
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(m);
  });

  const phaseOrder = ['Fase Regular', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Tercer Lugar', 'Final'];
  const sortedPhases = Object.keys(grouped).sort((a, b) => phaseOrder.indexOf(a) - phaseOrder.indexOf(b));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {sortedPhases.map((phase) => (
        <div key={phase}>
          <div style={{ marginBottom: 10 }}>
            <div className="premium-section-label">{phase === 'Fase Regular' ? 'Temporada Regular' : phase}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {grouped[phase].map((m) => (
              <div key={m.id} className="premium-calendar-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Tag className={`premium-tag${phase !== 'Fase Regular' ? ' premium-tag--active' : ''}`} style={{ marginInlineEnd: 0 }}>
                  J{m.jornada ?? '?'}
                </Tag>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <Text style={{ fontSize: 14, fontWeight: phase !== 'Fase Regular' ? 700 : 500, color: '#fff5dd' }}>
                    {m.home_team?.name ?? '?'} vs {m.away_team?.name ?? '?'}
                  </Text>
                  <div style={{ color: 'rgba(245, 241, 232, 0.58)', fontSize: 12, marginTop: 4 }}>
                    {m.scheduled_date ? dayjs(m.scheduled_date).format('DD MMM') : ''}
                    {m.time_str && ` · ${m.time_str} hrs`}
                    {m.court && ` · ${m.court}`}
                  </div>
                </div>
                {m.status === 'Jugado'
                  ? <Tag className="premium-tag premium-tag--active" style={{ marginInlineEnd: 0 }}>{m.home_score} - {m.away_score}</Tag>
                  : m.status?.startsWith('WO') || m.status?.startsWith('W')
                    ? <Tag className="premium-tag premium-tag--active" style={{ marginInlineEnd: 0 }}>{m.status}</Tag>
                    : <Tag className="premium-tag" style={{ marginInlineEnd: 0 }}>
                        {m.scheduled_date ? dayjs(m.scheduled_date).format('DD MMM') : 'Programado'}
                      </Tag>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
