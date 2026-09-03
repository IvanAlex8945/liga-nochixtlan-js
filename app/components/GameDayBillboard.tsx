'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Button, message } from 'antd';
import { DownloadOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

/* ── Types ───────────────────────────────────────────────── */
interface TeamData { id: number; name: string; }

interface MatchData {
  id: number;
  jornada: number;
  phase: string;
  status: string;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  home_team?: TeamData;
  away_team?: TeamData;
  scheduled_date?: string | null;
  time_str?: string | null;
  court?: string | null;
}

/* ── Color Palette (curated, athletic) ───────────────────── */
const TEAM_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#e11d48',
  '#84cc16', '#0ea5e9', '#d946ef', '#f43f5e', '#a855f7',
];

function getTeamColor(teamId: number): string {
  return TEAM_COLORS[Math.abs(teamId) % TEAM_COLORS.length];
}

function getTeamInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

/* ── Phase theming ───────────────────────────────────────── */
const PHASE_CONFIG: Record<string, { label: string; bgLabel: string; accent: string }> = {
  'Cuartos de Final': {
    label: 'CUARTOS DE FINAL',
    bgLabel: 'CUARTOS',
    accent: '#38bdf8',
  },
  'Octavos de Final': {
    label: 'OCTAVOS DE FINAL',
    bgLabel: 'OCTAVOS',
    accent: '#38bdf8',
  },
  'Semifinal': {
    label: 'SEMIFINALES',
    bgLabel: 'SEMIS',
    accent: '#f87171',
  },
  'Final': {
    label: 'LA GRAN FINAL',
    bgLabel: 'FINAL',
    accent: '#f59e0b',
  },
  'Tercer Lugar': {
    label: 'TERCER LUGAR',
    bgLabel: 'BRONCE',
    accent: '#a78bfa',
  },
};

function getPhaseConfig(phase: string) {
  return PHASE_CONFIG[phase] ?? {
    label: (phase || 'LIGUILLA').toUpperCase(),
    bgLabel: 'PLAYOFFS',
    accent: '#f59e0b',
  };
}

/* ── Series status helpers ───────────────────────────────── */
function groupSeriesForBillboard(allMatches: MatchData[]) {
  const map: Record<string, MatchData[]> = {};
  allMatches.forEach((m) => {
    const h = m.home_team_id || 0;
    const a = m.away_team_id || 0;
    const key = `${m.phase}::${Math.min(h, a)}-${Math.max(h, a)}`;
    if (!map[key]) map[key] = [];
    map[key].push(m);
  });
  return Object.values(map).map(list =>
    list.sort((a, b) => (a.jornada || 0) - (b.jornada || 0))
  );
}

interface SeriesInfo {
  winsA: number;
  winsB: number;
  teamA_id: number;
  teamB_id: number;
  teamA_name: string;
  teamB_name: string;
  seriesLabel: string;
  gameNumber: number;
  totalGames: number;
}

function getSeriesInfo(seriesMatches: MatchData[], currentMatch: MatchData): SeriesInfo {
  const tA_id = seriesMatches[0].home_team_id;
  const tB_id = seriesMatches[0].away_team_id;
  const tA_name = seriesMatches[0].home_team?.name ?? 'Equipo A';
  const tB_name = seriesMatches[0].away_team?.name ?? 'Equipo B';

  let winsA = 0;
  let winsB = 0;

  seriesMatches.forEach(m => {
    if (m.id === currentMatch.id) return;
    const isJugado = ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status);
    if (!isJugado) return;

    const homeWon = (m.home_score ?? 0) > (m.away_score ?? 0) || m.status === 'WO Visitante';
    const awayWon = (m.away_score ?? 0) > (m.home_score ?? 0) || m.status === 'WO Local';

    if (m.home_team_id === tA_id && homeWon) winsA++;
    if (m.away_team_id === tA_id && awayWon) winsA++;
    if (m.home_team_id === tB_id && homeWon) winsB++;
    if (m.away_team_id === tB_id && awayWon) winsB++;
  });

  const gameIndex = seriesMatches.findIndex(m => m.id === currentMatch.id);
  const gameNumber = gameIndex + 1;
  const totalGames = seriesMatches.length;

  let seriesLabel: string;
  if (winsA === 0 && winsB === 0) {
    seriesLabel = 'Serie 0-0';
  } else if (winsA === winsB) {
    seriesLabel = `Serie empatada ${winsA}-${winsB}`;
  } else if (winsA > winsB) {
    seriesLabel = `Serie ${winsA}-${winsB} favor ${tA_name}`;
  } else {
    seriesLabel = `Serie ${winsB}-${winsA} favor ${tB_name}`;
  }

  return { winsA, winsB, teamA_id: tA_id, teamB_id: tB_id, teamA_name: tA_name, teamB_name: tB_name, seriesLabel, gameNumber, totalGames };
}

