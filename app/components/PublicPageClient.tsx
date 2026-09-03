'use client';

import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type TouchEvent,
} from 'react';
import dynamic from 'next/dynamic';
import { Typography, Tag, Select, Button, Spin } from 'antd';
import { FilePdfOutlined, ArrowRightOutlined } from '@ant-design/icons';
import StandingsTable from './StandingsTable';
import { calcularPosiciones, MatchForStandings, TeamStats } from '@/lib/standings';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import GameDayBillboard from './GameDayBillboard';
import { LiguillaBracketTab } from './LiguillaBracket';
import { buildTeamEncounters, isPlayedStatus, isRegularPhase, type TeamEncounter } from '@/lib/public-team-matches';

// Carga diferida de TeamDetailModal para optimizar bundle inicial
const TeamDetailModal = dynamic(() => import('./TeamDetailModal'), {
  loading: () => <div style={{ textAlign: 'center', padding: 40 }}><Spin description="Cargando ficha de equipo..." /></div>,
  ssr: false,
});

dayjs.locale('es');

const { Title, Text } = Typography;

export type TabKey = 'home' | 'standings' | 'stats' | 'team-matches' | 'bracket' | 'calendar';

export const TAB_ORDER: TabKey[] = [
  'home',
  'standings',
  'stats',
  'team-matches',
  'bracket',
  'calendar',
];

export const TAB_LABELS: Record<TabKey, { label: string; icon: string }> = {
  home: { label: 'INICIO', icon: '🏠' },
  standings: { label: 'POSICIONES', icon: '🏆' },
  stats: { label: 'ESTADÍSTICAS', icon: '📊' },
  'team-matches': { label: 'MI EQUIPO', icon: '🏀' },
  bracket: { label: 'LIGUILLA', icon: '🔥' },
  calendar: { label: 'CALENDARIO', icon: '📅' },
};

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
  vuelta?: 'ida' | 'vuelta' | 'liguilla' | null;
  scheduled_date?: string | null;
  played_date?: string | null;
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

interface DirectDataProps {
  seasons: Season[];
  teams: TeamData[];
  allPlayers: PlayerData[];
  allMatches: MatchData[];
  allStats: PlayerStats[];
}

interface InitialDataProps {
  seasons: Season[];
  initialSeasonId: number | null;
  initialData: {
    teams: TeamData[];
    players: PlayerData[];
    matches: MatchData[];
    stats: PlayerStats[];
  };
}

type Props = DirectDataProps | InitialDataProps;

