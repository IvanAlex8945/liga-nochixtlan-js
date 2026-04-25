'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Typography, Button, message } from 'antd';
import { DownloadOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

const { Text } = Typography;

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

/* ── Color Palette (curated, harmonious) ─────────────────── */
const TEAM_COLORS = [
  '#E63946', '#457B9D', '#2A9D8F', '#E9C46A', '#F4A261',
  '#264653', '#6A0572', '#1B998B', '#FF6B6B', '#4ECDC4',
  '#D4A373', '#8338EC', '#FF006E', '#3A86FF', '#06D6A0',
];

function getTeamColor(teamId: number): string {
  return TEAM_COLORS[teamId % TEAM_COLORS.length];
}

function getTeamInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

/* ── Phase theming ───────────────────────────────────────── */
const PHASE_CONFIG: Record<string, { label: string; gradient: string; glow: string; accent: string }> = {
  'Cuartos de Final': {
    label: 'CUARTOS DE FINAL',
    gradient: 'linear-gradient(135deg, #1677ff 0%, #0050b3 100%)',
    glow: '#1677ff',
    accent: '#1677ff',
  },
  'Octavos de Final': {
    label: 'OCTAVOS DE FINAL',
    gradient: 'linear-gradient(135deg, #1677ff 0%, #0050b3 100%)',
    glow: '#1677ff',
    accent: '#1677ff',
  },
  'Semifinal': {
    label: 'SEMIFINALES',
    gradient: 'linear-gradient(135deg, #f5222d 0%, #a8071a 100%)',
    glow: '#f5222d',
    accent: '#f5222d',
  },
  'Final': {
    label: 'LA GRAN FINAL',
    gradient: 'linear-gradient(135deg, #FAAD14 0%, #d48806 100%)',
    glow: '#FAAD14',
    accent: '#FAAD14',
  },
  'Tercer Lugar': {
    label: 'TERCER LUGAR',
    gradient: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
    glow: '#722ed1',
    accent: '#722ed1',
  },
};

function getPhaseConfig(phase: string) {
  return PHASE_CONFIG[phase] ?? {
    label: phase.toUpperCase(),
    gradient: 'linear-gradient(135deg, #FAAD14 0%, #d48806 100%)',
    glow: '#FAAD14',
    accent: '#FAAD14',
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

  // Count wins only for played matches BEFORE current match
  seriesMatches.forEach(m => {
    if (m.id === currentMatch.id) return; // don't count the current game
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
  if (!dateStr) return 'Fecha por confirmar';
  let d = dayjs(dateStr);
  if (!dateStr.includes('T')) {
    d = dayjs(dateStr + 'T12:00:00');
  }
  // "Jueves, 30 de abril de 2026"
  return d.locale('es').format('dddd, DD [de] MMMM [de] YYYY')
    .replace(/^\w/, c => c.toUpperCase());
}

/* ── Canvas Image Generation ─────────────────────────────── */
function generateBillboardImage(
  phase: string,
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

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0a0a0a');
  bgGrad.addColorStop(0.5, '#141414');
  bgGrad.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle pattern lines
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < H; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(W, i);
    ctx.stroke();
  }

  // Top accent bar
  const barGrad = ctx.createLinearGradient(0, 0, W, 0);
  barGrad.addColorStop(0, 'transparent');
  barGrad.addColorStop(0.3, accent);
  barGrad.addColorStop(0.7, accent);
  barGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, 0, W, 6);

  // Glow circle behind center
  const glowGrad = ctx.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H * 0.45, 400);
  glowGrad.addColorStop(0, accent + '22');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  // "🏆 LIGA MUNICIPAL DE BÁSQUETBOL 🏆"
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FAAD14';
  ctx.font = '700 36px Inter, Arial, sans-serif';
  ctx.fillText('🏆 LIGA MUNICIPAL DE BÁSQUETBOL 🏆', W / 2, 120);

  // Liga name
  ctx.fillStyle = '#fff';
  ctx.font = '900 56px Inter, Arial, sans-serif';
  ctx.fillText('NOCHIXTLÁN', W / 2, 200);

  // Divider
  const divGrad = ctx.createLinearGradient(W * 0.15, 0, W * 0.85, 0);
  divGrad.addColorStop(0, 'transparent');
  divGrad.addColorStop(0.5, accent);
  divGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = divGrad;
  ctx.fillRect(W * 0.15, 240, W * 0.7, 3);

  // Phase
  ctx.fillStyle = accent;
  ctx.font = '900 64px Inter, Arial, sans-serif';
  ctx.fillText(getPhaseConfig(phase).label, W / 2, 330);

  // Date
  ctx.fillStyle = '#ccc';
  ctx.font = '500 34px Inter, Arial, sans-serif';
  ctx.fillText(`🗓  ${dateStr}`, W / 2, 420);

  // Court
  ctx.fillStyle = '#aaa';
  ctx.font = '500 30px Inter, Arial, sans-serif';
  ctx.fillText(`📍  ${court}`, W / 2, 470);

  // ── TEAM A ────────────────────────────────────────────
  const teamY = 650;

  // Avatar A
  ctx.beginPath();
  ctx.arc(W / 2, teamY, 90, 0, Math.PI * 2);
  ctx.fillStyle = homeColor + '33';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W / 2, teamY, 88, 0, Math.PI * 2);
  ctx.strokeStyle = homeColor;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = homeColor;
  ctx.font = '900 72px Inter, Arial, sans-serif';
  ctx.fillText(getTeamInitial(homeName), W / 2, teamY + 26);

  // Home name
  ctx.fillStyle = '#fff';
  ctx.font = '900 52px Inter, Arial, sans-serif';
  ctx.fillText(homeName.toUpperCase(), W / 2, teamY + 150);

  // VS
  ctx.fillStyle = '#555';
  ctx.font = '900 80px Inter, Arial, sans-serif';
  ctx.fillText('VS', W / 2, teamY + 270);

  // Avatar B
  const teamBY = teamY + 390;
  ctx.beginPath();
  ctx.arc(W / 2, teamBY, 90, 0, Math.PI * 2);
  ctx.fillStyle = awayColor + '33';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W / 2, teamBY, 88, 0, Math.PI * 2);
  ctx.strokeStyle = awayColor;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = awayColor;
  ctx.font = '900 72px Inter, Arial, sans-serif';
  ctx.fillText(getTeamInitial(awayName), W / 2, teamBY + 26);

  // Away name
  ctx.fillStyle = '#fff';
  ctx.font = '900 52px Inter, Arial, sans-serif';
  ctx.fillText(awayName.toUpperCase(), W / 2, teamBY + 150);

  // ── BOTTOM INFO ────────────────────────────────────
  const bottomY = 1480;

  // Divider
  ctx.fillStyle = divGrad;
  ctx.fillRect(W * 0.15, bottomY - 30, W * 0.7, 3);

  // Game label & series
  ctx.fillStyle = accent;
  ctx.font = '700 38px Inter, Arial, sans-serif';
  ctx.fillText(gameLabel, W / 2, bottomY + 30);

  ctx.fillStyle = '#ccc';
  ctx.font = '500 32px Inter, Arial, sans-serif';
  ctx.fillText(seriesLabel, W / 2, bottomY + 80);

  // Time
  ctx.fillStyle = '#fff';
  ctx.font = '900 60px Inter, Arial, sans-serif';
  ctx.fillText(`🏀  ${timeStr}`, W / 2, bottomY + 170);

  // Bottom accent bar
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, H - 6, W, 6);

  // Footer
  ctx.fillStyle = '#444';
  ctx.font = '400 22px Inter, Arial, sans-serif';
  ctx.fillText('Liga Municipal de Básquetbol de Nochixtlán', W / 2, H - 40);

  return canvas.toDataURL('image/png');
}

