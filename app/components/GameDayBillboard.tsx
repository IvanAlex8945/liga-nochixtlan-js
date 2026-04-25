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
const PHASE_CONFIG: Record<string, { label: string; bgLabel: string; gradient: string; glow: string; accent: string }> = {
  'Cuartos de Final': {
    label: 'CUARTOS DE FINAL',
    bgLabel: 'CUARTOS',
    gradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
    glow: '#1677ff',
    accent: '#1677ff',
  },
  'Octavos de Final': {
    label: 'OCTAVOS DE FINAL',
    bgLabel: 'OCTAVOS',
    gradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
    glow: '#1677ff',
    accent: '#1677ff',
  },
  'Semifinal': {
    label: 'SEMIFINALES',
    bgLabel: 'SEMIS',
    gradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
    glow: '#f5222d',
    accent: '#f5222d',
  },
  'Final': {
    label: 'LA GRAN FINAL',
    bgLabel: 'FINAL',
    gradient: 'linear-gradient(135deg, #0d0d0d 0%, #141414 100%)',
    glow: '#FAAD14',
    accent: '#FAAD14',
  },
  'Tercer Lugar': {
    label: 'TERCER LUGAR',
    bgLabel: 'BRONCE',
    gradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
    glow: '#722ed1',
    accent: '#722ed1',
  },
};

function getPhaseConfig(phase: string) {
  return PHASE_CONFIG[phase] ?? {
    label: phase.toUpperCase(),
    bgLabel: 'LIGA',
    gradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
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

/* ── Canvas Image Generation (Premium) ───────────────────── */
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

  // Mesh-like background
  const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 1200);
  bgGrad.addColorStop(0, '#141414');
  bgGrad.addColorStop(1, '#050505');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Background glow
  const glowHome = ctx.createRadialGradient(W * 0.2, H * 0.45, 0, W * 0.2, H * 0.45, 600);
  glowHome.addColorStop(0, homeColor + '15');
  glowHome.addColorStop(1, 'transparent');
  ctx.fillStyle = glowHome;
  ctx.fillRect(0, 0, W, H);

  const glowAway = ctx.createRadialGradient(W * 0.8, H * 0.55, 0, W * 0.8, H * 0.55, 600);
  glowAway.addColorStop(0, awayColor + '15');
  glowAway.addColorStop(1, 'transparent');
  ctx.fillStyle = glowAway;
  ctx.fillRect(0, 0, W, H);

  // Big background text
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.font = '900 280px Inter, Arial, sans-serif';
  ctx.fillText(bgLabel, W / 2, H / 2 + 100);

  // Top header box
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, 260);
  
  // Accent bars
  ctx.fillStyle = accent;
  ctx.fillRect(0, 260, W, 4);

  // "LIGA MUNICIPAL DE BÁSQUETBOL"
  ctx.fillStyle = '#FAAD14';
  ctx.font = '700 32px Inter, Arial, sans-serif';
  ctx.letterSpacing = '8px';
  ctx.fillText('🏆 LIGA MUNICIPAL DE BÁSQUETBOL 🏆', W / 2, 110);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#fff';
  ctx.font = '900 64px Inter, Arial, sans-serif';
  ctx.fillText('NOCHIXTLÁN', W / 2, 190);

  // Phase Title
  ctx.fillStyle = accent;
  ctx.font = '900 80px Inter, Arial, sans-serif';
  ctx.fillText(phase, W / 2, 380);

  // Date/Court Row
  ctx.fillStyle = '#888';
  ctx.font = '600 36px Inter, Arial, sans-serif';
  ctx.fillText(`🗓  ${dateStr}`, W / 2, 460);
  ctx.fillText(`📍  ${court}`, W / 2, 515);

  // Teams Layout
  const nameY = 880;
  
  // Home
  ctx.fillStyle = homeColor;
  ctx.font = '900 200px Inter, Arial, sans-serif';
  ctx.fillText(getTeamInitial(homeName), W / 2 - 320, nameY);
  ctx.fillStyle = '#fff';
  ctx.font = '900 64px Inter, Arial, sans-serif';
  ctx.fillText(homeName.toUpperCase(), W / 2, nameY - 60);

  // VS
  ctx.fillStyle = '#333';
  ctx.font = '900 120px Inter, Arial, sans-serif';
  ctx.fillText('VS', W / 2, nameY + 60);

  // Away
  ctx.fillStyle = awayColor;
  ctx.font = '900 200px Inter, Arial, sans-serif';
  ctx.fillText(getTeamInitial(awayName), W / 2 + 320, nameY + 120);
  ctx.fillStyle = '#fff';
  ctx.font = '900 64px Inter, Arial, sans-serif';
  ctx.fillText(awayName.toUpperCase(), W / 2, nameY + 180);

  // Bottom Status Box
  const bottomBoxY = 1450;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(W * 0.1, bottomBoxY, W * 0.8, 300);
  ctx.strokeStyle = accent + '44';
  ctx.lineWidth = 2;
  ctx.strokeRect(W * 0.1, bottomBoxY, W * 0.8, 300);

  ctx.fillStyle = accent;
  ctx.font = '800 44px Inter, Arial, sans-serif';
  ctx.fillText(gameLabel, W / 2, bottomBoxY + 80);

  ctx.fillStyle = '#ccc';
  ctx.font = '500 36px Inter, Arial, sans-serif';
  ctx.fillText(seriesLabel, W / 2, bottomBoxY + 140);

  ctx.fillStyle = '#fff';
  ctx.font = '900 90px Inter, Arial, sans-serif';
  ctx.fillText(`🏀  ${timeStr}`, W / 2, bottomBoxY + 250);

  return canvas.toDataURL('image/png');
}