function sortTeamsByName(teams: TeamData[]) {
  return [...teams].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

function sortSelectOptions<T extends { label?: ReactNode }>(a: T, b: T) {
  return String(a.label ?? '').localeCompare(String(b.label ?? ''), 'es', { sensitivity: 'base' });
}

export default function PublicPageClient(props: Props) {
  const { seasons } = props;
  const usesInitialData = 'initialData' in props;
  const activeSeasons = useMemo(() => seasons.filter((season) => season.is_active), [seasons]);

  // Tab activo y dirección de transición
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');
  const prevTabRef = useRef<TabKey>(activeTab);

  // Sub-vista de estadísticas (Honor / Plantillas)
  const [statsSubView, setStatsSubView] = useState<'leaders' | 'rosters'>('leaders');

  // Referencias para el Sliding Pill Indicator
  const navRibbonRef = useRef<HTMLElement>(null);
  const tabButtonRefs = useRef<Map<TabKey, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  // Referencia táctil para swipe gestures
  const touchState = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    validSwipeZone: boolean;
  } | null>(null);

  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(
    usesInitialData ? props.initialSeasonId : activeSeasons[0]?.id ?? null
  );
  const [selectedTeam, setSelectedTeam] = useState<TeamStats | null>(null);
  const [jornadaFilter, setJornadaFilter] = useState<number | 'all'>('all');
  const [calendarTeamFilter, setCalendarTeamFilter] = useState<number | 'all'>('all');
  const [calendarViewFilter, setCalendarViewFilter] = useState<'upcoming' | 'all'>('upcoming');

  // Cache dinámico de temporadas secundarias
  const [dynamicData, setDynamicData] = useState<{
    teams: TeamData[];
    players: PlayerData[];
    matches: MatchData[];
    stats: PlayerStats[];
  } | null>(null);

  const selectedSeason =
    activeSeasons.find((s) => s.id === selectedSeasonId) ?? activeSeasons[0] ?? null;
  const effectiveSeasonId = selectedSeason?.id ?? null;

  // Carga reactiva de datos al conmutar temporada
  useEffect(() => {
    if (!effectiveSeasonId) return;
    if (usesInitialData && effectiveSeasonId === props.initialSeasonId) {
      setDynamicData(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/public/season-data?seasonId=${effectiveSeasonId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setDynamicData(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [effectiveSeasonId, usesInitialData, props]);

  const teams = dynamicData?.teams ?? (usesInitialData ? props.initialData.teams : props.teams);
  const allPlayers = dynamicData?.players ?? (usesInitialData ? props.initialData.players : props.allPlayers);
  const allMatches = dynamicData?.matches ?? (usesInitialData ? props.initialData.matches : props.allMatches);
  const allStats = dynamicData?.stats ?? (usesInitialData ? props.initialData.stats : props.allStats);

  const categories = useMemo(() =>
    [...new Set(activeSeasons.map((s) => s.category))].filter(Boolean),
    [activeSeasons]);

  const seasonOptions = useMemo(() =>
    activeSeasons.map((s) => ({ label: s.name, value: s.id })),
    [activeSeasons]);

  const seasonMatches = useMemo(() =>
    allMatches.filter((m) => m.season_id === effectiveSeasonId),
    [allMatches, effectiveSeasonId]);

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

  // Transición de pestañas con dirección calculada (Fade + Slide)
  const switchTab = useCallback((nextTab: TabKey) => {
    if (nextTab === prevTabRef.current) return;
    const prevIdx = TAB_ORDER.indexOf(prevTabRef.current);
    const nextIdx = TAB_ORDER.indexOf(nextTab);
    if (nextIdx !== prevIdx) {
      setSlideDirection(nextIdx > prevIdx ? 'forward' : 'backward');
    }
    prevTabRef.current = nextTab;
    startTransition(() => {
      setActiveTab(nextTab);
    });
  }, []);

  // Actualización del indicador deslizante y auto-centrado anti-jump en Safari
  const updateIndicator = useCallback(() => {
    const container = navRibbonRef.current;
    const activeButton = tabButtonRefs.current.get(activeTab);
    if (!container || !activeButton) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeButton.getBoundingClientRect();

    const left = activeRect.left - containerRect.left + container.scrollLeft;
    const width = activeRect.width;

    setIndicatorStyle({ left, width });

    // Auto-centrado puramente matemático para evitar saltos de scroll vertical en iOS
    const targetLeft =
      activeButton.offsetLeft -
      (container.clientWidth / 2) +
      (activeButton.offsetWidth / 2);

    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: 'smooth',
    });
  }, [activeTab]);

  useLayoutEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  // Navegación por teclado accesible en la barra de pestañas (WAI-ARIA APG)
  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentKey: TabKey) => {
    const curIdx = TAB_ORDER.indexOf(currentKey);
    let targetKey: TabKey | null = null;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      targetKey = TAB_ORDER[(curIdx + 1) % TAB_ORDER.length];
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      targetKey = TAB_ORDER[(curIdx - 1 + TAB_ORDER.length) % TAB_ORDER.length];
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetKey = TAB_ORDER[0];
    } else if (e.key === 'End') {
      e.preventDefault();
      targetKey = TAB_ORDER[TAB_ORDER.length - 1];
    }

    if (targetKey) {
      switchTab(targetKey);
      tabButtonRefs.current.get(targetKey)?.focus();
    }
  };

  // Gestos táctiles de swipe horizontal seguro (Anti-colisión con tablas y controles)
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;

    // Descartar si el toque inicia dentro de un elemento con scroll horizontal o interactivo
    const isInteractiveOrScrollable = !!target?.closest(
      '.ant-table-wrapper, .ant-table-body, .ant-table-content, .ant-table, .scoreboard-rail, .sports-nav-ribbon, input, textarea, select, button, a'
    );

    touchState.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startTime: Date.now(),
      validSwipeZone: !isInteractiveOrScrollable,
    };
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (!touchState.current || !touchState.current.validSwipeZone || e.changedTouches.length !== 1) {
      touchState.current = null;
      return;
    }

    const deltaX = e.changedTouches[0].clientX - touchState.current.startX;
    const deltaY = e.changedTouches[0].clientY - touchState.current.startY;
    const elapsedTime = Date.now() - touchState.current.startTime;
    touchState.current = null;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Axis-Locking estricto: el gesto debe ser horizontal (> 60 grados de horizontalidad)
    if (absX < absY * 1.75) return;

    // Detección de flick rápido (<300ms, >38px) o arrastre sostenido (>70px)
    const isFlick = elapsedTime < 300 && absX > 38;
    const isSustainedSwipe = absX > 70;

    if (!isFlick && !isSustainedSwipe) return;

    const curIdx = TAB_ORDER.indexOf(activeTab);
    if (deltaX < 0 && curIdx < TAB_ORDER.length - 1) {
      switchTab(TAB_ORDER[curIdx + 1]);
    } else if (deltaX > 0 && curIdx > 0) {
      switchTab(TAB_ORDER[curIdx - 1]);
    }
  };

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

  const calendarTeamOptions = useMemo(() =>
    sortTeamsByName(teams.filter((team) => team.season_id === effectiveSeasonId))
      .map((team) => ({ label: team.name, value: team.id })),
    [effectiveSeasonId, teams]);

  const activeTeamsCount = useMemo(() =>
    teams.filter((t) => t.season_id === effectiveSeasonId).length,
    [teams, effectiveSeasonId]);

  // Carga diferida de jsPDF
  const handlePDF = async () => {
    if (!selectedSeason) return;
    const { generateEligibilityPDF } = await import('@/lib/pdfReport');
    generateEligibilityPDF(
      standings,
      seasonMatches as unknown as Record<string, unknown>[],
      selectedSeason.name,
      allStats as unknown as Parameters<typeof generateEligibilityPDF>[3]
    );
  };

  // Partido estelar reciente o próximo
  const spotlightMatch = useMemo(() => {
    if (seasonMatches.length === 0) return null;
    const upcoming = seasonMatches.find((m) => m.scheduled_date && !isPlayedStatus(m.status));
    if (upcoming) return upcoming;
    const played = [...seasonMatches].reverse().find((m) => isPlayedStatus(m.status));
    return played ?? seasonMatches[0];
  }, [seasonMatches]);

  // Sumatoria total de puntos anotados en la temporada
  const totalPointsScored = useMemo(() => {
    return allStats.reduce((acc, s) => acc + (s.points ?? 0), 0);
  }, [allStats]);

  // Equipo líder general de la temporada
  const leaderTeam = standings[0] ?? null;

  return (
    <main className="public-glass-shell" style={{ minHeight: '100vh', padding: '0 0 48px' }}>
      {/* ── BARRA DE NAVEGACIÓN PRINCIPAL (SPORTS NAV RIBBON STICKY) ── */}
      <div style={{ maxWidth: 1280, margin: '14px auto 0', padding: '0 20px' }}>
        <nav
          ref={navRibbonRef}
          className="sports-nav-ribbon"
          role="tablist"
          aria-orientation="horizontal"
          aria-label="Navegación oficial de Liga Nochixtlán"
        >
          {/* Cápsula flotante animada compartida (Sliding Pill) */}
          <div
            className="sports-nav-indicator"
            style={{
              transform: `translate3d(${indicatorStyle.left}px, 0, 0)`,
              width: indicatorStyle.width,
            }}
          />

          {TAB_ORDER.map((key) => {
            const isActive = activeTab === key;
            const item = TAB_LABELS[key];
            return (
              <button
                key={key}
                ref={(el) => {
                  if (el) tabButtonRefs.current.set(key, el);
                  else tabButtonRefs.current.delete(key);
                }}
                id={`tab-${key}`}
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                aria-controls={`tabpanel-${key}`}
                className={`sports-nav-pill${isActive ? ' sports-nav-pill--active' : ''}`}
                onClick={() => switchTab(key)}
                onKeyDown={(e) => handleTabKeyDown(e, key)}
              >
                <span className="sports-nav-pill__icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── VIEWPORT DINÁMICO CON FADE + SLIDE DIRECCIONAL ── */}
        <div
          className="tab-content-viewport"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            key={activeTab}
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            tabIndex={0}
            aria-labelledby={`tab-${activeTab}`}
            className={slideDirection === 'forward' ? 'tab-pane-slide-forward' : 'tab-pane-slide-backward'}
          >
            {/* ══════════════════════════════════════════════════════════
                1. SECCIÓN INICIO — LANDING PAGE DEPORTIVA OFICIAL
               ══════════════════════════════════════════════════════════ */}
            {activeTab === 'home' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Hero Monumental Asimétrico (Stage 60/40) */}
                <section className="hero-stage">
                  <div className="hero-asymmetric-grid">
                    {/* Zona A: Épica Editorial (60%) */}
                    <div>
                      <div className="premium-hero-mark" style={{ marginBottom: 10 }}>
                        <span>🏀</span> Liga Municipal de Básquetbol · Nochixtlán, Oaxaca
                      </div>

                      <Title
                        className="premium-title"
                        level={1}
                        style={{
                          color: '#ffffff',
                          fontSize: 'clamp(2.5rem, 6vw, 4.8rem)',
                          lineHeight: 0.95,
                          letterSpacing: '0.03em',
                          background: 'linear-gradient(135deg, #ffffff 40%, var(--oro-cantera) 80%, var(--oro-mixteco) 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        Liga Nochixtlán
                      </Title>

                      <div style={{ color: 'var(--oro-cantera)', fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 800, marginTop: 4 }}>
                        La Catedral de la Duela Mixteca
                      </div>

                      <p style={{ color: '#cbd5e1', fontSize: 'clamp(14px, 1.3vw, 16px)', lineHeight: 1.55, maxWidth: 540, marginTop: 10, marginBottom: 18 }}>
                        La máxima fiesta del básquetbol regional. Consulta la tabla general, líderes anotadores, estadísticas individuales y el rol oficial de juegos en tiempo real.
                      </p>

                      {/* CTAs de acción rápida */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button
                          type="primary"
                          className="premium-button"
                          style={{
                            background: 'linear-gradient(135deg, var(--oro-mixteco), #d97706)',
                            borderColor: 'transparent',
                            color: '#0b0f17',
                            fontWeight: 800,
                            boxShadow: '0 4px 18px rgba(245, 158, 11, 0.35)',
                          }}
                          onClick={() => switchTab('standings')}
                        >
                          🏆 Ver Posiciones
                        </Button>
                        <Button
                          className="premium-button"
                          onClick={() => switchTab('stats')}
                        >
                          📊 Estadísticas & Líderes
                        </Button>
                        <Button
                          className="premium-button"
                          onClick={() => switchTab('calendar')}
                        >
                          📅 Rol de Juegos
                        </Button>
                      </div>
                    </div>

                    {/* Zona B: Cockpit Oficial de Temporada (40%) */}
                    <div className="hero-cockpit-card">
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: 'var(--oro-cantera)', textTransform: 'uppercase' }}>
                            ⚙ Cockpit Oficial
                          </span>
                          <span className="hero-stat-badge hero-stat-badge--highlight" style={{ fontSize: 11 }}>
                            {selectedSeason ? selectedSeason.name : 'Temporada'}
                          </span>
                        </div>

                        {/* Selector de Temporada */}
                        <div style={{ marginBottom: 10 }}>
                          <Select
                            className="premium-select"
                            value={effectiveSeasonId}
                            onChange={(value) => startTransition(() => setSelectedSeasonId(value))}
                            options={seasonOptions}
                            style={{ width: '100%' }}
                            placeholder="Seleccionar temporada"
                            showSearch
                            filterOption={(input, opt) => (opt?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
                          />
                        </div>

                        {/* Chips de Categorías */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {categories.map((cat) => {
                            const isActive = selectedSeason?.category === cat;
                            return (
                              <Tag
                                key={cat}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isActive}
                                className={`premium-tag${isActive ? ' premium-tag--active' : ''}`}
                                style={{ cursor: 'pointer', marginInlineEnd: 0, minHeight: 30, padding: '3px 10px', fontSize: 11 }}
                                onClick={() => {
                                  const found = activeSeasons.find((s) => s.category === cat);
                                  if (found) startTransition(() => setSelectedSeasonId(found.id));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    const found = activeSeasons.find((s) => s.category === cat);
                                    if (found) startTransition(() => setSelectedSeasonId(found.id));
                                  }
                                }}
                              >
                                {cat}
                              </Tag>
                            );
                          })}
                        </div>
                      </div>

                      {/* Matriz 2x2 de KPIs Oficiales */}
                      <div className="hero-kpi-grid">
                        <div className="hero-kpi-box">
                          <div className="hero-kpi-value">{activeTeamsCount}</div>
                          <div className="hero-kpi-label">Clubes Activos</div>
                        </div>
                        <div className="hero-kpi-box">
                          <div className="hero-kpi-value">{seasonMatches.length}</div>
                          <div className="hero-kpi-label">Partidos Totales</div>
                        </div>
                        <div className="hero-kpi-box">
                          <div className="hero-kpi-value">{jornadasDropdown.length}</div>
                          <div className="hero-kpi-label">Jornadas</div>
                        </div>
                        <div className="hero-kpi-box">
                          <div className="hero-kpi-value" style={{ color: 'var(--oro-mixteco)' }}>
                            {leaders[0]?.puntos ?? '0'}
                          </div>
                          <div className="hero-kpi-label">Pts Líder Top</div>
                        </div>
                      </div>

                      {/* Mini Match Spotlight */}
                      {spotlightMatch && (
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>
                            <span>{isPlayedStatus(spotlightMatch.status) ? 'Último Resultado' : 'Próximo Encuentro'}</span>
                            <span>J{spotlightMatch.jornada ?? '1'} · {spotlightMatch.court ?? 'Cancha Bicentenario'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 10px', borderRadius: 8 }}>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{spotlightMatch.home_team?.name ?? 'Local'}</span>
                            {isPlayedStatus(spotlightMatch.status) ? (
                              <span style={{ color: 'var(--oro-cantera)', fontWeight: 900, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                                {spotlightMatch.home_score} — {spotlightMatch.away_score}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--oro-mixteco)', fontWeight: 800, fontSize: 11 }}>VS</span>
                            )}
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{spotlightMatch.away_team?.name ?? 'Visitante'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Bloque 2: Cartelera Panorámica / Billboard Hub */}
                <GameDayBillboard seasonMatches={seasonMatches as never[]} />

                {/* Bloque 3: League Pulse Bento Grid (El Pulso de la Competición) */}
                <section className="premium-section-card" style={{ padding: '22px 24px' }}>
                  <h2 className="premium-section-label">⚡ El Pulso de la Temporada</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 10 }}>
                    {/* Tarjeta: Puntero General */}
                    <div style={{ background: 'rgba(20, 26, 38, 0.65)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: 12, padding: '16px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--oro-cantera)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        🏆 Puntero de la Tabla
                      </div>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, marginTop: 8 }}>
                        {leaderTeam ? leaderTeam.equipo : 'Por disputar'}
                      </div>
                      {leaderTeam && (
                        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                          {leaderTeam.PG}G - {leaderTeam.PP}P · {leaderTeam.Pts} Pts ({leaderTeam.DP > 0 ? `+${leaderTeam.DP}` : leaderTeam.DP} DIF)
                        </div>
                      )}
                    </div>

                    {/* Tarjeta: Canastero de Oro */}
                    <div style={{ background: 'rgba(20, 26, 38, 0.65)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 12, padding: '16px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--oro-mixteco)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        👑 Canastero Líder
                      </div>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, marginTop: 8 }}>
                        {leaders[0]?.nombre ?? 'Sin registros'}
                      </div>
                      {leaders[0] && (
                        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                          {leaders[0].puntos} puntos acumulados · {teams.find(t => t.id === leaders[0]?.team_id)?.name ?? '?'}
                        </div>
                      )}
                    </div>

                    {/* Tarjeta: Rey de Triples */}
                    <div style={{ background: 'rgba(20, 26, 38, 0.65)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 12, padding: '16px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        🎯 Rey del Triple
                      </div>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, marginTop: 8 }}>
                        {tripleros[0]?.nombre ?? 'Sin registros'}
                      </div>
                      {tripleros[0] && (
                        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                          {tripleros[0].triples} bombas de 3 ({tripleros[0].triples * 3} pts eq.)
                        </div>
                      )}
                    </div>

                    {/* Tarjeta: Espectáculo Acumulado */}
                    <div style={{ background: 'rgba(20, 26, 38, 0.65)', border: '1px solid rgba(255, 255, 255, 0.07)', borderRadius: 12, padding: '16px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--verde-victoria)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        🏀 Puntos de la Liga
                      </div>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, marginTop: 8 }}>
                        {totalPointsScored.toLocaleString('es-MX')} PTS
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                        Anotados a lo largo de {seasonMatches.length} partidos oficiales
                      </div>
                    </div>
                  </div>
                </section>

                {/* Bloque 4: Quick Navigation Hub (Atajos Visuales a las Demás Secciones) */}
                <section className="premium-section-card" style={{ padding: '22px 24px' }}>
                  <h2 className="premium-section-label">🚀 Explora las Secciones Oficiales</h2>
                  <div className="quick-nav-grid">
                    {/* Atajo: Posiciones */}
                    <div
                      role="button"
                      tabIndex={0}
                      className="quick-nav-card"
                      onClick={() => switchTab('standings')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') switchTab('standings'); }}
                    >
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🏆</div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Tabla de Posiciones</div>
                        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                          Clasificación general con regla oficial 3-1-0, diferencia de puntos y zonas de liguilla.
                        </div>
                      </div>
                      <div style={{ color: 'var(--oro-cantera)', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        Ver Tabla Oficial <ArrowRightOutlined />
                      </div>
                    </div>

                    {/* Atajo: Estadísticas */}
                    <div
                      role="button"
                      tabIndex={0}
                      className="quick-nav-card"
                      onClick={() => switchTab('stats')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') switchTab('stats'); }}
                    >
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Estadísticas & Líderes</div>
                        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                          Top canasteros, mejores tripleros, récords y plantillas detalladas por club.
                        </div>
                      </div>
                      <div style={{ color: 'var(--oro-cantera)', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        Consultar Estadísticas <ArrowRightOutlined />
                      </div>
                    </div>

                    {/* Atajo: Mi Equipo */}
                    <div
                      role="button"
                      tabIndex={0}
                      className="quick-nav-card"
                      onClick={() => switchTab('team-matches')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') switchTab('team-matches'); }}
                    >
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🏀</div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Mi Equipo</div>
                        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                          Encuentra a tu club, consulta el calendario ida y vuelta y sus resultados.
                        </div>
                      </div>
                      <div style={{ color: 'var(--oro-cantera)', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        Buscar Mi Club <ArrowRightOutlined />
                      </div>
                    </div>

                    {/* Atajo: Liguilla */}
                    <div
                      role="button"
                      tabIndex={0}
                      className="quick-nav-card"
                      onClick={() => switchTab('bracket')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') switchTab('bracket'); }}
                    >
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🔥</div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Cuadro de Liguilla</div>
                        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                          Las llaves de cuartos, semifinales y la gran final por la corona del torneo.
                        </div>
                      </div>
                      <div style={{ color: 'var(--oro-cantera)', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        Ver Cuadro de Play-offs <ArrowRightOutlined />
                      </div>
                    </div>

                    {/* Atajo: Calendario */}
                    <div
                      role="button"
                      tabIndex={0}
                      className="quick-nav-card"
                      onClick={() => switchTab('calendar')}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') switchTab('calendar'); }}
                    >
                      <div>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>Rol de Juegos</div>
                        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                          Horarios oficiales, sedes y partidos de toda la temporada por jornada.
                        </div>
                      </div>
                      <div style={{ color: 'var(--oro-cantera)', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        Ver Calendario <ArrowRightOutlined />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                2. SECCIÓN POSICIONES — TABLA OFICIAL
               ══════════════════════════════════════════════════════════ */}
            {activeTab === 'standings' && (
              <GlassSectionCard
                action={(
                  <Button
                    icon={<FilePdfOutlined />}
                    onClick={handlePDF}
                    disabled={standings.length === 0}
                    className="premium-button"
                  >
                    Reporte de Elegibilidad PDF
                  </Button>
                )}
              >
                {standings.length === 0 ? (
                  <Text style={{ color: '#94a3b8', display: 'block', textAlign: 'center', padding: 40 }}>
                    Sin partidos registrados en esta temporada
                  </Text>
                ) : (
                  <StandingsTable data={standings} onTeamClick={setSelectedTeam} />
                )}
              </GlassSectionCard>
            )}

            {/* ══════════════════════════════════════════════════════════
                3. SECCIÓN ESTADÍSTICAS — CENTRO ESTADÍSTICO UNIFICADO
               ══════════════════════════════════════════════════════════ */}
            {activeTab === 'stats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Sub-navegación segmentada: Cuadro de Honor vs Plantillas */}
                <div className="stats-subnav-bar" role="group" aria-label="Subsecciones estadísticas">
                  <button
                    type="button"
                    className={`stats-subnav-btn${statsSubView === 'leaders' ? ' stats-subnav-btn--active' : ''}`}
                    onClick={() => setStatsSubView('leaders')}
                  >
                    👑 Cuadro de Honor & Récords
                  </button>
                  <button
                    type="button"
                    className={`stats-subnav-btn${statsSubView === 'rosters' ? ' stats-subnav-btn--active' : ''}`}
                    onClick={() => setStatsSubView('rosters')}
                  >
                    📋 Estadísticas por Plantilla
                  </button>
                </div>

                {/* Subvista A: Líderes y Récords */}
                {statsSubView === 'leaders' && (
                  <>
                    {/* Podio Top 3 Anotadores */}
                    <GlassSectionCard>
                      <h2 className="premium-section-label">👑 Podio de Anotadores (Top 3)</h2>
                      {leaders.length === 0 ? (
                        <Text style={{ color: '#94a3b8', padding: '14px 0', display: 'block' }}>Sin estadísticas registradas</Text>
                      ) : (
                        <>
                          <div className="podium-grid">
                            {leaders.slice(0, 3).map((l, i) => {
                              const team = teams.find((t) => t.id === l.team_id);
                              const isGold = i === 0;
                              return (
                                <div
                                  key={l.id}
                                  className={`podium-card${isGold ? ' podium-card--first' : ''}`}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 18 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: isGold ? 'var(--oro-cantera)' : '#94a3b8', textTransform: 'uppercase' }}>
                                      {i === 0 ? 'Líder Canastero' : `Lugar #${i + 1}`}
                                    </span>
                                  </div>
                                  <div style={{ margin: '12px 0 6px' }}>
                                    <div className="podium-number">{l.puntos}</div>
                                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                      Puntos Anotados
                                    </div>
                                  </div>
                                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 10 }}>
                                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{l.nombre}</div>
                                    <div style={{ color: '#94a3b8', fontSize: 12 }}>{team?.name ?? '?'}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {leaders.length > 3 && (
                            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
                                Clasificación Extendida (4° al 10°)
                              </div>
                              <LeadersTable data={leaders.slice(3)} type="puntos" color="#f59e0b" teams={teams} startIndex={4} />
                            </div>
                          )}
                        </>
                      )}
                    </GlassSectionCard>

                    {/* Podio Top 3 Tripleros */}
                    <GlassSectionCard>
                      <h2 className="premium-section-label">🎯 Reyes del Triple (Top 3)</h2>
                      {tripleros.length === 0 ? (
                        <Text style={{ color: '#94a3b8', padding: '14px 0', display: 'block' }}>Sin triples registrados</Text>
                      ) : (
                        <>
                          <div className="podium-grid">
                            {tripleros.slice(0, 3).map((l, i) => {
                              const team = teams.find((t) => t.id === l.team_id);
                              const isGold = i === 0;
                              return (
                                <div
                                  key={l.id}
                                  className={`podium-card${isGold ? ' podium-card--first' : ''}`}
                                  style={isGold ? { borderColor: 'rgba(56, 189, 248, 0.45)', background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.12), rgba(12, 16, 24, 0.95))' } : undefined}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 18 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: isGold ? '#38bdf8' : '#94a3b8', textTransform: 'uppercase' }}>
                                      {i === 0 ? 'Mejor Tirador' : `Lugar #${i + 1}`}
                                    </span>
                                  </div>
                                  <div style={{ margin: '12px 0 6px' }}>
                                    <div className="podium-number" style={{ color: '#38bdf8' }}>{l.triples}</div>
                                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                      Bombas de 3PT ({Math.floor(l.triples * 3)} pts eq.)
                                    </div>
                                  </div>
                                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 10 }}>
                                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{l.nombre}</div>
                                    <div style={{ color: '#94a3b8', fontSize: 12 }}>{team?.name ?? '?'}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {tripleros.length > 3 && (
                            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
                                Clasificación Extendida (4° al 10°)
                              </div>
                              <LeadersTable data={tripleros.slice(3)} type="triples" color="#38bdf8" teams={teams} startIndex={4} />
                            </div>
                          )}
                        </>
                      )}
                    </GlassSectionCard>

                    {/* Récords de Temporada */}
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {seasonRecords.bestPuntos && (
                        <SmallRecordBadge
                          icon="🔥"
                          label="Récord de Puntos en un Partido"
                          color="#f59e0b"
                          jugador={seasonRecords.bestPuntos.nombre}
                          equipo={seasonRecords.bestPuntos.equipo}
                          valor={seasonRecords.bestPuntos.valor}
                          jornada={seasonRecords.bestPuntos.jornada}
                        />
                      )}
                      {seasonRecords.bestTriples && (
                        <SmallRecordBadge
                          icon="🎯"
                          label="Récord de Triples en un Partido"
                          color="#38bdf8"
                          jugador={seasonRecords.bestTriples.nombre}
                          equipo={seasonRecords.bestTriples.equipo}
                          valor={seasonRecords.bestTriples.valor}
                          jornada={seasonRecords.bestTriples.jornada}
                        />
                      )}
                    </div>
                  </>
                )}

                {/* Subvista B: Desglose por Plantilla */}
                {statsSubView === 'rosters' && (
                  <GlassSectionCard>
                    <h2 className="premium-section-label">📊 Estadísticas Individuales por Club</h2>
                    <TeamStatsTab
                      seasonId={effectiveSeasonId}
                      teams={teams}
                      allPlayers={allPlayers}
                      allStats={allStats}
                      seasonMatches={seasonMatches}
                      standings={standings}
                    />
                  </GlassSectionCard>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                4. SECCIÓN MI EQUIPO — FIXTURE Y RESULTADOS POR CLUB
               ══════════════════════════════════════════════════════════ */}
            {activeTab === 'team-matches' && (
              <GlassSectionCard>
                <h2 className="premium-section-label">🏀 Fixture y Resultados por Club</h2>
                <TeamMatchesTab
                  seasonId={effectiveSeasonId}
                  teams={teams}
                  matches={seasonMatches}
                  standings={standings}
                />
              </GlassSectionCard>
            )}

            {/* ══════════════════════════════════════════════════════════
                5. SECCIÓN LIGUILLA — CUADRO DE POSTEMPORADA
               ══════════════════════════════════════════════════════════ */}
            {activeTab === 'bracket' && (
              <GlassSectionCard>
                <LiguillaBracketTab seasonMatches={seasonMatches as unknown as Parameters<typeof LiguillaBracketTab>[0]['seasonMatches']} />
              </GlassSectionCard>
            )}

            {/* ══════════════════════════════════════════════════════════
                6. SECCIÓN CALENDARIO — ROL DE JUEGOS Y FILTROS
               ══════════════════════════════════════════════════════════ */}
            {activeTab === 'calendar' && (
              <GlassSectionCard>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <Text style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                      Jornada:
                    </Text>
                    <Select
                      className="premium-select"
                      value={jornadaFilter}
                      onChange={(value) => startTransition(() => setJornadaFilter(value))}
                      style={{ width: '100%' }}
                      options={[
                        { label: 'Todas las jornadas', value: 'all' },
                        ...jornadasDropdown.map((j) => ({ label: `Jornada ${j}`, value: j })),
                      ]}
                    />
                  </div>
                  <div>
                    <Text style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                      Equipo:
                    </Text>
                    <Select
                      className="premium-select"
                      value={calendarTeamFilter}
                      onChange={(value) => startTransition(() => setCalendarTeamFilter(value))}
                      style={{ width: '100%' }}
                      options={[
                        { label: 'Todos los equipos', value: 'all' },
                        ...calendarTeamOptions,
                      ]}
                      showSearch
                      filterOption={(input, opt) => (opt?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
                      filterSort={sortSelectOptions}
                    />
                  </div>
                  <div>
                    <Text style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                      Vista:
                    </Text>
                    <Select
                      className="premium-select"
                      value={calendarViewFilter}
                      onChange={(value) => startTransition(() => setCalendarViewFilter(value))}
                      style={{ width: '100%' }}
                      options={[
                        { label: 'Próximos partidos', value: 'upcoming' },
                        { label: 'Todos, con pasados', value: 'all' },
                      ]}
                    />
                  </div>
                </div>

                {seasonMatches.length === 0 ? (
                  <Text style={{ color: '#94a3b8', display: 'block', textAlign: 'center', padding: 32 }}>Sin partidos</Text>
                ) : (
                  <CalendarList
                    matches={seasonMatches}
                    jornadaFilter={jornadaFilter}
                    teamFilter={calendarTeamFilter}
                    viewFilter={calendarViewFilter}
                  />
                )}
              </GlassSectionCard>
            )}
          </div>
        </div>
      </div>

      {/* Modal Ficha Técnica de Equipo (Diferido con Recharts) */}
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

      {/* Pie de Página Oficial con Enlace Discreto de Administración */}
      <footer
        style={{
          maxWidth: 1280,
          margin: '48px auto 0',
          padding: '24px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          color: '#94a3b8',
          fontSize: 12,
        }}
      >
        <div>
          © {new Date().getFullYear()} Liga Municipal de Básquetbol Nochixtlán · Todos los derechos reservados.
        </div>
        <div>
          <a
            href="/admin"
            style={{
              color: '#94a3b8',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              transition: 'color 0.18s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--oro-cantera)')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            ⚙ Panel Oficial de Administración
          </a>
        </div>
      </footer>
    </main>
  );
}

function useIsCoarsePointer() {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const update = () => setIsCoarsePointer(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isCoarsePointer;
}

function GlassSectionCard({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="premium-section-card" style={{ padding: '20px 22px' }}>
      {action ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          {action}
        </div>
      ) : null}
      {children}
    </section>
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
    <div
      style={{
        background: 'var(--surface-section)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 14,
        padding: '16px 18px',
        flex: '1 1 240px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <Text style={{ color, fontWeight: 800, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {label}
        </Text>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, gap: 10 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{jugador}</div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{equipo} · J{jornada ?? '?'}</div>
        </div>
        <div
          style={{
            color,
            border: `1px solid ${color}44`,
            background: `${color}12`,
            padding: '4px 12px',
            borderRadius: 8,
            fontWeight: 900,
            fontSize: 16,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {valor}
        </div>
      </div>
    </div>
  );
}

function LeadersTable({
  data,
  type,
  color,
  teams,
  startIndex = 1,
}: {
  data: { id: number; nombre: string; team_id: number; puntos: number; triples: number }[];
  type: 'puntos' | 'triples';
  color: string;
  teams: TeamData[];
  startIndex?: number;
}) {
  if (data.length === 0) {
    return <Text style={{ color: '#94a3b8', padding: '14px 0', display: 'block' }}>Sin estadísticas</Text>;
  }

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', minWidth: 260, borderCollapse: 'collapse' }} aria-label={type === 'puntos' ? 'Tabla de anotadores' : 'Tabla de tripleros'}>
        <thead>
          <tr>
            <th scope="col" style={{ width: 44, textAlign: 'center', padding: '8px 6px', color: 'var(--oro-cantera)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>#</th>
            <th scope="col" style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--oro-cantera)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Jugador</th>
            <th scope="col" style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--oro-cantera)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Equipo</th>
            {type === 'puntos' ? (
              <th scope="col" style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--oro-cantera)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Puntos</th>
            ) : (
              <>
                <th scope="col" style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--oro-cantera)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>3PT</th>
                <th scope="col" style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--oro-cantera)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Pts Eq.</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((l, i) => {
            const team = teams.find((t) => t.id === l.team_id);
            const pos = startIndex + i;
            return (
              <tr key={l.id ?? i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                  <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
                    {pos}
                  </span>
                </td>
                <td style={{ textAlign: 'left', fontWeight: 600, color: '#f8fafc', padding: '8px 6px', fontSize: 13 }}>{l.nombre}</td>
                <td style={{ textAlign: 'left', color: '#94a3b8', fontSize: 12, padding: '8px 6px' }}>{team?.name ?? '?'}</td>
                {type === 'puntos' ? (
                  <td style={{ textAlign: 'right', padding: '8px 6px' }}>
                    <span style={{ color, fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{l.puntos}</span>
                  </td>
                ) : (
                  <>
                    <td style={{ textAlign: 'right', padding: '8px 6px' }}>
                      <span style={{ color, fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{l.triples}</span>
                    </td>
                    <td style={{ textAlign: 'right', color: '#94a3b8', fontSize: 12, padding: '8px 6px', fontVariantNumeric: 'tabular-nums' }}>
                      {Math.floor((l.triples ?? 0) * 3)}
                    </td>
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

function TeamStatsTab({
  seasonId,
  teams,
  allPlayers,
  allStats,
  seasonMatches,
  standings,
}: {
  seasonId: number | null;
  teams: TeamData[];
  allPlayers: PlayerData[];
  allStats: PlayerStats[];
  seasonMatches: MatchData[];
  standings: TeamStats[];
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'Fase Regular' | 'Liguilla'>('Fase Regular');
  const isCoarsePointer = useIsCoarsePointer();

  const activeTeams = useMemo(() => sortTeamsByName(teams.filter((t) => t.season_id === seasonId)), [teams, seasonId]);

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

  if (!seasonId) return <Text style={{ color: '#94a3b8' }}>Selecciona una temporada arriba.</Text>;

  return (
    <div>
      {/* Grid táctil de clubes */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Toca un club para consultar su plantilla:
        </div>
        <div className="team-hub-grid">
          {activeTeams.map((team) => {
            const stats = standings.find((s) => s.id === team.id);
            const isSelected = selectedTeamId === team.id;
            return (
              <div
                key={team.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                className={`team-grid-card${isSelected ? ' team-grid-card--active' : ''}`}
                onClick={() => setSelectedTeamId(team.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedTeamId(team.id); }}
              >
                <div style={{ color: isSelected ? 'var(--oro-cantera)' : '#fff', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {team.name}
                </div>
                {stats && (
                  <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                    {stats.PG}G - {stats.PP}P · {stats.Pts} pts
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 18, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}>
          <Text style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
            O busca por nombre:
          </Text>
          <Select
            className="premium-select"
            style={{ width: '100%', maxWidth: 420 }}
            placeholder="Seleccionar club"
            value={selectedTeamId}
            onChange={(v) => setSelectedTeamId(v as number | null)}
            options={activeTeams.map((t) => ({ label: t.name, value: t.id }))}
            showSearch={!isCoarsePointer}
            filterOption={(input, opt) => (opt?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
            filterSort={sortSelectOptions}
          />
        </div>
        <div style={{ flex: '0 1 220px' }}>
          <Text style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
            Fase de Torneo:
          </Text>
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
            <Text style={{ color: '#94a3b8', display: 'block', padding: 24, textAlign: 'center' }}>
              Sin estadísticas registradas para este equipo.
            </Text>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: 300, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th scope="col" style={{ width: 54, textAlign: 'center', padding: '8px 6px', color: 'var(--oro-cantera)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>#</th>
                    <th scope="col" style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--oro-cantera)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Nombre</th>
                    <th scope="col" style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--oro-cantera)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Triples</th>
                    <th scope="col" style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--oro-cantera)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ textAlign: 'center', color: '#94a3b8', padding: '8px 6px', fontSize: 12 }}>{s.number ? `#${s.number}` : '-'}</td>
                      <td style={{ textAlign: 'left', fontWeight: 600, color: '#f8fafc', padding: '8px 6px', fontSize: 13 }}>{s.nombre}</td>
                      <td style={{ textAlign: 'right', padding: '8px 6px' }}>
                        <span style={{ color: s.triples > 0 ? '#38bdf8' : '#94a3b8', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{s.triples}</span>
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 6px' }}>
                        <span style={{ color: s.puntos > 0 ? 'var(--oro-cantera)' : '#94a3b8', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{s.puntos}</span>
                      </td>
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

function formatTeamMatchDate(match: MatchData) {
  const details = [
    match.time_str ? `${match.time_str} hrs` : null,
    match.court,
  ].filter(Boolean);

  if (!match.scheduled_date) {
    return [
      typeof match.jornada === 'number' ? `Jornada ${match.jornada}` : 'Sin fecha aún',
      ...details,
    ].join(' · ');
  }

  return [dayjs(match.scheduled_date).format('DD MMM YYYY'), ...details].join(' · ');
}

function getMatchSortValue(match: MatchData) {
  const datedValue = dayjs(match.played_date ?? match.scheduled_date ?? '').valueOf();
  if (Number.isFinite(datedValue)) return datedValue;
  if (typeof match.jornada === 'number') return match.jornada;
  return 0;
}

function teamMatchResult(match: MatchData, teamId: number) {
  const isHome = match.home_team_id === teamId;
  const pointsFor = isHome ? match.home_score : match.away_score;
  const pointsAgainst = isHome ? match.away_score : match.home_score;
  if (typeof pointsFor !== 'number' || typeof pointsAgainst !== 'number') {
    return { text: match.status ?? 'Resultado pendiente', color: '#fde68a' };
  }
  const label = pointsFor > pointsAgainst ? 'Victoria' : pointsFor < pointsAgainst ? 'Derrota' : 'Empate';
  return {
    text: `${pointsFor} - ${pointsAgainst} · ${label}`,
    color: pointsFor > pointsAgainst ? '#4ade80' : pointsFor < pointsAgainst ? '#f87171' : '#fde68a',
  };
}

function TeamMatchesTab({
  seasonId,
  teams,
  matches,
  standings,
}: {
  seasonId: number | null;
  teams: TeamData[];
  matches: MatchData[];
  standings: TeamStats[];
}) {
  const [teamId, setTeamId] = useState<number | null>(null);
  const isCoarsePointer = useIsCoarsePointer();
  const activeTeams = useMemo(() => sortTeamsByName(teams.filter((team) => team.season_id === seasonId)), [seasonId, teams]);
  const encounters = useMemo(() => teamId ? buildTeamEncounters(teamId, activeTeams, matches) : [], [activeTeams, matches, teamId]);
  const pending = encounters.filter((item) => !item.match || !isPlayedStatus(item.match.status));
  const played = encounters.filter((item): item is TeamEncounter<MatchData> & { match: MatchData } => Boolean(item.match && isPlayedStatus(item.match.status)))
    .sort((a, b) => getMatchSortValue(b.match) - getMatchSortValue(a.match));
  const playoffs = teamId ? matches.filter((match) => !isRegularPhase(match.phase) && (match.home_team_id === teamId || match.away_team_id === teamId)) : [];

  if (!seasonId) return <Text style={{ color: '#94a3b8' }}>Selecciona una temporada arriba.</Text>;

  return (
    <div>
      {/* Grid táctil de clubes */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Toca tu club para ver sus partidos:
        </div>
        <div className="team-hub-grid">
          {activeTeams.map((team) => {
            const stats = standings.find((s) => s.id === team.id);
            const isSelected = teamId === team.id;
            return (
              <div
                key={team.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                className={`team-grid-card${isSelected ? ' team-grid-card--active' : ''}`}
                onClick={() => setTeamId(team.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTeamId(team.id); }}
              >
                <div style={{ color: isSelected ? 'var(--oro-cantera)' : '#fff', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {team.name}
                </div>
                {stats && (
                  <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                    Pos. #{standings.findIndex((s) => s.id === team.id) + 1} · {stats.Pts} pts
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Text style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
        O selecciona en lista:
      </Text>
      <Select
        className="premium-select"
        style={{ width: '100%', maxWidth: 440, marginBottom: 20 }}
        placeholder="Seleccionar equipo"
        value={teamId}
        onChange={setTeamId}
        options={activeTeams.map((team) => ({ label: team.name, value: team.id }))}
        showSearch={!isCoarsePointer}
        filterOption={(input, option) => (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
        filterSort={sortSelectOptions}
      />

      {!teamId ? (
        <Text style={{ color: '#94a3b8', display: 'block', textAlign: 'center', padding: 28 }}>
          Selecciona tu equipo para ver su calendario completo y resultados.
        </Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <EncounterList title="Partidos por Disputar" encounters={pending} teamId={teamId} />
          <EncounterList title="Partidos ya Jugados" encounters={played} teamId={teamId} showResult />
          {playoffs.length > 0 && <PlayoffList matches={playoffs} teamId={teamId} />}
        </div>
      )}
    </div>
  );
}

function EncounterList({ title, encounters, teamId, showResult = false }: { title: string; encounters: TeamEncounter<MatchData>[]; teamId: number; showResult?: boolean }) {
  return (
    <div>
      <h3 className="premium-section-label" style={{ fontSize: 12 }}>{title}</h3>
      {encounters.length === 0 ? <Text style={{ color: '#94a3b8', padding: '10px 0', display: 'block' }}>No hay partidos en esta sección.</Text> : (
        <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          {encounters.map((encounter) => {
            const result = showResult && encounter.match ? teamMatchResult(encounter.match, teamId) : null;
            return (
              <div key={encounter.key} className="premium-list-item" style={{ flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: 14 }}>{encounter.opponent.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{encounter.leg === 'ida' ? 'Primer enfrentamiento (Ida)' : 'Segundo enfrentamiento (Vuelta)'}</div>
                </div>
                <div style={{ color: result?.color ?? '#cbd5e1', fontSize: 12, textAlign: 'right', fontWeight: 600 }}>
                  {result?.text ?? (encounter.match ? formatTeamMatchDate(encounter.match) : 'Por programar · Aún no registrado')}
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
      <h3 className="premium-section-label" style={{ fontSize: 12 }}>Liguilla / Play-offs</h3>
      <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.06)', marginTop: 8 }}>
        {matches.map((match) => {
          const opponent = match.home_team_id === teamId ? match.away_team : match.home_team;
          const result = isPlayedStatus(match.status) ? teamMatchResult(match, teamId) : null;
          return (
            <div key={match.id} className="premium-list-item" style={{ flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#f8fafc', fontWeight: 700 }}>{opponent?.name ?? 'Rival por definir'}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{match.phase ?? 'Liguilla'}</div>
              </div>
              <div style={{ color: result?.color ?? '#cbd5e1', fontSize: 12, fontWeight: 600 }}>
                {result?.text ?? formatTeamMatchDate(match)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isPastCalendarMatch(match: MatchData) {
  if (isPlayedStatus(match.status)) return true;
  if (!match.scheduled_date) return false;
  return dayjs(match.scheduled_date).isBefore(dayjs(), 'day');
}

function CalendarList({
  matches,
  jornadaFilter,
  teamFilter,
  viewFilter,
}: {
  matches: MatchData[];
  jornadaFilter: number | 'all';
  teamFilter: number | 'all';
  viewFilter: 'upcoming' | 'all';
}) {
  const filtered = matches.filter((m) => {
    const matchesJornada = jornadaFilter === 'all' || m.jornada === jornadaFilter;
    const matchesTeam = teamFilter === 'all' || m.home_team_id === teamFilter || m.away_team_id === teamFilter;
    const matchesView = viewFilter === 'all' || !isPastCalendarMatch(m);
    return matchesJornada && matchesTeam && matchesView;
  });

  const grouped: Record<string, MatchData[]> = {};
  filtered.forEach((m) => {
    const p = m.phase || 'Fase Regular';
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(m);
  });

  const phaseOrder = ['Fase Regular', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Tercer Lugar', 'Final'];
  const sortedPhases = Object.keys(grouped).sort((a, b) => phaseOrder.indexOf(a) - phaseOrder.indexOf(b));

  if (filtered.length === 0) {
    return <Text style={{ color: '#94a3b8', display: 'block', textAlign: 'center', padding: 32 }}>Sin partidos con los filtros seleccionados</Text>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {sortedPhases.map((phase) => (
        <div key={phase}>
          <div style={{ marginBottom: 10 }}>
            <h3 className="premium-section-label" style={{ fontSize: 12 }}>{phase === 'Fase Regular' ? 'Temporada Regular' : phase}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            {grouped[phase].map((m) => (
              <div key={m.id} className="premium-list-item" style={{ flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                  <Tag className={`premium-tag${phase !== 'Fase Regular' ? ' premium-tag--active' : ''}`} style={{ marginInlineEnd: 0, minHeight: 28, padding: '2px 8px', fontSize: 11 }}>
                    J{m.jornada ?? '?'}
                  </Tag>
                  <div>
                    <Text style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                      {m.home_team?.name ?? '?'} <span style={{ color: '#94a3b8', fontWeight: 500, margin: '0 4px' }}>vs</span> {m.away_team?.name ?? '?'}
                    </Text>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                      {m.scheduled_date ? dayjs(m.scheduled_date).format('DD MMM') : ''}
                      {m.time_str && ` · ${m.time_str} hrs`}
                      {m.court && ` · ${m.court}`}
                    </div>
                  </div>
                </div>
                {m.status === 'Jugado' ? (
                  <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--oro-cantera)', fontVariantNumeric: 'tabular-nums' }}>
                    {m.home_score} — {m.away_score}
                  </span>
                ) : m.status?.startsWith('WO') || m.status?.startsWith('W') ? (
                  <span style={{ fontWeight: 800, fontSize: 12, color: '#fbbf24' }}>
                    {m.status}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {m.scheduled_date ? dayjs(m.scheduled_date).format('DD MMM') : 'Programado'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
