'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Modal, Tag, Button, Tooltip, App } from 'antd';
import {
  TrophyOutlined,
  DownloadOutlined,
  CloseOutlined,
  PartitionOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  CheckCircleOutlined,
  FireOutlined,
  ArrowRightOutlined,
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
  SeriesInfo,
} from '@/lib/billboard-utils';
import { LiguillaBracketTab } from './LiguillaBracket';
import PhysicalBillboardStructure from './PhysicalBillboardStructure';

export interface LiguillaHubModalProps {
  open: boolean;
  onClose: () => void;
  seasonMatches: MatchData[];
  seasonName?: string;
  category?: string;
  onNavigateToBracket?: () => void;
}

/* ── Individual Series Card inside Modal (Espectacular Físico Real) ── */
function SeriesHubCard({
  series,
  info,
  category,
  onDownload,
}: {
  series: MatchData[];
  info: SeriesInfo;
  category?: string;
  onDownload: (match: MatchData, info: SeriesInfo) => void;
}) {
  const [showGames, setShowGames] = useState(false);

  // Find next upcoming match or last played match
  const nextMatch =
    series.find((m) => m.status === 'Programado' || m.status === 'Pendiente') ||
    series[series.length - 1];

  if (!nextMatch) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <PhysicalBillboardStructure
        match={nextMatch}
        info={info}
        category={category}
        onDownload={() => onDownload(nextMatch, info)}
        isModalView={true}
      />

      {/* Desglose de partidos de la serie si son más de 1 */}
      {series.length > 1 && (
        <div style={{ marginTop: 6, padding: '0 8px' }}>
          <button
            type="button"
            onClick={() => setShowGames(!showGames)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--oro-mixteco)',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 0',
              textTransform: 'uppercase',
            }}
          >
            {showGames ? '▼ Ocultar marcadores juego por juego' : '▶ Ver marcadores juego por juego'}
          </button>

          {showGames && (
            <div
              style={{
                marginTop: 6,
                background: 'rgba(10, 14, 22, 0.95)',
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {series.map((m, idx) => {
                const isJugado = ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status || '');
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 11,
                      color: '#cbd5e1',
                      padding: '4px 6px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                      Juego {idx + 1} {m.jornada ? `(J${m.jornada})` : ''}
                    </span>
                    {isJugado ? (
                      <span style={{ fontWeight: 800, color: 'var(--oro-cantera)', fontVariantNumeric: 'tabular-nums' }}>
                        {m.home_score} — {m.away_score}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontStyle: 'italic' }}>
                        {m.status || 'Programado'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN MODAL COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function LiguillaHubModal({
  open,
  onClose,
  seasonMatches,
  seasonName,
  category,
  onNavigateToBracket,
}: LiguillaHubModalProps) {
  const { message } = App.useApp();
  const [viewMode, setViewMode] = useState<'cards' | 'bracket'>('cards');
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'cuartos' | 'semis' | 'final'>('all');

  // Filter all liguilla matches
  const liguillaMatches = useMemo(() => {
    const liguillaPhases = ['Cuartos de Final', 'Octavos de Final', 'Semifinal', 'Final', 'Tercer Lugar'];
    return seasonMatches.filter((m) => liguillaPhases.includes(m.phase ?? ''));
  }, [seasonMatches]);

  // Group into series
  const seriesGroups = useMemo(() => {
    return groupSeriesForBillboard(liguillaMatches);
  }, [liguillaMatches]);

  // Detailed series info list
  const seriesWithInfo = useMemo(() => {
    return seriesGroups.map((series) => {
      const info = getSeriesInfo(series);
      const phase = series[0]?.phase ?? '';
      return { series, info, phase };
    });
  }, [seriesGroups]);

  // Filter by phase
  const filteredSeries = useMemo(() => {
    if (phaseFilter === 'all') return seriesWithInfo;
    if (phaseFilter === 'cuartos') {
      return seriesWithInfo.filter(
        (s) => s.phase === 'Cuartos de Final' || s.phase === 'Octavos de Final'
      );
    }
    if (phaseFilter === 'semis') {
      return seriesWithInfo.filter((s) => s.phase === 'Semifinal');
    }
    if (phaseFilter === 'final') {
      return seriesWithInfo.filter((s) => s.phase === 'Final' || s.phase === 'Tercer Lugar');
    }
    return seriesWithInfo;
  }, [seriesWithInfo, phaseFilter]);

  // Counts for filter pills
  const counts = useMemo(() => {
    const total = seriesWithInfo.length;
    const cuartos = seriesWithInfo.filter(
      (s) => s.phase === 'Cuartos de Final' || s.phase === 'Octavos de Final'
    ).length;
    const semis = seriesWithInfo.filter((s) => s.phase === 'Semifinal').length;
    const final = seriesWithInfo.filter((s) => s.phase === 'Final' || s.phase === 'Tercer Lugar').length;
    return { total, cuartos, semis, final };
  }, [seriesWithInfo]);

  // Download Handler
  const handleDownload = useCallback(async (match: MatchData, info: SeriesInfo) => {
    const phaseConfig = getPhaseConfig(match.phase);
    const dateStr = formatDateSpanish(match.scheduled_date);
    const timeStr = match.time_str ?? 'Hora por confirmar';
    const court = match.court ?? 'Cancha Bicentenario';
    const gameLabel = info.totalGames > 1 ? `Juego ${info.gameNumber} de ${info.totalGames}` : 'Partido Único';

    try {
      message.loading({ content: 'Generando espectacular en alta resolución...', key: 'dl-billboard' });
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
      message.success({ content: '¡Espectacular HD listo para compartir en redes! 🏀', key: 'dl-billboard' });
    } catch {
      message.error({ content: 'Error al generar la imagen del espectacular', key: 'dl-billboard' });
    }
  }, [category, message]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1160}
      centered
      destroyOnHidden
      className="playoffs-hub-modal"
      closeIcon={<CloseOutlined style={{ color: '#94a3b8', fontSize: 18 }} />}
    >
      {/* ── Modal Athletic Header ─────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.05))',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              color: 'var(--oro-cantera)',
              fontSize: 20,
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)',
            }}
          >
            🏆
          </span>
          <div>
            <h2
              style={{
                color: '#fff',
                fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1.15,
                textTransform: 'uppercase',
              }}
            >
              Centro de Liguilla & Finales
            </h2>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
              {category ? `${category} · ` : ''}{seasonName || 'Temporada Oficial'} · Cruces y tarjetas oficiales
            </div>
          </div>
        </div>

        {/* ── Switch de Modos (Tarjetas vs Bracket) ────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 18,
            paddingTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Toggle Buttons */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(15, 22, 34, 0.85)',
              padding: 4,
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                background: viewMode === 'cards' ? 'linear-gradient(135deg, var(--oro-mixteco), #d97706)' : 'transparent',
                color: viewMode === 'cards' ? '#0b0f17' : '#94a3b8',
                border: 'none',
                borderRadius: 9,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.18s ease',
              }}
            >
              <AppstoreOutlined />
              Tarjetas de Series ({counts.total})
            </button>

            <button
              type="button"
              onClick={() => setViewMode('bracket')}
              style={{
                background: viewMode === 'bracket' ? 'linear-gradient(135deg, var(--oro-mixteco), #d97706)' : 'transparent',
                color: viewMode === 'bracket' ? '#0b0f17' : '#94a3b8',
                border: 'none',
                borderRadius: 9,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.18s ease',
              }}
            >
              <PartitionOutlined />
              Árbol de Eliminación (Bracket)
            </button>
          </div>

          {/* Optional Action to go directly to full Bracket tab */}
          {onNavigateToBracket && (
            <Button
              type="text"
              onClick={() => {
                onClose();
                onNavigateToBracket();
              }}
              style={{
                color: 'var(--oro-cantera)',
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Ir a la Sección de Liguilla <ArrowRightOutlined />
            </Button>
          )}
        </div>
      </div>

      {/* ── Content View: Mode Cards ─────────────────────────── */}
      {viewMode === 'cards' && (
        <div>
          {/* Phase Filter Chips */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 18,
            }}
          >
            {[
              { id: 'all', label: `Todos los Cruces (${counts.total})` },
              { id: 'cuartos', label: `Cuartos (${counts.cuartos})` },
              { id: 'semis', label: `Semifinales (${counts.semis})` },
              { id: 'final', label: `Finales & 3er (${counts.final})` },
            ].map((item) => (
              <Tag
                key={item.id}
                role="button"
                tabIndex={0}
                className={`premium-tag${phaseFilter === item.id ? ' premium-tag--active' : ''}`}
                style={{
                  minHeight: 34,
                  padding: '4px 14px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
                onClick={() => setPhaseFilter(item.id as typeof phaseFilter)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setPhaseFilter(item.id as typeof phaseFilter);
                  }
                }}
              >
                {item.label}
              </Tag>
            ))}
          </div>

          {/* Cards Grid */}
          {filteredSeries.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 16,
                border: '1px dashed rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏀</div>
              <div style={{ fontWeight: 700, color: '#fff' }}>Sin series registradas en esta fase</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Los cruces aparecerán aquí conforme avancen los resultados.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 28,
              }}
            >
              {filteredSeries.map((item, idx) => (
                <SeriesHubCard
                  key={idx}
                  series={item.series}
                  info={item.info}
                  category={category}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Content View: Mode Bracket ───────────────────────── */}
      {viewMode === 'bracket' && (
        <div
          style={{
            background: 'rgba(8, 12, 20, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 18,
            padding: '16px 14px',
          }}
        >
          <LiguillaBracketTab
            seasonMatches={seasonMatches as unknown as Parameters<typeof LiguillaBracketTab>[0]['seasonMatches']}
          />
        </div>
      )}
    </Modal>
  );
}
