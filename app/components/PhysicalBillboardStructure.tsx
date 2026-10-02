'use client';

import React from 'react';
import { Button } from 'antd';
import {
  DownloadOutlined,
  TrophyOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons';
import {
  MatchData,
  SeriesInfo,
  formatDateSpanish,
  getTeamColor,
  getTeamInitial,
  getPhaseConfig,
} from '@/lib/billboard-utils';
import { getTeamLogoUrl } from '@/lib/team-logos';

export interface PhysicalBillboardProps {
  match: MatchData;
  info: SeriesInfo;
  currentIndex?: number;
  totalCards?: number;
  category?: string;
  onDownload: () => void;
  onOpenModal?: () => void;
  isModalView?: boolean;
}

/* ── Avatar Badge ────────────────────────────────────────── */
function TeamAvatarBadge({ name, teamId, size = 50 }: { name: string; teamId: number; size?: number }) {
  const color = getTeamColor(teamId);
  const logoUrl = getTeamLogoUrl(name);

  if (logoUrl) {
    return (
      <div
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          padding: 2,
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.4))',
          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <img
          src={logoUrl}
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${color}44, ${color}14)`,
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 4px 14px ${color}33`,
        flexShrink: 0,
      }}
    >
      <span style={{ color, fontSize: size * 0.46, fontWeight: 900, lineHeight: 1 }}>
        {getTeamInitial(name)}
      </span>
    </div>
  );
}