/* ── Format date in Spanish ──────────────────────────────── */
function formatDateSpanish(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Fecha por definir';
  let d = dayjs(dateStr);
  if (!dateStr.includes('T')) {
    d = dayjs(dateStr + 'T12:00:00');
  }
  return d.locale('es').format('dddd, DD [de] MMMM [de] YYYY')
    .replace(/^\w/, c => c.toUpperCase());
}

/* ── Canvas Image Generation (Preserved 100%) ────────────── */
function generateBillboardImage(
  phase: string,
  bgLabel: string,
  homeName: string,
  awayName: string,
  homeColor: string,
  awayColor: string,
  dateStr: string,
  timeStr: string,
  court: string,
  gameLabel: string,
  seriesLabel: string,
  accent: string,
) {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Dark background with sports gradient
  const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 1200);
  bgGrad.addColorStop(0, '#111520');
  bgGrad.addColorStop(1, '#05070a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle team glows
  const glowHome = ctx.createRadialGradient(W * 0.2, H * 0.45, 0, W * 0.2, H * 0.45, 600);
  glowHome.addColorStop(0, homeColor + '18');
  glowHome.addColorStop(1, 'transparent');
  ctx.fillStyle = glowHome;
  ctx.fillRect(0, 0, W, H);

  const glowAway = ctx.createRadialGradient(W * 0.8, H * 0.55, 0, W * 0.8, H * 0.55, 600);
  glowAway.addColorStop(0, awayColor + '18');
  glowAway.addColorStop(1, 'transparent');
  ctx.fillStyle = glowAway;
  ctx.fillRect(0, 0, W, H);

  // Watermark text
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.font = '900 260px Inter, Arial, sans-serif';
  ctx.fillText(bgLabel, W / 2, H / 2 + 100);

  // Top header box
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, W, 260);

  // Accent bar
  ctx.fillStyle = accent;
  ctx.fillRect(0, 260, W, 4);

  // Header titles
  ctx.fillStyle = '#f59e0b';
  ctx.font = '700 28px Inter, Arial, sans-serif';
  ctx.fillText('LIGA MUNICIPAL DE BÁSQUETBOL', W / 2, 110);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 60px Inter, Arial, sans-serif';
  ctx.fillText('NOCHIXTLÁN', W / 2, 190);

  // Phase Title
  ctx.fillStyle = accent;
  ctx.font = '900 76px Inter, Arial, sans-serif';
  ctx.fillText(phase, W / 2, 380);

  // Date / Court
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 34px Inter, Arial, sans-serif';
  ctx.fillText(`🗓  ${dateStr}`, W / 2, 460);
  ctx.fillText(`📍  ${court}`, W / 2, 515);

  // Teams Layout
  const nameY = 880;

  // Home
  ctx.fillStyle = homeColor;
  ctx.font = '900 190px Inter, Arial, sans-serif';
  ctx.fillText(getTeamInitial(homeName), W / 2 - 320, nameY);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 60px Inter, Arial, sans-serif';
  ctx.fillText(homeName.toUpperCase(), W / 2, nameY - 60);

  // VS
  ctx.fillStyle = '#334155';
  ctx.font = '900 110px Inter, Arial, sans-serif';
  ctx.fillText('VS', W / 2, nameY + 60);

  // Away
  ctx.fillStyle = awayColor;
  ctx.font = '900 190px Inter, Arial, sans-serif';
  ctx.fillText(getTeamInitial(awayName), W / 2 + 320, nameY + 120);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 60px Inter, Arial, sans-serif';
  ctx.fillText(awayName.toUpperCase(), W / 2, nameY + 180);

  // Bottom Status Box
  const bottomBoxY = 1450;
  ctx.fillStyle = 'rgba(10, 13, 20, 0.85)';
  ctx.fillRect(W * 0.1, bottomBoxY, W * 0.8, 300);
  ctx.strokeStyle = accent + '55';
  ctx.lineWidth = 2;
  ctx.strokeRect(W * 0.1, bottomBoxY, W * 0.8, 300);

  ctx.fillStyle = accent;
  ctx.font = '800 42px Inter, Arial, sans-serif';
  ctx.fillText(gameLabel, W / 2, bottomBoxY + 80);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 34px Inter, Arial, sans-serif';
  ctx.fillText(seriesLabel, W / 2, bottomBoxY + 140);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 84px Inter, Arial, sans-serif';
  ctx.fillText(`🏀  ${timeStr}`, W / 2, bottomBoxY + 250);

  return canvas.toDataURL('image/png');
}

