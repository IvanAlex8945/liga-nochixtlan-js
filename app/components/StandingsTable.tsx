'use client';

import React, { useMemo } from 'react';
import { Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TeamStats } from '@/lib/standings';

export interface TableRow extends TeamStats {
  pos: number;
  key: number;
}

interface StandingsTableProps {
  data: TeamStats[];
  onTeamClick?: (team: TeamStats) => void;
}

// Paleta de avatares deportivos
const AVATAR_PALETTES = [
  { bg: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', border: '#60a5fa' },
  { bg: 'linear-gradient(135deg, #78350f, #d97706)', border: '#fbbf24' },
  { bg: 'linear-gradient(135deg, #064e3b, #059669)', border: '#34d399' },
  { bg: 'linear-gradient(135deg, #4c1d95, #7c3aed)', border: '#a78bfa' },
  { bg: 'linear-gradient(135deg, #831843, #db2777)', border: '#f472b6' },
  { bg: 'linear-gradient(135deg, #134e4a, #0d9488)', border: '#2dd4bf' },
  { bg: 'linear-gradient(135deg, #701a75, #c026d3)', border: '#e879f9' },
  { bg: 'linear-gradient(135deg, #312e81, #4f46e5)', border: '#818cf8' },
];

function getTeamPalette(teamName: string) {
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = (hash * 31 + teamName.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function getTeamInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function StandingsTable({ data, onTeamClick }: StandingsTableProps) {
  const leader = data[0] ?? null;

  // Criterio de elegibilidad deportiva universal para Mejor Ofensiva y Mejor Defensiva
  // Aplicable de forma general para todas las categorías (3ra, Femenil, Libre, Master, Veteranos):
  // 1. Considera partidos jugados (PJ), ganados (PG), perdidos (PP) y por default (WO).
  // 2. Excluye equipos retirados, dados de baja o que solo acumularon incomparecencias sin competir en cancha.
  // 3. Excluye equipos con múltiples defaults y 0 victorias (ej. SOSOLA o equipos desertores).
  // 4. Requiere un mínimo de partidos disputados respecto al avance del torneo (>= 30% del máximo de la tabla).
  const eligibleTeams = useMemo(() => {
    if (data.length === 0) return [];
    const maxPJ = Math.max(...data.map((t) => t.PJ), 1);
    const minPJThreshold = Math.max(1, Math.ceil(maxPJ * 0.3));

    const activeList = data.filter((t) => {
      const name = t.equipo.trim().toUpperCase();
      if (name.includes('SOSOLA') || name.includes('RETIRADO') || name.includes('BAJA')) return false;
      // No elegible si solo tiene partidos por default sin haber jugado en cancha
      if ((t.PG + t.PP) === 0 && t.WO > 0) return false;
      // No elegible si abandonó el torneo (sin victorias y múltiples WOs)
      if (t.PG === 0 && t.WO >= 2) return false;
      // Debe haber disputado al menos 1 juego en cancha y cumplir el umbral del torneo
      return t.PJ >= minPJThreshold && (t.PG + t.PP) > 0;
    });

    if (activeList.length === 0) {
      // Fallback seguro (ej. primeras jornadas donde los partidos apenas comienzan)
      return data.filter((t) => !t.equipo.trim().toUpperCase().includes('SOSOLA') && (t.PG + t.PP) > 0);
    }
    return activeList;
  }, [data]);

  const bestOffense = useMemo(() => {
    if (eligibleTeams.length === 0) return null;
    return [...eligibleTeams].sort((a, b) => {
      // Pondera el promedio de puntos anotados por partido (PF / PJ)
      const avgA = a.PF / Math.max(1, a.PJ);
      const avgB = b.PF / Math.max(1, b.PJ);
      if (Math.abs(avgB - avgA) > 0.05) return avgB - avgA;
      // Desempate por mayor total de PF
      if (b.PF !== a.PF) return b.PF - a.PF;
      // Desempate por mayor número de victorias
      return b.PG - a.PG;
    })[0];
  }, [eligibleTeams]);

  const bestDefense = useMemo(() => {
    if (eligibleTeams.length === 0) return null;
    return [...eligibleTeams].sort((a, b) => {
      // Pondera el promedio de puntos recibidos por partido (PC / PJ)
      const avgA = a.PC / Math.max(1, a.PJ);
      const avgB = b.PC / Math.max(1, b.PJ);
      if (Math.abs(avgA - avgB) > 0.05) return avgA - avgB;
      // Desempate por menor total de PC
      if (a.PC !== b.PC) return a.PC - b.PC;
      // Desempate por menor número de derrotas (PP + WO)
      return (a.PP + a.WO) - (b.PP + b.WO);
    })[0];
  }, [eligibleTeams]);

  const columns: ColumnsType<TableRow> = [
    {
      title: (
        <abbr title="Posición" aria-label="Posición" style={{ textDecoration: 'none', cursor: 'help' }}>
          #
        </abbr>
      ),
      dataIndex: 'pos',
      key: 'pos',
      width: 40,
      fixed: 'left',
      align: 'center',
      render: (pos: number) => {
        if (pos === 1) {
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
                color: '#0b0f17',
                fontWeight: 900,
                fontSize: 12,
              }}
              title="Líder General"
            >
              1
            </span>
          );
        }
        if (pos === 2) {
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'rgba(203, 213, 225, 0.2)',
                color: '#e2e8f0',
                fontWeight: 800,
                fontSize: 12,
                border: '1px solid rgba(203, 213, 225, 0.4)',
              }}
            >
              2
            </span>
          );
        }
        if (pos === 3) {
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'rgba(217, 119, 6, 0.2)',
                color: '#fbbf24',
                fontWeight: 800,
                fontSize: 12,
                border: '1px solid rgba(217, 119, 6, 0.4)',
              }}
            >
              3
            </span>
          );
        }
        return (
          <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>
            {pos}
          </span>
        );
      },
    },
    {
      title: 'Equipo',
      dataIndex: 'equipo',
      key: 'equipo',
      width: 160,
      fixed: 'left',
      render: (name: string, record) => {
        const isLeader = record.pos === 1;
        const palette = getTeamPalette(name);
        const initials = getTeamInitials(name);
        return (
          <div className="team-cell" style={{ gap: 8 }}>
            <div
              className="team-avatar"
              style={{
                background: palette.bg,
                border: `1.5px solid ${palette.border}`,
                width: 26,
                height: 26,
                fontSize: 10,
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <button
                type="button"
                className="team-name-button"
                style={{
                  color: isLeader ? '#fde68a' : '#f8fafc',
                  maxWidth: 118,
                }}
                title={name}
              >
                {name}
              </button>
            </div>
          </div>
        );
      },
    },
    {
      title: (
        <Tooltip title="Partidos Jugados">
          <abbr title="Partidos Jugados" aria-label="Partidos Jugados" style={{ textDecoration: 'none' }}>
            PJ
          </abbr>
        </Tooltip>
      ),
      dataIndex: 'PJ',
      key: 'PJ',
      width: 44,
      align: 'center',
      render: (v: number) => <NumberCell value={v} color="#f8fafc" bold />,
    },
    {
      title: (
        <Tooltip title="Partidos Ganados">
          <abbr title="Partidos Ganados" aria-label="Partidos Ganados" style={{ textDecoration: 'none' }}>
            PG
          </abbr>
        </Tooltip>
      ),
      dataIndex: 'PG',
      key: 'PG',
      width: 44,
      align: 'center',
      render: (v: number) => <NumberCell value={v} color={v > 0 ? '#4ade80' : '#94a3b8'} />,
    },
    {
      title: (
        <Tooltip title="Partidos Perdidos">
          <abbr title="Partidos Perdidos" aria-label="Partidos Perdidos" style={{ textDecoration: 'none' }}>
            PP
          </abbr>
        </Tooltip>
      ),
      dataIndex: 'PP',
      key: 'PP',
      width: 44,
      align: 'center',
      render: (v: number) => <NumberCell value={v} color={v > 0 ? '#f87171' : '#94a3b8'} />,
    },
    {
      title: (
        <Tooltip title="Walkovers (no presentación)">
          <abbr title="Walkovers" aria-label="Walkovers" style={{ textDecoration: 'none' }}>
            WO
          </abbr>
        </Tooltip>
      ),
      dataIndex: 'WO',
      key: 'WO',
      width: 44,
      align: 'center',
      render: (v: number) => (
        <NumberCell
          value={v}
          color={v > 0 ? '#fbbf24' : '#94a3b8'}
          bold={v > 0}
        />
      ),
    },
    {
      title: (
        <Tooltip title="Puntos a Favor (anotados)">
          <abbr title="Puntos a Favor" aria-label="Puntos a Favor" style={{ textDecoration: 'none' }}>
            PF
          </abbr>
        </Tooltip>
      ),
      dataIndex: 'PF',
      key: 'PF',
      width: 52,
      align: 'right',
      render: (v: number) => <NumberCell value={v} color="#94a3b8" />,
    },
    {
      title: (
        <Tooltip title="Puntos en Contra (recibidos)">
          <abbr title="Puntos en Contra" aria-label="Puntos en Contra" style={{ textDecoration: 'none' }}>
            PC
          </abbr>
        </Tooltip>
      ),
      dataIndex: 'PC',
      key: 'PC',
      width: 52,
      align: 'right',
      render: (v: number) => <NumberCell value={v} color="#94a3b8" />,
    },
    {
      title: (
        <Tooltip title="Diferencia de Puntos (PF - PC)">
          <abbr title="Diferencia de Puntos" aria-label="Diferencia de Puntos" style={{ textDecoration: 'none' }}>
            DP
          </abbr>
        </Tooltip>
      ),
      dataIndex: 'DP',
      key: 'DP',
      width: 54,
      align: 'right',
      render: (v: number) => {
        const isPos = v > 0;
        const isZero = v === 0;
        return (
          <span
            style={{
              color: isPos ? '#4ade80' : isZero ? '#94a3b8' : '#f87171',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {isPos ? `+${v}` : v}
          </span>
        );
      },
    },
    {
      title: (
        <Tooltip title="Puntos de Clasificación Oficiales (Victoria = 3, Derrota = 1, WO = 0)">
          <abbr title="Puntos Oficiales" aria-label="Puntos Oficiales" style={{ textDecoration: 'none' }}>
            PTS
          </abbr>
        </Tooltip>
      ),
      dataIndex: 'Pts',
      key: 'Pts',
      width: 58,
      align: 'center',
      render: (pts: number, record) => {
        const isLeader = record.pos === 1;
        return (
          <span
            className={`standings-points-badge${isLeader ? ' standings-points-badge--leader' : ''}`}
          >
            {pts}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Resumen Deportivo Superior */}
      {leader && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 10,
          }}
        >
          {/* Líder General */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(245, 158, 11, 0.04))',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 12,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 20 }}>👑</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Líder General
              </div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {leader.equipo}
              </div>
            </div>
            <div style={{ color: 'var(--oro-cantera)', fontWeight: 900, fontSize: 15 }}>
              {leader.Pts} <span style={{ fontSize: 10, fontWeight: 600 }}>PTS</span>
            </div>
          </div>

          {/* Mejor Ofensiva */}
          {bestOffense && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 12,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div style={{ fontSize: 20 }}>🏀</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Mejor Ofensiva
                </div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {bestOffense.equipo}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: '#4ade80', fontWeight: 800, fontSize: 14 }}>
                  {bestOffense.PF} <span style={{ fontSize: 10, fontWeight: 600 }}>PF</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>
                  {(bestOffense.PF / Math.max(1, bestOffense.PJ)).toFixed(1)} pts/j · {bestOffense.PJ} PJ ({bestOffense.PG}G-{bestOffense.PP}P{bestOffense.WO > 0 ? `-${bestOffense.WO}WO` : ''})
                </div>
              </div>
            </div>
          )}

          {/* Mejor Defensiva */}
          {bestDefense && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 12,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div style={{ fontSize: 20 }}>🛡️</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Mejor Defensiva
                </div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {bestDefense.equipo}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: 14 }}>
                  {bestDefense.PC} <span style={{ fontSize: 10, fontWeight: 600 }}>PC</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>
                  {(bestDefense.PC / Math.max(1, bestDefense.PJ)).toFixed(1)} pts/j · {bestDefense.PJ} PJ ({bestDefense.PG}G-{bestDefense.PP}P{bestDefense.WO > 0 ? `-${bestDefense.WO}WO` : ''})
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabla Oficial de Clasificación */}
      <Table
        className="standings-table"
        columns={columns}
        dataSource={data.map((row, idx) => ({ ...row, key: row.id, pos: idx + 1 }))}
        pagination={false}
        size="small"
        scroll={{ x: 620 }}
        rowClassName={(record) => (record.pos === 1 ? 'standings-table__row--leader' : '')}
        onRow={(record) => ({
          onClick: () => onTeamClick?.(record),
          style: { cursor: onTeamClick ? 'pointer' : 'default' },
        })}
      />

      {/* Leyenda y Criterio Oficial */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          padding: '0 4px',
          color: '#94a3b8',
          fontSize: 11,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
          <span>Zona de clasificación a Play-offs (Top 8)</span>
        </div>
        <div>
          <span>Reglamento Oficial: Victoria = 3 pts · Derrota = 1 pt · WO = 0 pts</span>
        </div>
      </div>
    </div>
  );
}

function NumberCell({
  value,
  color,
  bold = false,
}: {
  value: number;
  color: string;
  bold?: boolean;
}) {
  return (
    <span
      style={{
        color,
        fontWeight: bold ? 800 : 600,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </span>
  );
}
