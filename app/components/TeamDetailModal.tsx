'use client';

/**
 * TeamDetailModal.tsx — Ficha Técnica de Equipo (Rediseño Deportivo Premium)
 */

import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { Modal, Typography, Tag, Tabs, Spin, Radio } from 'antd';
import { supabase } from '@/lib/supabase';
import { calcularElegibilidad } from '@/lib/eligibility';
import { formatPlayerNumber } from '@/lib/player-number';
import type { TeamStats } from '@/lib/standings';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import type { MatchData, PlayerStats } from './PublicPageClient';

const { Text } = Typography;

interface Player {
  id: number;
  name: string;
  number: number | null;
  is_active: boolean;
}

interface Props {
  team: TeamStats;
  seasonId: number;
  seasonName: string;
  seasonMatches: MatchData[];
  allStats: PlayerStats[];
  onClose: () => void;
}

type Phase = 'Ambas' | 'Fase Regular' | 'Liguilla';

const thStyle: CSSProperties = {
  padding: '8px 10px',
  color: 'var(--gold-soft)',
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
};

export default function TeamDetailModal({
  team,
  seasonId,
  seasonName,
  seasonMatches,
  allStats,
  onClose,
}: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [eligibility, setEligibility] = useState<{
    jugador_id: number;
    nombre: string;
    asistencias: number;
    elegible: boolean;
    min_requerido: number;
  }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('Fase Regular');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase
        .from('players')
        .select('id, name, number, is_active')
        .eq('team_id', team.id)
        .order('number'),
      calcularElegibilidad(supabase, team.id, seasonId),
    ]).then(([playersRes, eligRes]) => {
      if (cancelled) return;
      setPlayers(playersRes.data ?? []);
      setEligibility(eligRes.results);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [team.id, seasonId]);

  // Phase-filtered matches for this team
  const teamMatches = useMemo(() =>
    seasonMatches.filter((m) =>
      (m.home_team_id === team.id || m.away_team_id === team.id) &&
      (phase === 'Ambas' || m.phase === phase)
    ),
    [seasonMatches, team.id, phase]);

  const playedMatches = useMemo(() =>
    teamMatches.filter((m) => m.status === 'Jugado'),
    [teamMatches]);

  // Chart data
  const chartData = useMemo(() =>
    playedMatches.map((m, i) => {
      const isHome = m.home_team_id === team.id;
      return {
        jornada: `J${m.jornada ?? i + 1}`,
        PF: isHome ? (m.home_score ?? 0) : (m.away_score ?? 0),
        PC: isHome ? (m.away_score ?? 0) : (m.home_score ?? 0),
      };
    }),
    [playedMatches, team.id]);

  const totalPF = chartData.reduce((s, d) => s + d.PF, 0);
  const totalPC = chartData.reduce((s, d) => s + d.PC, 0);
  const avgPF = chartData.length > 0 ? Math.round(totalPF / chartData.length) : 0;
  const avgPC = chartData.length > 0 ? Math.round(totalPC / chartData.length) : 0;

  // Top scorers for this team (phase-filtered)
  const teamMatchSet = new Set(teamMatches.map((m) => m.id));
  const byPlayer: Record<number, { nombre: string; puntos: number; triples: number }> = {};
  for (const s of allStats) {
    if (!teamMatchSet.has(s.match_id) || s.team_id !== team.id || !s.played) continue;
    const p = s.players;
    if (!p) continue;
    if (!byPlayer[p.id]) byPlayer[p.id] = { nombre: p.name, puntos: 0, triples: 0 };
    byPlayer[p.id].puntos += s.points ?? 0;
    byPlayer[p.id].triples += s.triples ?? 0;
  }
  const topScorers = Object.values(byPlayer).sort((a, b) => b.puntos - a.puntos).slice(0, 10);
  const topTripleros = Object.values(byPlayer).sort((a, b) => b.triples - a.triples).slice(0, 10);
  const teamTotalPts = Object.values(byPlayer).reduce((s, p) => s + p.puntos, 0);
  const teamTotalTri = Object.values(byPlayer).reduce((s, p) => s + p.triples, 0);

  const eligible = eligibility?.filter((e) => e.elegible).length ?? 0;

  const phaseSelector = (
    <div style={{ marginBottom: 14 }}>
      <Radio.Group
        value={phase}
        onChange={(e) => setPhase(e.target.value)}
        buttonStyle="solid"
        size="middle"
      >
        <Radio.Button value="Ambas">Toda la Temporada</Radio.Button>
        <Radio.Button value="Fase Regular">Fase Regular</Radio.Button>
        <Radio.Button value="Liguilla">Liguilla</Radio.Button>
      </Radio.Group>
    </div>
  );

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={740}
      centered
      className="team-detail-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1.5px solid rgba(245, 158, 11, 0.4)',
                color: 'var(--gold-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 900,
              }}
            >
              🏀
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '0.02em' }}>
                {team.equipo}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>{seasonName}</div>
            </div>
          </div>
        </div>
      }
    >
      {/* ── Barra de Métricas Clave ─────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(68px, 1fr))',
          gap: 8,
          marginBottom: 20,
        }}
      >
        {[
          { label: 'PJ', value: team.PJ, color: '#f8fafc' },
          { label: 'PG', value: team.PG, color: '#4ade80' },
          { label: 'PP', value: team.PP, color: '#f87171' },
          { label: 'WO', value: team.WO, color: team.WO > 0 ? '#fbbf24' : '#64748b' },
          { label: 'PF', value: team.PF, color: '#93c5fd' },
          { label: 'PC', value: team.PC, color: '#cbd5e1' },
          { label: 'DP', value: team.DP > 0 ? `+${team.DP}` : team.DP, color: team.DP >= 0 ? '#4ade80' : '#f87171' },
          { label: 'PTS', value: team.Pts, color: '#fde68a', bold: true },
        ].map(({ label, value, color, bold }) => (
          <div
            key={label}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 10,
              padding: '8px 4px',
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ color, fontWeight: bold ? 900 : 700, fontSize: 16, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin description="Cargando ficha de equipo..." /></div>
      ) : (
        <Tabs
          size="small"
          items={[
            {
              key: 'chart',
              label: '📊 Rendimiento',
              children: (
                <div>
                  {phaseSelector}
                  {/* Resumen numérico */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 14 }}>
                    {[
                      { label: 'Total Anotados', value: totalPF, color: '#4ade80' },
                      { label: 'Total Recibidos', value: totalPC, color: '#f87171' },
                      { label: 'Promedio Anotado', value: avgPF, color: '#4ade80' },
                      { label: 'Promedio Recibido', value: avgPC, color: '#f87171' },
                      { label: 'Pts Jugadores', value: teamTotalPts, color: '#fde68a' },
                      { label: 'Triples Totales', value: teamTotalTri, color: '#38bdf8' },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: 8,
                          padding: '6px 10px',
                        }}
                      >
                        <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600 }}>{label}</div>
                        <div style={{ color, fontWeight: 700, fontSize: 15, marginTop: 2 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {chartData.length === 0 ? (
                    <Text style={{ color: '#64748b', display: 'block', textAlign: 'center', padding: 24 }}>
                      Sin partidos jugados en esta fase
                    </Text>
                  ) : (
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                        <XAxis dataKey="jornada" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            background: '#0e121a',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          labelStyle={{ color: 'var(--gold-soft)', fontWeight: 700 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                        <Bar dataKey="PF" name="Anotados" fill="#4ade80" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="PC" name="Recibidos" fill="#f87171" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              ),
            },
            {
              key: 'roster',
              label: `👥 Cédula (${players.length})`,
              children: (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 0' }}>
                  {players.length === 0 ? (
                    <Text style={{ color: '#64748b' }}>Sin jugadores registrados</Text>
                  ) : (
                    players.map((p) => {
                      const elig = eligibility?.find((e) => e.jugador_id === p.id);
                      return (
                        <Tag
                          key={p.id}
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            borderRadius: 8,
                            background: !p.is_active
                              ? 'rgba(255, 255, 255, 0.04)'
                              : elig?.elegible
                              ? 'rgba(74, 222, 128, 0.1)'
                              : 'rgba(248, 113, 113, 0.1)',
                            borderColor: !p.is_active
                              ? 'rgba(255, 255, 255, 0.1)'
                              : elig?.elegible
                              ? 'rgba(74, 222, 128, 0.3)'
                              : 'rgba(248, 113, 113, 0.3)',
                            color: !p.is_active
                              ? '#64748b'
                              : elig?.elegible
                              ? '#4ade80'
                              : '#f87171',
                            fontWeight: 600,
                          }}
                        >
                          #{formatPlayerNumber(p.number, '?')} {p.name}
                          {!p.is_active && ' (baja)'}
                        </Tag>
                      );
                    })
                  )}
                </div>
              ),
            },
            {
              key: 'scorers',
              label: '⭐ Anotadores',
              children: (
                <div>
                  {phaseSelector}
                  {topScorers.length === 0 ? (
                    <Text style={{ color: '#64748b', display: 'block', textAlign: 'center', padding: 24 }}>
                      Sin estadísticas registradas en esta fase
                    </Text>
                  ) : (
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: 280, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, width: 44, textAlign: 'center' }}>#</th>
                          <th style={{ ...thStyle, textAlign: 'left' }}>Jugador</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Puntos</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>3PT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topScorers.map((s, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              background: i === 0 ? 'rgba(245, 158, 11, 0.06)' : undefined,
                            }}
                          >
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8', fontWeight: 600, fontSize: 12 }}>
                              {i + 1}
                            </td>
                            <td style={{ padding: '8px 10px', fontSize: 13, color: '#f8fafc', fontWeight: 600 }}>
                              {s.nombre}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--gold-soft)', fontSize: 13 }}>
                              {s.puntos}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#94a3b8', fontSize: 13 }}>
                              {s.triples}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'tripleros',
              label: '🎯 Tripleros',
              children: (
                <div>
                  {phaseSelector}
                  {topTripleros.filter((s) => s.triples > 0).length === 0 ? (
                    <Text style={{ color: '#64748b', display: 'block', textAlign: 'center', padding: 24 }}>
                      Sin triples registrados en esta fase
                    </Text>
                  ) : (
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: 280, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, width: 44, textAlign: 'center' }}>#</th>
                          <th style={{ ...thStyle, textAlign: 'left' }}>Jugador</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>3PT</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Puntos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topTripleros.filter((s) => s.triples > 0).map((s, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              background: i === 0 ? 'rgba(56, 189, 248, 0.06)' : undefined,
                            }}
                          >
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8', fontWeight: 600, fontSize: 12 }}>
                              {i + 1}
                            </td>
                            <td style={{ padding: '8px 10px', fontSize: 13, color: '#f8fafc', fontWeight: 600 }}>
                              {s.nombre}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#38bdf8', fontSize: 13 }}>
                              {s.triples}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#94a3b8', fontSize: 13 }}>
                              {s.puntos}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'eligibility',
              label: `✅ Elegibilidad (${eligible}/${eligibility?.length ?? 0})`,
              children: !eligibility ? (
                <Spin />
              ) : eligibility.length === 0 ? (
                <Text style={{ color: '#64748b' }}>Sin jugadores activos</Text>
              ) : (
                <div>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      marginBottom: 12,
                      fontSize: 12,
                      color: '#cbd5e1',
                    }}
                  >
                    Mínimo requerido: <strong style={{ color: 'var(--gold-soft)' }}>{eligibility[0]?.min_requerido ?? '?'} partidos</strong> (de {team.PJ} disputados por el equipo)
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {eligibility.map((e) => (
                      <div
                        key={e.jugador_id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          padding: '8px 4px',
                        }}
                      >
                        <Text style={{ fontSize: 13, color: '#f8fafc', fontWeight: 500 }}>{e.nombre}</Text>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>{e.asistencias} asist.</span>
                          <Tag
                            style={{
                              margin: 0,
                              borderRadius: 6,
                              background: e.elegible ? 'rgba(74, 222, 128, 0.12)' : 'rgba(248, 113, 113, 0.12)',
                              borderColor: e.elegible ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)',
                              color: e.elegible ? '#4ade80' : '#f87171',
                              fontWeight: 700,
                            }}
                          >
                            {e.elegible ? 'Elegible' : 'No elegible'}
                          </Tag>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}
