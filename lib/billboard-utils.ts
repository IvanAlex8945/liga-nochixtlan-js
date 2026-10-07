import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { getTeamLogoUrl } from './team-logos';

dayjs.locale('es');

/* ── Types ───────────────────────────────────────────────── */
export interface TeamData {
  id: number;
  name: string;
}

export interface MatchData {
  id: number;
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
  season_id?: number | null;
}

/* ── Color Palette (curated, athletic) ───────────────────── */
export const TEAM_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#e11d48',
  '#84cc16', '#0ea5e9', '#d946ef', '#f43f5e', '#a855f7',
];

export function getTeamColor(teamId: number): string {
  return TEAM_COLORS[Math.abs(teamId || 0) % TEAM_COLORS.length];
}

export function getTeamInitial(name: string): string {
  return (name || '').trim().charAt(0).toUpperCase() || '🏀';
}

/* ── Phase theming ───────────────────────────────────────── */
export const PHASE_CONFIG: Record<string, { label: string; bgLabel: string; accent: string }> = {
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

export function getPhaseConfig(phase?: string | null) {
  if (!phase) {
    return {
      label: 'LIGUILLA',
      bgLabel: 'PLAYOFFS',
      accent: '#f59e0b',
    };
  }
  return PHASE_CONFIG[phase] ?? {
    label: phase.toUpperCase(),
    bgLabel: 'PLAYOFFS',
    accent: '#f59e0b',
  };
}

/* ── Series status helpers ───────────────────────────────── */
export function groupSeriesForBillboard(allMatches: MatchData[]): MatchData[][] {
  const map: Record<string, MatchData[]> = {};
  allMatches.forEach((m) => {
    const h = m.home_team_id || 0;
    const a = m.away_team_id || 0;
    const key = `${m.phase}::${Math.min(h, a)}-${Math.max(h, a)}`;
    if (!map[key]) map[key] = [];
    map[key].push(m);
  });
  return Object.values(map).map((list) =>
    list.sort((a, b) => (a.jornada || 0) - (b.jornada || 0))
  );
}

export interface SeriesInfo {
  winsA: number;
  winsB: number;
  teamA_id: number;
  teamB_id: number;
  teamA_name: string;
  teamB_name: string;
  seriesLabel: string;
  gameNumber: number;
  totalGames: number;
  isCompleted: boolean;
  winnerName?: string;
}

export function getSeriesInfo(seriesMatches: MatchData[], currentMatch?: MatchData): SeriesInfo {
  if (!seriesMatches || seriesMatches.length === 0) {
    return {
      winsA: 0,
      winsB: 0,
      teamA_id: 0,
      teamB_id: 0,
      teamA_name: 'Equipo A',
      teamB_name: 'Equipo B',
      seriesLabel: 'Serie por disputar',
      gameNumber: 1,
      totalGames: 1,
      isCompleted: false,
    };
  }

  const tA_id = seriesMatches[0].home_team_id || 0;
  const tB_id = seriesMatches[0].away_team_id || 0;
  const tA_name = seriesMatches[0].home_team?.name ?? 'Equipo A';
  const tB_name = seriesMatches[0].away_team?.name ?? 'Equipo B';

  let winsA = 0;
  let winsB = 0;

  seriesMatches.forEach((m) => {
    const isJugado = ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status || '');
    if (!isJugado) return;

    const homeWon = (m.home_score ?? 0) > (m.away_score ?? 0) || m.status === 'WO Visitante';
    const awayWon = (m.away_score ?? 0) > (m.home_score ?? 0) || m.status === 'WO Local';

    if (m.home_team_id === tA_id && homeWon) winsA++;
    if (m.away_team_id === tA_id && awayWon) winsA++;
    if (m.home_team_id === tB_id && homeWon) winsB++;
    if (m.away_team_id === tB_id && awayWon) winsB++;
  });

  const totalGames = seriesMatches.length;
  const targetWins = Math.ceil(totalGames / 2);
  const isCompleted = winsA >= targetWins || winsB >= targetWins;
  const winnerName = winsA >= targetWins ? tA_name : winsB >= targetWins ? tB_name : undefined;

  let gameNumber = 1;
  if (currentMatch) {
    const gameIndex = seriesMatches.findIndex((m) => m.id === currentMatch.id);
    if (gameIndex >= 0) {
      gameNumber = gameIndex + 1;
    }
  }

  let seriesLabel: string;
  if (isCompleted && winnerName) {
    seriesLabel = `Clasifica ${winnerName} (${Math.max(winsA, winsB)}-${Math.min(winsA, winsB)})`;
  } else if (winsA === 0 && winsB === 0) {
    seriesLabel = totalGames > 1 ? `Serie empatada 0-0 · Juego ${gameNumber}` : 'Partido Único';
  } else if (winsA === winsB) {
    seriesLabel = `Serie empatada ${winsA}-${winsB}`;
  } else if (winsA > winsB) {
    seriesLabel = `Serie ${winsA}-${winsB} favor ${tA_name}`;
  } else {
    seriesLabel = `Serie ${winsB}-${winsA} favor ${tB_name}`;
  }

  return {
    winsA,
    winsB,
    teamA_id: tA_id,
    teamB_id: tB_id,
    teamA_name: tA_name,
    teamB_name: tB_name,
    seriesLabel,
    gameNumber,
    totalGames,
    isCompleted,
    winnerName,
  };
}