/* ── Avatar Badge Component ──────────────────────────────── */
function AvatarBadge({ name, teamId, size = 64 }: { name: string; teamId: number; size?: number }) {
  const color = getTeamColor(teamId);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${color}66, ${color}11)`,
      border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 0 25px ${color}22`,
      flexShrink: 0,
    }}>
      <span style={{ color, fontSize: size * 0.5, fontWeight: 900, lineHeight: 1 }}>
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
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  // Filter logic
  const upcomingLiguilla = useMemo(() => {
    const liguillaPhases = ['Cuartos de Final', 'Octavos de Final', 'Semifinal', 'Final', 'Tercer Lugar'];
    return seasonMatches.filter(
      m => liguillaPhases.includes(m.phase ?? '') && m.status === 'Programado'
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
    const y = ((e.clientX - rect.left) / rect.width - 0.5) * -10;
    setRotation({ x, y });
  };

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
  const { match, info, phaseConfig } = current!;
  const dateStr = formatDateSpanish(match.scheduled_date);
  const timeStr = match.time_str ?? 'Hora por confirmar';
  const court = match.court ?? 'Cancha Bicentenario';
  const gameLabel = info.totalGames > 1 ? `Juego ${info.gameNumber} de ${info.totalGames}` : 'Partido Único';

  return (
    <div style={{ maxWidth: 540, margin: '24px auto 12px', padding: '0 16px', perspective: 1000 }}>
      
      {/* Container with 3D Tilt */}
      <div 
        className="billboard-card"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setRotation({ x: 0, y: 0 })}
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          background: `linear-gradient(215deg, #0a0a0a, #1a1a1a, #050505)`,
          border: `1px solid ${phaseConfig.accent}44`,
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: `0 30px 60px rgba(0,0,0,0.5), 0 0 50px ${phaseConfig.accent}15`,
        }}
      >
        {/* Background text decoration */}
        <div className="billboard-text-bg" style={{ color: phaseConfig.accent }}>
          {phaseConfig.bgLabel}
        </div>

        {/* Top Header */}
        <div style={{ 
          background: 'rgba(0,0,0,0.8)', padding: '16px 20px', 
          borderBottom: `1px solid ${phaseConfig.accent}33`,
          textAlign: 'center', position: 'relative', zIndex: 2
        }}>
          <div style={{ color: '#FAAD14', fontSize: 10, fontWeight: 700, letterSpacing: 4, marginBottom: 2 }}>
            LIGA MUNICIPAL DE BÁSQUETBOL
          </div>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>
            NOCHIXTLÁN
          </div>
        </div>

        {/* Phase + Date */}
        <div style={{ padding: '24px 20px 0', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <div style={{ 
            color: phaseConfig.accent, fontSize: 28, fontWeight: 900, 
            textTransform: 'uppercase', marginBottom: 6,
            textShadow: `0 0 15px ${phaseConfig.glow}66`
          }}>
            {phaseConfig.label}
          </div>
          <div style={{ color: '#888', fontSize: 13, fontWeight: 500 }}>
            {dateStr}
          </div>
        </div>

        {/* Teams Area */}
        <div style={{ padding: '30px 20px 20px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Team A */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <AvatarBadge name={match.home_team?.name ?? 'L'} teamId={match.home_team_id} size={56} />
              <div style={{ color: '#fff', fontSize: 24, fontWeight: 900, textTransform: 'uppercase' }}>
                {match.home_team?.name ?? 'Local'}
              </div>
            </div>

            {/* VS Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ color: '#333', fontWeight: 900, fontSize: 32 }}>VS</div>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Team B */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
              <div style={{ color: '#fff', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', textAlign: 'right' }}>
                {match.away_team?.name ?? 'Visitante'}
              </div>
              <AvatarBadge name={match.away_team?.name ?? 'V'} teamId={match.away_team_id} size={56} />
            </div>
          </div>
        </div>

        {/* Details Footer */}
        <div style={{ 
          background: 'rgba(0,0,0,0.6)', padding: '20px',
          borderTop: `1px solid ${phaseConfig.accent}22`,
          position: 'relative', zIndex: 2
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ color: phaseConfig.accent, fontSize: 16, fontWeight: 800 }}>{gameLabel}</div>
              <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>{info.seriesLabel}</div>
              <div style={{ color: '#aaa', fontSize: 14 }}>📍 {court}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#fff', fontSize: 32, fontWeight: 900, lineHeight: 1 }}>
                {timeStr}
              </div>
              <div style={{ color: '#555', fontSize: 11, fontWeight: 700, marginTop: 4 }}>
                HORARIO DE INICIO
              </div>
            </div>
          </div>

          <Button
            block
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(currentIndex)}
            style={{ 
              marginTop: 20, 
              background: phaseConfig.accent, 
              border: 'none', 
              color: '#000', 
              fontWeight: 800,
              height: 44,
              borderRadius: 12,
              boxShadow: `0 4px 15px ${phaseConfig.glow}44`
            }}
          >
            DESCARGAR PARA REDES
          </Button>
        </div>
      </div>

      {/* Navigation */}
      {cards.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 24 }}>
          <Button shape="circle" icon={<LeftOutlined />} disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i-1)} style={{ background: '#111', border: '1px solid #333', color: '#fff' }} />
          <div style={{ color: '#444', fontSize: 12, fontWeight: 700 }}>{currentIndex + 1} / {cards.length}</div>
          <Button shape="circle" icon={<RightOutlined />} disabled={currentIndex === cards.length - 1} onClick={() => setCurrentIndex(i => i+1)} style={{ background: '#111', border: '1px solid #333', color: '#fff' }} />
        </div>
      )}
    </div>
  );
}
