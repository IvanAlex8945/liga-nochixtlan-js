'use client';

import React, { useState, useMemo } from 'react';
import { Typography, Tag } from 'antd';

const { Text } = Typography;

export interface TeamData {
  id: number;
  name: string;
}

export interface MatchData {
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
}

interface ColumnProps {
  title: string;
  badge: string;
  seriesList: MatchData[][];
  accentColor: string;
}

const BracketColumn = ({ title, badge, seriesList, accentColor }: ColumnProps) => (
  <div style={{ flex: '1 1 280px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
    {/* Header de la fase */}
    <div
      style={{
        padding: '12px 16px',
        borderRadius: 14,
        background: 'rgba(20, 26, 38, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: accentColor,
            display: 'inline-block',
          }}
        />
        <Text style={{ color: '#f8fafc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 13 }}>
          {title}
        </Text>
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          padding: '2px 8px',
          borderRadius: 9999,
          background: `${accentColor}18`,
          color: accentColor,
          border: `1px solid ${accentColor}33`,
          textTransform: 'uppercase',
        }}
      >
        {badge}
      </span>
    </div>

    {/* Series de la fase */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {seriesList.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 12,
            border: '1px dashed rgba(255, 255, 255, 0.06)',
            color: '#94a3b8',
            fontSize: 12,
          }}
        >
          Por definir cruces
        </div>
      ) : (
        seriesList.map((serie, idx) => (
          <SeriesBox key={idx} matches={serie} accentColor={accentColor} />
        ))
      )}
    </div>
  </div>
);

export function LiguillaBracketTab({ seasonMatches }: { seasonMatches: MatchData[] }) {
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'cuartos' | 'semis' | 'final'>('all');

  const { cuartos, semis, final, tercero } = useMemo(() => {
    const liguillaMatches = seasonMatches.filter(
      (m) => m.phase && m.phase !== 'Fase Regular'
    );

    const groupSeries = (phaseName: string) => {
      const matches = liguillaMatches.filter((m) => m.phase === phaseName);
      const seriesMap: Record<string, MatchData[]> = {};
      matches.forEach((m) => {
        const key = [m.home_team_id, m.away_team_id].sort((a, b) => a - b).join('-');
        if (!seriesMap[key]) seriesMap[key] = [];
        seriesMap[key].push(m);
      });
      return Object.values(seriesMap);
    };

    const cMatches = [
      ...groupSeries('Cuartos de Final'),
      ...groupSeries('Octavos de Final'),
    ];
    const sMatches = groupSeries('Semifinal');
    const fMatches = groupSeries('Final');
    const tMatches = groupSeries('Tercer Lugar');

    return { cuartos: cMatches, semis: sMatches, final: fMatches, tercero: tMatches };
  }, [seasonMatches]);

  const hasAnyLiguilla = cuartos.length > 0 || semis.length > 0 || final.length > 0;

  if (!hasAnyLiguilla) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 16px' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏀</div>
        <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: 16 }}>Fase de Liguilla Aún No Programada</div>
        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, maxWidth: 440, margin: '4px auto 0' }}>
          Los cruces de cuartos de final, semifinales y la gran final se activarán automáticamente una vez concluida la temporada regular.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="premium-section-label" style={{ marginBottom: 0 }}>
            🏆 Cuadro Oficial de Postemporada
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            Toca una serie para desglosar sus marcadores juego por juego
          </div>
        </div>

        {/* Selector de fase rápido para pantallas móviles */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todo el Cuadro' },
            { id: 'cuartos', label: 'Cuartos' },
            { id: 'semis', label: 'Semis' },
            { id: 'final', label: 'Finales' },
          ].map((item) => (
            <Tag
              key={item.id}
              role="button"
              tabIndex={0}
              className={`premium-tag${phaseFilter === item.id ? ' premium-tag--active' : ''}`}
              style={{ minHeight: 30, padding: '2px 10px', fontSize: 11, cursor: 'pointer' }}
              onClick={() => setPhaseFilter(item.id as typeof phaseFilter)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPhaseFilter(item.id as typeof phaseFilter); }}
            >
              {item.label}
            </Tag>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 16, WebkitOverflowScrolling: 'touch' }}>
        <div
          style={{
            display: 'flex',
            gap: 20,
            minWidth: phaseFilter === 'all' ? 860 : '100%',
            padding: '4px 2px',
            alignItems: 'stretch',
          }}
        >
          {(phaseFilter === 'all' || phaseFilter === 'cuartos') && (
            <BracketColumn title="Cuartos de Final" badge="Mejor de 3" seriesList={cuartos} accentColor="#38bdf8" />
          )}
          {(phaseFilter === 'all' || phaseFilter === 'semis') && (
            <BracketColumn title="Semifinales" badge="Mejor de 3" seriesList={semis} accentColor="#f87171" />
          )}
          {(phaseFilter === 'all' || phaseFilter === 'final') && (
            <BracketColumn title="Fase Final" badge="Definición" seriesList={[...final, ...tercero]} accentColor="#f59e0b" />
          )}
        </div>
      </div>
    </div>
  );
}