/* ── Format date in Spanish ──────────────────────────────── */
export function formatDateSpanish(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Fecha por definir';
  let d = dayjs(dateStr);
  if (!dateStr.includes('T')) {
    d = dayjs(dateStr + 'T12:00:00');
  }
  return d
    .locale('es')
    .format('dddd, DD [de] MMMM [de] YYYY')
    .replace(/^\w/, (c) => c.toUpperCase());
}

/* ── Helper: Safe Canvas Image Loader ────────────────────── */
function loadCanvasImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* ── Canvas Image Generation (Espectacular Físico HD) ────── */
export async function generateBillboardImage(
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
  homeWins: number = 0,
  awayWins: number = 0,
  category: string = '3ra Fuerza'
): Promise<string> {
  const W = 1920;
  const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 1. Preload court texture and team logos
  const [courtImg, homeLogoImg, awayLogoImg] = await Promise.all([
    loadCanvasImage('/cancha_liguilla.jpg'),
    loadCanvasImage(getTeamLogoUrl(homeName) || ''),
    loadCanvasImage(getTeamLogoUrl(awayName) || ''),
  ]);

  // 2. Fondo cinematográfico de arena nocturna
  ctx.fillStyle = '#050811';
  ctx.fillRect(0, 0, W, H);

  // Gradiente radial de atmósfera
  const atmosphere = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1000);
  atmosphere.addColorStop(0, '#0c1322');
  atmosphere.addColorStop(1, '#03050a');
  ctx.fillStyle = atmosphere;
  ctx.fillRect(0, 0, W, H);

  // 3. Estructura del Espectacular
  const frameX = 80;
  const frameY = 130;
  const frameW = 1760;
  const frameH = 830;

  // Lona central impresa (fondo de cancha)
  const bannerX = frameX + 20;
  const bannerY = frameY + 20;
  const bannerW = frameW - 40;
  const bannerH = frameH - 40;

  if (courtImg) {
    ctx.save();
    ctx.drawImage(courtImg, bannerX, bannerY, bannerW, bannerH);
    ctx.restore();
  }

  // Overlay oscuro sobre la lona para contraste supremo
  const lonaOverlay = ctx.createLinearGradient(bannerX, bannerY, bannerX, bannerY + bannerH);
  lonaOverlay.addColorStop(0, 'rgba(8, 12, 22, 0.88)');
  lonaOverlay.addColorStop(0.5, 'rgba(10, 15, 26, 0.82)');
  lonaOverlay.addColorStop(1, 'rgba(5, 7, 14, 0.94)');
  ctx.fillStyle = lonaOverlay;
  ctx.fillRect(bannerX, bannerY, bannerW, bannerH);

  // 4. Haces de luz de los 3 reflectores (iluminación volumétrica)
  const lampXPositions = [480, 960, 1440];
  lampXPositions.forEach((lx) => {
    ctx.save();
    const beam = ctx.createLinearGradient(lx, 50, lx, 850);
    beam.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
    beam.addColorStop(0.3, 'rgba(254, 240, 138, 0.12)');
    beam.addColorStop(0.8, 'rgba(254, 240, 138, 0.02)');
    beam.addColorStop(1, 'transparent');

    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(lx - 25, 60);
    ctx.lineTo(lx + 25, 60);
    ctx.lineTo(lx + 260, 850);
    ctx.lineTo(lx - 260, 850);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  // 5. Marco de Acero Industrial y remaches
  ctx.save();
  ctx.lineWidth = 20;
  const steelGrad = ctx.createLinearGradient(frameX, frameY, frameX + frameW, frameY + frameH);
  steelGrad.addColorStop(0, '#475569');
  steelGrad.addColorStop(0.2, '#1e293b');
  steelGrad.addColorStop(0.5, '#334155');
  steelGrad.addColorStop(0.8, '#0f172a');
  steelGrad.addColorStop(1, '#334155');
  ctx.strokeStyle = steelGrad;
  ctx.strokeRect(frameX, frameY, frameW, frameH);

  // Borde exterior fino de brillo metálico
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.strokeRect(frameX - 10, frameY - 10, frameW + 20, frameH + 20);

  // Placas esquineras de acero con remaches
  const cornerSize = 40;
  ctx.fillStyle = '#334155';
  ctx.fillRect(frameX - 10, frameY - 10, cornerSize, cornerSize);
  ctx.fillRect(frameX + frameW - cornerSize + 10, frameY - 10, cornerSize, cornerSize);
  ctx.fillRect(frameX - 10, frameY + frameH - cornerSize + 10, cornerSize, cornerSize);
  ctx.fillRect(frameX + frameW - cornerSize + 10, frameY + frameH - cornerSize + 10, cornerSize, cornerSize);

  // Remaches metálicos
  const drawRivet = (rx: number, ry: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(rx, ry, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#64748b';
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Brillo del remache
    ctx.beginPath();
    ctx.arc(rx - 2, ry - 2, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
    ctx.restore();
  };

  for (let step = 0.15; step <= 0.85; step += 0.1) {
    drawRivet(frameX + frameW * step, frameY);
    drawRivet(frameX + frameW * step, frameY + frameH);
  }
  for (let step = 0.25; step <= 0.75; step += 0.25) {
    drawRivet(frameX, frameY + frameH * step);
    drawRivet(frameX + frameW, frameY + frameH * step);
  }
  ctx.restore();

  // 6. Lámparas físicas superiores (hardware)
  lampXPositions.forEach((lx) => {
    ctx.save();
    // Brazo metálico
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(lx, frameY);
    ctx.lineTo(lx, 50);
    ctx.stroke();

    // Carcasa de la lámpara
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.fillRect(lx - 32, 40, 64, 24);
    ctx.strokeRect(lx - 32, 40, 64, 24);

    // Foco halógeno encendido
    ctx.beginPath();
    ctx.arc(lx, 64, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 25;
    ctx.fill();
    ctx.restore();
  });

  // 7. Pasarela inferior de mantenimiento (Catwalk)
  const catwalkY = frameY + frameH;
  ctx.save();
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(frameX, catwalkY, frameW, 30);

  // Rayas de precaución amarillas y negras
  ctx.beginPath();
  ctx.rect(frameX, catwalkY + 22, frameW, 8);
  ctx.clip();
  for (let sx = frameX; sx < frameX + frameW + 40; sx += 30) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(sx, catwalkY + 30);
    ctx.lineTo(sx + 15, catwalkY + 22);
    ctx.lineTo(sx + 30, catwalkY + 22);
    ctx.lineTo(sx + 15, catwalkY + 30);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 8. Cabecera Oficial en la Lona
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(W / 2 - 250, frameY + 55, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '800 20px Inter, Arial, sans-serif';
  ctx.fillText('POSTEMPORADA OFICIAL', W / 2 - 120, frameY + 62);

  ctx.fillStyle = accent;
  ctx.font = '900 24px Inter, Arial, sans-serif';
  ctx.fillText(phase.toUpperCase(), W / 2 + 100, frameY + 62);

  if (category) {
    ctx.fillStyle = '#f59e0b';
    ctx.font = '800 18px Inter, Arial, sans-serif';
    ctx.fillText(`· ${category.toUpperCase()}`, W / 2 + 250, frameY + 62);
  }

  // Título Principal de la Liga
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px Inter, Arial, sans-serif';
  ctx.fillText('LIGA MUNICIPAL DE BÁSQUETBOL NOCHIXTLÁN', W / 2, frameY + 110);

  // 9. Los Dos Grandes Letreros Publicitarios
  const signY = frameY + 140;
  const signW = 680;
  const signH = 460;
  const leftSignX = frameX + 60;
  const rightSignX = frameX + frameW - signW - 60;

  const drawTeamSign = (
    sx: number,
    sy: number,
    isHome: boolean,
    teamName: string,
    wins: number,
    logoImg: HTMLImageElement | null
  ) => {
    ctx.save();
    // Fondo de letrero de espectacular con marco metálico
    const signGrad = ctx.createLinearGradient(sx, sy, sx + signW, sy + signH);
    signGrad.addColorStop(0, '#0f172a');
    signGrad.addColorStop(0.5, '#131b2e');
    signGrad.addColorStop(1, '#0a0f1d');
    ctx.fillStyle = signGrad;
    ctx.fillRect(sx, sy, signW, signH);

    ctx.lineWidth = 3;
    ctx.strokeStyle = isHome ? 'rgba(245, 158, 11, 0.6)' : 'rgba(148, 163, 184, 0.4)';
    ctx.strokeRect(sx, sy, signW, signH);

    // Placa superior del rol (LOCAL / VISITANTE)
    ctx.fillStyle = isHome ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(sx + 24, sy + 24, 140, 36);
    ctx.strokeStyle = isHome ? '#f59e0b' : '#64748b';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 24, sy + 24, 140, 36);

    ctx.fillStyle = isHome ? '#f59e0b' : '#cbd5e1';
    ctx.font = '900 16px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isHome ? 'LOCAL' : 'VISITANTE', sx + 94, sy + 48);

    // Logo del equipo (Imagen IA o Emblema Deportivo)
    const logoSize = 130;
    const logoCenterX = sx + signW / 2;
    const logoCenterY = sy + 150;

    if (logoImg) {
      // Dibujar imagen de logo circular con anillo de oro
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoCenterX, logoCenterY, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, logoCenterX - logoSize / 2, logoCenterY - logoSize / 2, logoSize, logoSize);
      ctx.restore();

      // Borde dorado reluciente
      ctx.beginPath();
      ctx.arc(logoCenterX, logoCenterY, logoSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
      ctx.shadowBlur = 15;
      ctx.stroke();
    } else {
      // Escudo deportivo vectorial de respaldo
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoCenterX, logoCenterY, logoSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = isHome ? '#1e3a8a' : '#312e81';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 52px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(getTeamInitial(teamName), logoCenterX, logoCenterY + 18);
      ctx.restore();
    }

    // Nombre Gigante del Equipo en Letras de Cartelera
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px Inter, Arial, sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 10;
    // Ajustar si el nombre es muy largo
    const displayName = teamName.toUpperCase();
    if (displayName.length > 15) {
      ctx.font = '900 34px Inter, Arial, sans-serif';
    }
    ctx.fillText(displayName, sx + signW / 2, sy + 280);

    // Barra de Victorias en la Serie
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + 30, sy + 350);
    ctx.lineTo(sx + signW - 30, sy + 350);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 18px Inter, Arial, sans-serif';
    ctx.fillText('VICTORIAS EN SERIE', sx + 40, sy + 410);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 56px Inter, Arial, sans-serif';
    ctx.fillText(`${wins}`, sx + signW - 40, sy + 420);

    ctx.restore();
  };

  // Dibujar ambos letreros
  drawTeamSign(leftSignX, signY, true, homeName, homeWins, homeLogoImg);
  drawTeamSign(rightSignX, signY, false, awayName, awayWins, awayLogoImg);

  // 10. Núcleo Central: VS y Estado de Serie
  const centerCenterX = W / 2;
  const centerCenterY = signY + 160;

  // Emblema VS central
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerCenterX, centerCenterY, 54, 0, Math.PI * 2);
  const vsGrad = ctx.createLinearGradient(centerCenterX - 50, centerCenterY - 50, centerCenterX + 50, centerCenterY + 50);
  vsGrad.addColorStop(0, '#f59e0b');
  vsGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = vsGrad;
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 25;
  ctx.fill();

  ctx.fillStyle = '#050811';
  ctx.font = '900 36px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VS', centerCenterX, centerCenterY + 12);
  ctx.restore();

  // Caja LED de estado de serie
  ctx.save();
  const ledBoxW = 420;
  const ledBoxH = 65;
  const ledBoxX = centerCenterX - ledBoxW / 2;
  const ledBoxY = centerCenterY + 80;

  ctx.fillStyle = 'rgba(10, 14, 25, 0.95)';
  ctx.fillRect(ledBoxX, ledBoxY, ledBoxW, ledBoxH);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.strokeRect(ledBoxX, ledBoxY, ledBoxW, ledBoxH);

  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 20px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(seriesLabel.toUpperCase(), centerCenterX, ledBoxY + 40);
  ctx.restore();

  // 11. Barra Inferior de Información del Partido
  const infoBarY = frameY + frameH - 120;
  ctx.save();
  ctx.fillStyle = 'rgba(7, 11, 20, 0.88)';
  ctx.fillRect(frameX + 60, infoBarY, frameW - 120, 75);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(frameX + 60, infoBarY, frameW - 120, 75);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '800 22px Inter, Arial, sans-serif';
  ctx.fillText(
    `🗓  ${dateStr.toUpperCase()}    |    🏀  ${timeStr.toUpperCase()}    |    📍  ${court.toUpperCase()}`,
    W / 2,
    infoBarY + 46
  );
  ctx.restore();

  return canvas.toDataURL('image/png');
}
