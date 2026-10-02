'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Button, Tooltip, App } from 'antd';
import {
  DownloadOutlined,
  LeftOutlined,
  RightOutlined,
  TrophyOutlined,
  FullscreenOutlined,
  FireOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons';
import {
  MatchData,
  groupSeriesForBillboard,
  getSeriesInfo,
  getPhaseConfig,
  getTeamColor,
  getTeamInitial,
  formatDateSpanish,
  generateBillboardImage,
} from '@/lib/billboard-utils';
import LiguillaHubModal from './LiguillaHubModal';
import PhysicalBillboardStructure from './PhysicalBillboardStructure';

export interface GameDayBillboardProps {
  seasonMatches: MatchData[];
  seasonName?: string;
  category?: string;
  onNavigateToBracket?: () => void;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function GameDayBillboard({
  seasonMatches,
  seasonName,
  category,
  onNavigateToBracket,
}: GameDayBillboardProps) {
  const { message } = App.useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter all liguilla matches
  const allLiguilla = useMemo(() => {
    const liguillaPhases = ['Cuartos de Final', 'Octavos de Final', 'Semifinal', 'Final', 'Tercer Lugar'];
    return seasonMatches.filter((m) => liguillaPhases.includes(m.phase ?? ''));
  }, [seasonMatches]);

  // Upcoming matches for the primary rotation
  const upcomingLiguilla = useMemo(() => {
    const upcoming = allLiguilla.filter(
      (m) => m.status === 'Programado' || m.status === 'Pendiente'
    );
    const listToUse = upcoming.length > 0 ? upcoming : allLiguilla;
    return [...listToUse].sort((a, b) => {
      const dateA = a.scheduled_date ?? '9999';
      const dateB = b.scheduled_date ?? '9999';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.time_str ?? '').localeCompare(b.time_str ?? '');
    });
  }, [allLiguilla]);

  const seriesGroups = useMemo(() => groupSeriesForBillboard(allLiguilla), [allLiguilla]);

  const cards = useMemo(() => {
    return upcomingLiguilla.map((match) => {
      const series =
        seriesGroups.find((g) => g.some((m) => m.id === match.id)) ?? [match];
      const info = getSeriesInfo(series, match);
      const phaseConfig = getPhaseConfig(match.phase);
      return { match, info, phaseConfig };
    });
  }, [upcomingLiguilla, seriesGroups]);

  const handleDownload = useCallback(
    async (cardIndex: number) => {
      const card = cards[cardIndex];
      if (!card) return;
      const { match, info, phaseConfig } = card;
      const dateStr = formatDateSpanish(match.scheduled_date);
      const timeStr = match.time_str ?? 'Hora por confirmar';
      const court = match.court ?? 'Cancha Bicentenario';
      const gameLabel =
        info.totalGames > 1 ? `Juego ${info.gameNumber} de ${info.totalGames}` : 'Partido Único';

      try {
        message.loading({ content: 'Generando espectacular en alta resolución...', key: 'dl-billboard-main' });
        const dataUrl = await generateBillboardImage(
          phaseConfig.label,
          phaseConfig.bgLabel,
          match.home_team?.name ?? 'Local',
          match.away_team?.name ?? 'Visitante',
          getTeamColor(match.home_team_id || 0),
          getTeamColor(match.away_team_id || 0),
          dateStr,
          timeStr,
          court,
          gameLabel,
          info.seriesLabel,
          phaseConfig.accent,
          info.winsA,
          info.winsB,
          category || '3ra Fuerza'
        );
        const link = document.createElement('a');
        link.download = `espectacular_${match.home_team?.name ?? 'local'}_vs_${match.away_team?.name ?? 'visitante'}.png`;
        link.href = dataUrl;
        link.click();
        message.success({ content: '¡Espectacular HD listo para compartir en redes! 🏀', key: 'dl-billboard-main' });
      } catch {
        message.error({ content: 'Error al generar la imagen', key: 'dl-billboard-main' });
      }
    },
    [cards, category, message]
  );

  if (cards.length === 0) return null;

  const current = cards[currentIndex] || cards[0];
  if (!current) return null;

  const { match, info, phaseConfig } = current;
  const dateStr = formatDateSpanish(match.scheduled_date);
  const timeStr = match.time_str ?? 'Hora por confirmar';
  const court = match.court ?? 'Cancha Bicentenario';
  const gameLabel =
    info.totalGames > 1 ? `Juego ${info.gameNumber} de ${info.totalGames}` : 'Partido Único';
  const homeWins = match.home_team_id === info.teamA_id ? info.winsA : info.winsB;
  const awayWins = match.away_team_id === info.teamA_id ? info.winsA : info.winsB;
  const homeLeader = homeWins > awayWins;
  const awayLeader = awayWins > homeWins;

  return (
    <div style={{ maxWidth: 1120, margin: '24px auto 16px', padding: '0 14px' }}>
      {/* ── Main Showcase Card: Espectacular Físico Real con Lona y Reflectores ── */}
      <PhysicalBillboardStructure
        match={match}
        info={info}
        currentIndex={currentIndex}
        totalCards={cards.length}
        category={category}
        onDownload={() => handleDownload(currentIndex)}
        onOpenModal={() => setIsModalOpen(true)}
        isModalView={false}
      />

      {/* ── Quick Switcher Bar for Matchups ──────────────────── */}
      {cards.length > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            marginTop: 14,
            flexWrap: 'wrap',
          }}
        >
          {/* Previous Button */}
          <Button
            shape="circle"
            aria-label="Partido anterior"
            icon={<LeftOutlined />}
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
            style={{
              width: 40,
              height: 40,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#fff',
            }}
          />

          {/* Quick Matchup Pills (Interactive scrollable strip) */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              maxWidth: 'calc(100% - 100px)',
              padding: '4px 2px',
              scrollbarWidth: 'none',
            }}
          >
            {cards.map((c, idx) => {
              const active = idx === currentIndex;
              const hName = c.match.home_team?.name?.split(' ')[0] ?? 'L';
              const aName = c.match.away_team?.name?.split(' ')[0] ?? 'V';
              return (
                <button
                  key={c.match.id || idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 9999,
                    background: active
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(245, 158, 11, 0.15))'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: active ? '1px solid rgba(245, 158, 11, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: active ? 'var(--oro-cantera)' : '#94a3b8',
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {hName} vs {aName}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <Button
            shape="circle"
            aria-label="Siguiente partido"
            icon={<RightOutlined />}
            disabled={currentIndex === cards.length - 1}
            onClick={() => setCurrentIndex((i) => i + 1)}
            style={{
              width: 40,
              height: 40,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#fff',
            }}
          />
        </div>
      )}

      {/* ── Interactive Playoff Hub Modal ────────────────────── */}
      <LiguillaHubModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        seasonMatches={seasonMatches}
        seasonName={seasonName}
        category={category}
        onNavigateToBracket={onNavigateToBracket}
      />
    </div>
  );
}