/* ── Avatar Badge Component ──────────────────────────────── */
function AvatarBadge({ name, teamId, size = 64 }: { name: string; teamId: number; size?: number }) {
  const color = getTeamColor(teamId);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${color}44, ${color}11)`,
      border: `3px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 0 20px ${color}33, inset 0 0 15px ${color}11`,
      flexShrink: 0,
    }}>
      <span style={{ color, fontSize: size * 0.45, fontWeight: 900, lineHeight: 1 }}>
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Get all Liguilla matches that are still "Programado"
  const upcomingLiguilla = useMemo(() => {
    const liguillaPhases = ['Cuartos de Final', 'Octavos de Final', 'Semifinal', 'Final', 'Tercer Lugar'];
    return seasonMatches.filter(
      m => liguillaPhases.includes(m.phase ?? '') && m.status === 'Programado'
    ).sort((a, b) => {
      // Sort by date then time
      const dateA = a.scheduled_date ?? '9999';
      const dateB = b.scheduled_date ?? '9999';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.time_str ?? '').localeCompare(b.time_str ?? '');
    });
  }, [seasonMatches]);

  // All Liguilla matches (for series context)
  const allLiguilla = useMemo(() => {
    const liguillaPhases = ['Cuartos de Final', 'Octavos de Final', 'Semifinal', 'Final', 'Tercer Lugar'];
    return seasonMatches.filter(m => liguillaPhases.includes(m.phase ?? ''));
  }, [seasonMatches]);

  const seriesGroups = useMemo(() => groupSeriesForBillboard(allLiguilla), [allLiguilla]);

  // Build cards data
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

  const goNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, cards.length - 1));
  }, [cards.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

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
        match.phase,
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
      message.success('¡Imagen descargada! Lista para compartir en redes 📱');
    } catch {
      message.error('Error al generar la imagen');
    }
  }, [cards]);

  // Don't render if no upcoming liguilla matches
  if (cards.length === 0) return null;

  const current = cards[currentIndex];
  if (!current) return null;

  const { match, info, phaseConfig } = current;
  const dateStr = formatDateSpanish(match.scheduled_date);
  const timeStr = match.time_str ?? 'Hora por confirmar';
  const court = match.court ?? 'Cancha Bicentenario';
  const gameLabel = info.totalGames > 1 ? `Juego ${info.gameNumber} de ${info.totalGames}` : 'Partido Único';

  return (
    <div ref={containerRef} style={{ maxWidth: 520, margin: '20px auto 8px', padding: '0 12px' }}>

      {/* Card container */}
      <div className="billboard-card" style={{
        background: 'linear-gradient(160deg, #1a1a1a 0%, #0d0d0d 60%, #111 100%)',
        border: `1px solid ${phaseConfig.accent}33`,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: `0 0 40px ${phaseConfig.accent}15, 0 8px 32px rgba(0,0,0,0.8)`,
      }}>
        {/* Top accent bar */}
        <div style={{
          height: 4,
          background: phaseConfig.gradient,
          boxShadow: `0 0 20px ${phaseConfig.accent}66`,
        }} />

        {/* Subtle background glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 300, height: 300,
          background: `radial-gradient(circle, ${phaseConfig.accent}08 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ textAlign: 'center', padding: '20px 16px 0', position: 'relative', zIndex: 1 }}>
          <div style={{
            color: '#FAAD14', fontSize: 11, fontWeight: 700, letterSpacing: 2,
            marginBottom: 4,
          }}>
            🏆 LIGA MUNICIPAL DE BÁSQUETBOL 🏆
          </div>
          <div style={{
            color: phaseConfig.accent, fontSize: 22, fontWeight: 900,
            letterSpacing: 3, textTransform: 'uppercase',
            textShadow: `0 0 20px ${phaseConfig.accent}44`,
            marginBottom: 2,
          }}>
            {phaseConfig.label}
          </div>
          {/* Divider */}
          <div style={{
            height: 2, width: '50%', margin: '8px auto',
            background: `linear-gradient(90deg, transparent, ${phaseConfig.accent}, transparent)`,
          }} />
        </div>

        {/* Date & Venue */}
        <div style={{ textAlign: 'center', padding: '8px 16px 0', position: 'relative', zIndex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
            🗓 {dateStr}
          </div>
          <div style={{ color: '#888', fontSize: 12, fontWeight: 500 }}>
            📍 {court}
          </div>
        </div>

        {/* ── MATCHUP ──────────────────────────────────── */}
        <div style={{
          padding: '24px 20px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 16, position: 'relative', zIndex: 1,
        }}>
          {/* Home Team */}
          <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <AvatarBadge name={match.home_team?.name ?? 'L'} teamId={match.home_team_id} size={72} />
            <div style={{
              color: '#fff', fontWeight: 800, fontSize: 15, lineHeight: 1.2,
              textTransform: 'uppercase', letterSpacing: 0.5,
              maxWidth: 140, wordBreak: 'break-word',
            }}>
              {match.home_team?.name ?? 'Local'}
            </div>
          </div>

          {/* VS */}
          <div style={{
            color: '#444', fontWeight: 900, fontSize: 28,
            textShadow: '0 0 10px rgba(255,255,255,0.05)',
            flexShrink: 0,
          }}>
            VS
          </div>

          {/* Away Team */}
          <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <AvatarBadge name={match.away_team?.name ?? 'V'} teamId={match.away_team_id} size={72} />
            <div style={{
              color: '#fff', fontWeight: 800, fontSize: 15, lineHeight: 1.2,
              textTransform: 'uppercase', letterSpacing: 0.5,
              maxWidth: 140, wordBreak: 'break-word',
            }}>
              {match.away_team?.name ?? 'Visitante'}
            </div>
          </div>
        </div>

        {/* ── Game Info Bar ────────────────────────────── */}
        <div style={{
          background: '#000000cc',
          borderTop: `1px solid ${phaseConfig.accent}22`,
          borderBottom: `1px solid ${phaseConfig.accent}22`,
          padding: '10px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ color: phaseConfig.accent, fontSize: 13, fontWeight: 700 }}>
              {gameLabel}
            </span>
            <span style={{ color: '#888', fontSize: 11 }}>
              {info.seriesLabel}
            </span>
          </div>
          <div style={{
            color: '#fff', fontSize: 18, fontWeight: 900,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            🏀 <span>{timeStr}</span>
          </div>
        </div>

        {/* ── Download Button ─────────────────────────── */}
        <div style={{ padding: '12px 16px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(currentIndex)}
            style={{
              background: 'transparent',
              border: `1px solid ${phaseConfig.accent}55`,
              color: phaseConfig.accent,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 12,
              transition: 'all 0.3s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = phaseConfig.accent + '22';
              e.currentTarget.style.borderColor = phaseConfig.accent;
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = phaseConfig.accent + '55';
            }}
          >
            📱 Descargar para Redes
          </Button>
        </div>

        {/* Bottom accent bar */}
        <div style={{
          height: 3,
          background: phaseConfig.gradient,
          boxShadow: `0 0 15px ${phaseConfig.accent}44`,
        }} />
      </div>

      {/* ── Carousel Navigation ──────────────────────── */}
      {cards.length > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 16, marginTop: 14,
        }}>
          <Button
            shape="circle"
            icon={<LeftOutlined />}
            disabled={currentIndex === 0}
            onClick={goPrev}
            size="small"
            style={{
              background: 'transparent',
              border: '1px solid #333',
              color: currentIndex === 0 ? '#333' : '#aaa',
            }}
          />

          {/* Dots */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {cards.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentIndex(i)}
                style={{
                  width: i === currentIndex ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === currentIndex ? phaseConfig.accent : '#333',
                  transition: 'all 0.3s',
                  cursor: 'pointer',
                  boxShadow: i === currentIndex ? `0 0 8px ${phaseConfig.accent}66` : 'none',
                }}
              />
            ))}
          </div>

          <Button
            shape="circle"
            icon={<RightOutlined />}
            disabled={currentIndex === cards.length - 1}
            onClick={goNext}
            size="small"
            style={{
              background: 'transparent',
              border: '1px solid #333',
              color: currentIndex === cards.length - 1 ? '#333' : '#aaa',
            }}
          />
        </div>
      )}

      {/* Match counter */}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <Text style={{ color: '#555', fontSize: 11 }}>
          {currentIndex + 1} de {cards.length} partidos programados
        </Text>
      </div>
    </div>
  );
}
