'use client';

/**
 * TeamDetailModal.tsx — v2 with Phase Filter
 * Click on team name → Modal with 4 tabs + phase selector
 */

import { useState, useEffect, useMemo } from 'react';
import { Modal, Typography, Tag, Tabs, Spin, Radio } from 'antd';
import { supabase } from '@/lib/supabase';
import { calcularElegibilidad } from '@/lib/eligibility';
import type { TeamStats } from '@/lib/standings';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

const { Text } = Typography;

interface Player {
  id: number;
  name: string;
  number: number | null;
  is_active: boolean;
}

import type { MatchData, PlayerStats } from './PublicPageClient';

interface Props {
  team: TeamStats;
  seasonId: number;
  seasonName: string;
  seasonMatches: MatchData[];
  allStats: PlayerStats[];
  onClose: () => void;
}

type Phase = 'Ambas' | 'Fase Regular' | 'Liguilla';

export default function TeamDetailModal({ team, seasonId, seasonName, seasonMatches, allStats, onClose }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [eligibility, setEligibility] = useState<{ jugador_id: number; nombre: string; asistencias: number; elegible: boolean; min_requerido: number }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('Ambas');

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

  // ── Phase-filtered matches for this team ────────────────
  const teamMatches = useMemo(() =>
    seasonMatches.filter((m) =>
      (m.home_team_id === team.id || m.away_team_id === team.id) &&
      (phase === 'Ambas' || m.phase === phase)
    ),
    [seasonMatches, team.id, phase]);

  const playedMatches = useMemo(() =>
    teamMatches.filter((m) => m.status === 'Jugado'),
    [teamMatches]);

  // ── Chart data ───────────────────────────────────────────
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

  // ── Top scorers for this team (phase-filtered) ───────────
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
    <Radio.Group
      value={phase}
      onChange={(e) => setPhase(e.target.value)}
      buttonStyle="solid"
      size="small"
      style={{ marginBottom: 12 }}
    >
      <Radio.Button value="Ambas">Ambas fases</Radio.Button>
      <Radio.Button value="Fase Regular">Fase Regular</Radio.Button>
      <Radio.Button value="Liguilla">Liguilla</Radio.Button>
    </Radio.Group>
  );

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={720}
      style={{ top: 20 }}
      title={
        <div style={{ color: '#FAAD14', fontWeight: 700, fontSize: 18 }}>
          🏀 {team.equipo}
          <Text style={{ color: '#888', fontSize: 13, fontWeight: 400, marginLeft: 12 }}>{seasonName}</Text>
        </div>
      }
    >
      {/* ── Stats bar ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { label: 'PJ', value: team.PJ, color: '#fff' },
          { label: 'PG', value: team.PG, color: '#52c41a' },
          { label: 'PP', value: team.PP, color: '#ff4d4f' },
          { label: 'WO', value: team.WO, color: '#faad14' },
          { label: 'PF', value: team.PF, color: '#1677ff' },
          { label: 'PC', value: team.PC, color: '#ff7875' },
          { label: 'DP', value: team.DP > 0 ? `+${team.DP}` : team.DP, color: team.DP >= 0 ? '#52c41a' : '#ff4d4f' },
          { label: 'Pts', value: team.Pts, color: '#FAAD14', bold: true },
        ].map(({ label, value, color, bold }) => (
          <div key={label} style={{ background: '#111', borderRadius: 8, padding: '7px 12px', textAlign: 'center', flex: '1 1 54px' }}>
            <div style={{ color: '#555', fontSize: 10 }}>{label}</div>
            <div style={{ color, fontWeight: bold ? 700 : 500, fontSize: 17 }}>{value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin tip="Cargando..." /></div>
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
                  {/* Aggregated totals */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    {[
                      { label: 'Total anotados', value: totalPF, color: '#52c41a' },
                      { label: 'Total recibidos', value: totalPC, color: '#ff4d4f' },
                      { label: 'Prom. anotados', value: avgPF, color: '#52c41a' },
                      { label: 'Prom. recibidos', value: avgPC, color: '#ff4d4f' },
                      { label: 'Total Pts jugadores', value: teamTotalPts, color: '#FAAD14' },
                      { label: 'Total 3PT', value: teamTotalTri, color: '#1677ff' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: '#111', borderRadius: 6, padding: '6px 12px', flex: '1 1 100px' }}>
                        <div style={{ color: '#555', fontSize: 10 }}>{label}</div>
                        <div style={{ color, fontWeight: 700, fontSize: 16 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {chartData.length === 0 ? (
                    <Text style={{ color: '#555' }}>Sin partidos jugados en esta fase</Text>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData} margin={{ left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis dataKey="jornada" tick={{ fill: '#888', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6 }}
                          labelStyle={{ color: '#FAAD14' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
                        <Bar dataKey="PF" name="Anotados" fill="#52c41a" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="PC" name="Recibidos" fill="#ff4d4f" radius={[3, 3, 0, 0]} />
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {players.length === 0
                    ? <Text style={{ color: '#555' }}>Sin jugadores registrados</Text>
                    : players.map((p) => {
                        const elig = eligibility?.find((e) => e.jugador_id === p.id);
                        return (
                          <Tag
                            key={p.id}
                            color={!p.is_active ? 'default' : elig?.elegible ? 'success' : 'error'}
                            style={{ padding: '4px 10px', fontSize: 13 }}
                          >
                            #{p.number ?? '?'} {p.name}{!p.is_active && ' (baja)'}
                          </Tag>
                        );
                      })
                  }
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
                    <Text style={{ color: '#555' }}>Sin estadísticas en esta fase</Text>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                          <th style={thS}>#</th>
                          <th style={{ ...thS, textAlign: 'left' }}>Jugador</th>
                          <th style={{ ...thS, textAlign: 'right' }}>Pts</th>
                          <th style={{ ...thS, textAlign: 'right' }}>3PT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topScorers.map((s, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #1a1a1a', background: i === 0 ? 'rgba(250,173,20,0.05)' : undefined }}>
                            <td style={{ ...thS, color: '#666' }}>{i + 1}</td>
                            <td style={{ padding: '6px 8px', fontSize: 13 }}>{s.nombre}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#FAAD14' }}>{s.puntos}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#888' }}>{s.triples}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                    <Text style={{ color: '#555' }}>Sin triples registrados en esta fase</Text>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                          <th style={thS}>#</th>
                          <th style={{ ...thS, textAlign: 'left' }}>Jugador</th>
                          <th style={{ ...thS, textAlign: 'right' }}>3PT</th>
                          <th style={{ ...thS, textAlign: 'right' }}>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topTripleros.filter((s) => s.triples > 0).map((s, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #1a1a1a', background: i === 0 ? 'rgba(22,119,255,0.06)' : undefined }}>
                            <td style={{ ...thS, color: '#666' }}>{i + 1}</td>
                            <td style={{ padding: '6px 8px', fontSize: 13 }}>{s.nombre}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#1677ff' }}>{s.triples}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#888' }}>{s.puntos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                <Text style={{ color: '#555' }}>Sin jugadores activos</Text>
              ) : (
                <div>
                  <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 8 }}>
                    Mínimo: {eligibility[0]?.min_requerido ?? '?'} partidos (de {team.PJ} totales)
                  </Text>
                  {eligibility.map((e) => (
                    <div key={e.jugador_id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      borderBottom: '1px solid #1a1a1a', padding: '6px 0',
                    }}>
                      <Text style={{ fontSize: 13 }}>{e.nombre}</Text>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Text style={{ color: '#888', fontSize: 12 }}>{e.asistencias} asist.</Text>
                        <Tag color={e.elegible ? 'success' : 'error'} style={{ margin: 0 }}>
                          {e.elegible ? '✅ Elegible' : '❌ No'}
                        </Tag>
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}

const thS: React.CSSProperties = { padding: '6px 8px', color: '#FAAD14', textAlign: 'center', fontWeight: 600, fontSize: 11 };