export default function PhysicalBillboardStructure({
  match,
  info,
  currentIndex,
  totalCards,
  category,
  onDownload,
  onOpenModal,
  isModalView = false,
}: PhysicalBillboardProps) {
  const phaseConfig = getPhaseConfig(match.phase);
  const dateStr = formatDateSpanish(match.scheduled_date);
  const timeStr = match.time_str ?? 'Hora por confirmar';
  const court = match.court ?? 'Cancha Bicentenario';
  const gameNumber = info.gameNumber;

  const homeWins = match.home_team_id === info.teamA_id ? info.winsA : info.winsB;
  const awayWins = match.away_team_id === info.teamA_id ? info.winsA : info.winsB;
  const homeLeader = homeWins > awayWins;
  const awayLeader = awayWins > homeWins;

  const homeName = match.home_team?.name ?? 'Local';
  const awayName = match.away_team?.name ?? 'Visitante';

  return (
    <div className="physical-billboard-rig">
      {/* ── 1. REFLECTORES FÍSICOS SUPERIORES (3 Lámparas con haces de luz) ── */}
      <div className="physical-floodlight-bar" aria-hidden="true">
        {/* Reflector Izquierdo */}
        <div className="physical-floodlight">
          <div className="physical-floodlight__arm" />
          <div className="physical-floodlight__housing">
            <div className="physical-floodlight__bulb" />
          </div>
          <div className="physical-floodlight__beam" style={{ left: '-60px' }} />
        </div>

        {/* Reflector Central */}
        <div className="physical-floodlight">
          <div className="physical-floodlight__arm" />
          <div className="physical-floodlight__housing">
            <div className="physical-floodlight__bulb" />
          </div>
          <div className="physical-floodlight__beam" style={{ left: '-70px' }} />
        </div>

        {/* Reflector Derecho */}
        <div className="physical-floodlight">
          <div className="physical-floodlight__arm" />
          <div className="physical-floodlight__housing">
            <div className="physical-floodlight__bulb" />
          </div>
          <div className="physical-floodlight__beam" style={{ left: '-80px' }} />
        </div>
      </div>

      {/* ── 2. MARCO METÁLICO ESTRUCTURAL (Vigas de acero y remaches) ── */}
      <div className="physical-steel-frame">
        {/* Placas esquineras de refuerzo */}
        <div className="physical-steel-corner physical-steel-corner--tl" />
        <div className="physical-steel-corner physical-steel-corner--tr" />
        <div className="physical-steel-corner physical-steel-corner--bl" />
        <div className="physical-steel-corner physical-steel-corner--br" />

        {/* Remaches de acero en los bordes */}
        <span className="physical-rivet" style={{ top: 8, left: '25%' }} />
        <span className="physical-rivet" style={{ top: 8, right: '25%' }} />
        <span className="physical-rivet" style={{ bottom: 8, left: '25%' }} />
        <span className="physical-rivet" style={{ bottom: 8, right: '25%' }} />

        {/* ── 3. LA LONA PUBLICITARIA IMPRESA EN EL CENTRO ── */}
        <div
          className="physical-printed-banner"
          style={{
            backgroundImage: "url('/cancha_liguilla.jpg')",
          }}
        >
          {/* Overlay oscuro para garantizar contraste de lona */}
          <div className="espectacular-overlay" />

          {/* Contenido en relieve sobre la lona */}
          <div style={{ position: 'relative', zIndex: 3 }}>
            {/* Cabecera de la Lona Publicitaria */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                    color: '#fca5a5',
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#ef4444',
                      boxShadow: '0 0 8px #ef4444',
                    }}
                  />
                  POSTEMPORADA OFICIAL
                </span>

                <span
                  style={{
                    color: phaseConfig.accent,
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    textShadow: `0 0 16px ${phaseConfig.accent}88`,
                  }}
                >
                  {phaseConfig.label}
                </span>

                {category && (
                  <span
                    style={{
                      color: 'var(--oro-cantera)',
                      fontSize: 11,
                      fontWeight: 800,
                      background: 'rgba(245, 158, 11, 0.14)',
                      padding: '2px 8px',
                      borderRadius: 6,
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                    }}
                  >
                    {category}
                  </span>
                )}
              </div>

              {currentIndex !== undefined && totalCards !== undefined && (
                <div style={{ color: 'var(--oro-cantera)', fontSize: 11, fontWeight: 900 }}>
                  ESPECTACULAR {currentIndex + 1} DE {totalCards}
                </div>
              )}
            </div>

            {/* ── LOS DOS GRANDES LETREROS PUBLICITARIOS ENFRENTADOS ── */}
            <div className="physical-signs-grid">
              {/* GRAN LETRERO 1: LOCAL */}
              <div className={`physical-billboard-sign${homeLeader ? ' physical-billboard-sign--leader' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color: 'var(--oro-cantera)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      background: 'rgba(245, 158, 11, 0.18)',
                      padding: '3px 10px',
                      borderRadius: 6,
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                    }}
                  >
                    LOCAL
                  </span>
                  <TeamAvatarBadge name={homeName} teamId={match.home_team_id || 0} size={46} />
                </div>

                {/* NOMBRE DEL EQUIPO EN LETRAS GIGANTES DE CARTELERA */}
                <div className="physical-team-name-giant">
                  {homeName}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingTop: 8,
                  }}
                >
                  <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                    Victorias en Serie
                  </span>
                  <span
                    style={{
                      fontSize: 30,
                      fontWeight: 900,
                      color: homeLeader ? 'var(--oro-cantera)' : '#cbd5e1',
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {homeWins}
                  </span>
                </div>
              </div>

              {/* NÚCLEO CENTRAL: VS & MARCADOR DE SERIE */}
              <div className="espectacular-vs-core">
                <div className="espectacular-vs-badge" style={{ width: 48, height: 48, fontSize: 16 }}>
                  VS
                </div>
                <div className="espectacular-led-series" style={{ fontSize: 12, padding: '5px 12px' }}>
                  {info.seriesLabel}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#e2e8f0',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    background: 'rgba(0, 0, 0, 0.7)',
                    padding: '3px 10px',
                    borderRadius: 9999,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  {info.totalGames > 1 ? `Juego ${gameNumber} de ${info.totalGames}` : 'Duelo Único'}
                </span>
              </div>

              {/* GRAN LETRERO 2: VISITANTE */}
              <div className={`physical-billboard-sign${awayLeader ? ' physical-billboard-sign--leader' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color: 'var(--oro-cantera)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      background: 'rgba(245, 158, 11, 0.18)',
                      padding: '3px 10px',
                      borderRadius: 6,
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                    }}
                  >
                    VISITANTE
                  </span>
                  <TeamAvatarBadge name={awayName} teamId={match.away_team_id || 0} size={46} />
                </div>

                {/* NOMBRE DEL EQUIPO EN LETRAS GIGANTES DE CARTELERA */}
                <div className="physical-team-name-giant">
                  {awayName}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingTop: 8,
                  }}
                >
                  <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                    Victorias en Serie
                  </span>
                  <span
                    style={{
                      fontSize: 30,
                      fontWeight: 900,
                      color: awayLeader ? 'var(--oro-cantera)' : '#cbd5e1',
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {awayWins}
                  </span>
                </div>
              </div>
            </div>

            {/* ── CINTILLO INFERIOR IMPRESO EN LA LONA: CANCHA, FECHA Y HORA ── */}
            <div className="espectacular-marquee-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarOutlined style={{ color: phaseConfig.accent, fontSize: 16 }} />
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>
                  {dateStr}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e2e8f0', fontSize: 13, fontWeight: 700 }}>
                <EnvironmentOutlined style={{ color: '#94a3b8' }} />
                <span>{court}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--oro-cantera)', fontWeight: 900, fontSize: 16 }}>
                <FieldTimeOutlined />
                <span>{timeStr} HRS</span>
              </div>
            </div>

            {/* ── BOTONES DE ACCIÓN ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: onOpenModal && !isModalView ? 'repeat(auto-fit, minmax(220px, 1fr))' : '1fr',
                gap: 12,
                marginTop: 14,
              }}
            >
              {onOpenModal && !isModalView && (
                <Button
                  type="primary"
                  icon={<TrophyOutlined />}
                  onClick={onOpenModal}
                  style={{
                    height: 48,
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderColor: '#f59e0b',
                    color: '#0b0f17',
                    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.45)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  Abrir Centro de Liguilla & Finales
                </Button>
              )}

              <Button
                icon={<DownloadOutlined />}
                onClick={onDownload}
                className="premium-button"
                style={{
                  height: 48,
                  borderRadius: 12,
                  fontSize: 12,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 900,
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                }}
              >
                Descargar Espectacular para Redes
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. PASARELA METÁLICA DE SERVICIO / MANTENIMIENTO (CATWALK) ── */}
      <div className="physical-catwalk" aria-hidden="true" />
    </div>
  );
}