function SeriesBox({ matches, accentColor }: { matches: MatchData[]; accentColor: string }) {
  const [expanded, setExpanded] = useState(false);

  const tA_id = matches[0].home_team_id;
  const tB_id = matches[0].away_team_id;
  const tA_name = matches[0].home_team?.name ?? 'Por definir';
  const tB_name = matches[0].away_team?.name ?? 'Por definir';
  const phase = matches[0].phase;

  let winsA = 0;
  let winsB = 0;

  matches.forEach((m) => {
    const isJugado = ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status);
    if (!isJugado) return;

    const homeWon = (m.home_score ?? 0) > (m.away_score ?? 0) || m.status === 'WO Visitante';
    const awayWon = (m.away_score ?? 0) > (m.home_score ?? 0) || m.status === 'WO Local';

    if (m.home_team_id === tA_id && homeWon) winsA++;
    if (m.away_team_id === tA_id && awayWon) winsA++;
    if (m.home_team_id === tB_id && homeWon) winsB++;
    if (m.away_team_id === tB_id && awayWon) winsB++;
  });

  const seriesWonA = winsA > winsB && winsA >= Math.ceil(matches.length / 2);
  const seriesWonB = winsB > winsA && winsB >= Math.ceil(matches.length / 2);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={`Serie ${tA_name} vs ${tB_name}`}
      onClick={() => setExpanded(!expanded)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
      style={{
        background: 'linear-gradient(180deg, rgba(20, 26, 38, 0.75), rgba(12, 16, 24, 0.85))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header de la serie */}
      <div
        style={{
          background: 'rgba(8, 11, 17, 0.8)',
          padding: '7px 12px',
          fontSize: 11,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <span style={{ color: '#94a3b8', fontWeight: 600, letterSpacing: '0.04em' }}>
          {matches.length > 1 ? `SERIE AL MEJOR DE ${matches.length}` : 'PARTIDO ÚNICO'}
        </span>
        {phase === 'Tercer Lugar' && <span style={{ color: '#38bdf8', fontWeight: 800 }}>3ER LUGAR</span>}
        {phase === 'Final' && <span style={{ color: '#f59e0b', fontWeight: 900 }}>🏆 GRAN FINAL</span>}
      </div>

      {/* Equipo A */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '11px 14px',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          background: seriesWonA ? `${accentColor}0a` : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: seriesWonA ? 800 : 600, color: seriesWonA ? '#fff' : '#cbd5e1' }}>
            {tA_name}
          </span>
          {seriesWonA && <span style={{ fontSize: 10, color: accentColor, fontWeight: 900 }}>CLASIFICA</span>}
        </div>
        <div
          style={{
            padding: '2px 8px',
            borderRadius: 6,
            background: seriesWonA ? accentColor : 'rgba(255, 255, 255, 0.05)',
            color: seriesWonA ? '#0b0f17' : '#94a3b8',
            fontWeight: 800,
            fontSize: 12,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {winsA}
        </div>
      </div>

      {/* Equipo B */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '11px 14px',
          alignItems: 'center',
          background: seriesWonB ? `${accentColor}0a` : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: seriesWonB ? 800 : 600, color: seriesWonB ? '#fff' : '#cbd5e1' }}>
            {tB_name}
          </span>
          {seriesWonB && <span style={{ fontSize: 10, color: accentColor, fontWeight: 900 }}>CLASIFICA</span>}
        </div>
        <div
          style={{
            padding: '2px 8px',
            borderRadius: 6,
            background: seriesWonB ? accentColor : 'rgba(255, 255, 255, 0.05)',
            color: seriesWonB ? '#0b0f17' : '#94a3b8',
            fontWeight: 800,
            fontSize: 12,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {winsB}
        </div>
      </div>

      {/* Desglose de partidos individuales (expandible) */}
      {expanded && (
        <div
          style={{
            background: 'rgba(8, 11, 16, 0.9)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>
            Resultados por Juego
          </div>
          {matches.map((m, i) => {
            const mIsJugado = ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status);
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '5px 8px',
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                <span style={{ color: '#94a3b8' }}>
                  Juego {i + 1} <span style={{ color: '#64748b' }}>(J{m.jornada})</span>
                </span>
                {mIsJugado ? (
                  <span style={{ color: '#f8fafc', fontWeight: 700 }}>
                    {m.home_score} — {m.away_score}
                  </span>
                ) : (
                  <span style={{ color: '#64748b', fontStyle: 'italic' }}>Programado</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