/* ── Avatar Badge Component ──────────────────────────────── */
function AvatarBadge({ name, teamId, size = 52 }: { name: string; teamId: number; size?: number }) {
  const color = getTeamColor(teamId);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${color}33, ${color}11)`,
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 4px 16px ${color}22`,
        flexShrink: 0,
      }}
    >
      <span style={{ color, fontSize: size * 0.48, fontWeight: 900, lineHeight: 1 }}>
        {getTeamInitial(name)}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function GameDayBillboard({ seasonMatches }: { seasonMatches: MatchData[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter logic (Preserved 100%)
  const upcomingLiguilla = useMemo(() => {
    const liguillaPhases = ['Cuartos de Final', 'Octavos de Final', 'Semifinal', 'Final', 'Tercer Lugar'];
    return seasonMatches.filter(
      m => liguillaPhases.includes(m.phase ?? '') && (m.status === 'Programado' || m.status === 'Pendiente')
    ).sort((a, b) => {
      const dateA = a.scheduled_date ?? '9999';
      const dateB = b.scheduled_date ?? '9999';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.time_str ?? '').localeCompare(b.time_str ?? '');
    });
  }, [seasonMatches]);

  const allLiguilla = useMemo(() => {
    const liguillaPhases = ['Cuartos de Final', 'Octavos de Final', 'Semifinal', 'Final', 'Tercer Lugar'];
    return seasonMatches.filter(m => liguillaPhases.includes(m.phase ?? ''));
  }, [seasonMatches]);

  const seriesGroups = useMemo(() => groupSeriesForBillboard(allLiguilla), [allLiguilla]);

  const cards = useMemo(() => {
    return upcomingLiguilla.map(match => {
      const series = seriesGroups.find(g =>
        g.some(m => m.id === match.id)
      ) ?? [match];
      const info = getSeriesInfo(series, match);
      const phaseConfig = getPhaseConfig(match.phase);
      return { match, info, phaseConfig };
    });
  }, [upcomingLiguilla, seriesGroups]);

  const handleDownload = useCallback((cardIndex: number) => {
    const card = cards[cardIndex];
    if (!card) return;
    const { match, info, phaseConfig } = card;
    const dateStr = formatDateSpanish(match.scheduled_date);
    const timeStr = match.time_str ?? 'Hora por confirmar';
    const court = match.court ?? 'Cancha Bicentenario';
    const gameLabel = info.totalGames > 1 ? `Juego ${info.gameNumber} de ${info.totalGames}` : 'Partido Único';

    try {
      const dataUrl = generateBillboardImage(
        phaseConfig.label,
        phaseConfig.bgLabel,
        match.home_team?.name ?? 'Local',
        match.away_team?.name ?? 'Visitante',
        getTeamColor(match.home_team_id),
        getTeamColor(match.away_team_id),
        dateStr,
        timeStr,
        court,
        gameLabel,
        info.seriesLabel,
        phaseConfig.accent,
      );
      const link = document.createElement('a');
      link.download = `liguilla_${match.home_team?.name ?? 'local'}_vs_${match.away_team?.name ?? 'visitante'}.png`;
      link.href = dataUrl;
      link.click();
      message.success('¡Imagen lista para compartir! 🏀');
    } catch {
      message.error('Error al generar la imagen');
    }
  }, [cards]);

  if (cards.length === 0) return null;

  const current = cards[currentIndex];
  if (!current) return null;

  const { match, info, phaseConfig } = current;
  const dateStr = formatDateSpanish(match.scheduled_date);
  const timeStr = match.time_str ?? 'Hora por confirmar';
  const court = match.court ?? 'Cancha Bicentenario';
  const gameLabel = info.totalGames > 1 ? `Juego ${info.gameNumber} de ${info.totalGames}` : 'Partido Único';
  const homeWins = match.home_team_id === info.teamA_id ? info.winsA : info.winsB;
  const awayWins = match.away_team_id === info.teamA_id ? info.winsA : info.winsB;
  const homeLeader = homeWins > awayWins;
  const awayLeader = awayWins > homeWins;

  return (
    <div style={{ maxWidth: 1120, margin: '20px auto 14px', padding: '0 14px' }}>
      <div
        className="billboard-card"
        style={{
          background: 'linear-gradient(180deg, rgba(20, 26, 38, 0.92), rgba(10, 14, 22, 0.96))',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 20px 48px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Cabecera del encuentro */}
        <div
          style={{
            background: 'rgba(7, 9, 14, 0.85)',
            padding: '12px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: phaseConfig.accent,
                display: 'inline-block',
              }}
            />
            <span style={{ color: phaseConfig.accent, fontSize: 12, fontWeight: 800, letterSpacing: '0.14em' }}>
              {phaseConfig.label}
            </span>
          </div>
          <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>
            {gameLabel}
          </span>
        </div>

        {/* Zona de Equipos (Matchup) */}
        <div style={{ padding: '22px 18px 18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Local */}
            <div
              className={`billboard-score-card${homeLeader ? ' billboard-score-card--leader' : ''}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <AvatarBadge name={match.home_team?.name ?? 'Local'} teamId={match.home_team_id} size={46} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {match.home_team?.name ?? 'Local'}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>Local</div>
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: homeLeader ? 'var(--gold-soft)' : '#94a3b8' }}>
                {homeWins}
              </div>
            </div>

            {/* Separador VS con estado de serie */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
              <div style={{ color: 'var(--gold-accent)', fontWeight: 800, fontSize: 11, letterSpacing: '0.1em' }}>
                {info.seriesLabel}
              </div>
              <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
            </div>

            {/* Visitante */}
            <div
              className={`billboard-score-card${awayLeader ? ' billboard-score-card--leader' : ''}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <AvatarBadge name={match.away_team?.name ?? 'Visitante'} teamId={match.away_team_id} size={46} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {match.away_team?.name ?? 'Visitante'}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>Visitante</div>
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: awayLeader ? 'var(--gold-soft)' : '#94a3b8' }}>
                {awayWins}
              </div>
            </div>
          </div>
        </div>

        {/* Detalles del Encuentro: Cancha, Fecha, Hora */}
        <div
          style={{
            background: 'rgba(8, 11, 17, 0.75)',
            padding: '16px 18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>
                🗓 {dateStr}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                📍 {court}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--gold-soft)', fontSize: 22, fontWeight: 900, lineHeight: 1 }}>
                {timeStr}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
                Inicio
              </div>
            </div>
          </div>

          <Button
            block
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(currentIndex)}
            className="premium-button"
            style={{
              marginTop: 14,
              height: 44,
              borderRadius: 10,
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Descargar Tarjeta para Redes
          </Button>
        </div>
      </div>

      {/* Navegación entre tarjetas si hay más de 1 */}
      {cards.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 14 }}>
          <Button
            shape="circle"
            aria-label="Partido anterior"
            icon={<LeftOutlined />}
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(i => i - 1)}
            style={{ width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff' }}
          />
          <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>
            {currentIndex + 1} / {cards.length}
          </div>
          <Button
            shape="circle"
            aria-label="Siguiente partido"
            icon={<RightOutlined />}
            disabled={currentIndex === cards.length - 1}
            onClick={() => setCurrentIndex(i => i + 1)}
            style={{ width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#fff' }}
          />
        </div>
      )}
    </div>
  );
}
