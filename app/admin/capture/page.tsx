'use client';

import AdminLayout from '@/app/components/AdminLayout';
import { Select, Typography, Alert, Spin, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import SeasonSelector from '@/app/components/SeasonSelector';
import CaptureForm from '@/app/components/CaptureForm';
import type { PlayerRow } from '@/app/components/PlayerAttendanceTable';

const { Title, Text } = Typography;

interface Match {
  id: number;
  jornada: number;
  status: string;
  home_team: { id: number; name: string };
  away_team: { id: number; name: string };
}

export default function CapturePage() {
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [selectedJornada, setSelectedJornada] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
      .then(({ data }) => { if (data) setSeasonId(data.id); });
  }, []);

  const { data: matches = [], isLoading: loadingMatches } = useQuery<Match[]>({
    queryKey: ['matches-programmed', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select(`id, jornada, status,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)`)
        .eq('season_id', seasonId!)
        .order('jornada');
      return (data ?? []) as unknown as Match[];
    },
  });

  const jornadas = Array.from(new Set(matches.map(m => m.jornada))).sort((a, b) => a - b);
  const filteredMatches = selectedJornada ? matches.filter(m => m.jornada === selectedJornada) : matches;

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  const { data: homePlayers = [], isLoading: loadingHome } = useQuery<PlayerRow[]>({
    queryKey: ['players-capture-home', selectedMatch?.id],
    enabled: !!selectedMatch,
    queryFn: async () => {
      const [playersRes, statsRes] = await Promise.all([
        supabase.from('players').select('id, name, number, team_id')
          .eq('team_id', selectedMatch!.home_team.id).eq('is_active', true).order('number'),
        supabase.from('player_match_stats').select('*').eq('match_id', selectedMatch!.id)
      ]);
      const stats = statsRes.data ?? [];
      return (playersRes.data ?? []).map((p) => {
        const stat = stats.find((s) => s.player_id === p.id);
        return { 
          player_id: p.id, team_id: p.team_id, name: p.name, number: p.number, 
          played: stat ? stat.played : false, 
          points: stat ? stat.points : 0, 
          triples: stat ? stat.triples : 0 
        };
      });
    },
  });

  const { data: awayPlayers = [], isLoading: loadingAway } = useQuery<PlayerRow[]>({
    queryKey: ['players-capture-away', selectedMatch?.id],
    enabled: !!selectedMatch,
    queryFn: async () => {
      const [playersRes, statsRes] = await Promise.all([
        supabase.from('players').select('id, name, number, team_id')
          .eq('team_id', selectedMatch!.away_team.id).eq('is_active', true).order('number'),
        supabase.from('player_match_stats').select('*').eq('match_id', selectedMatch!.id)
      ]);
      const stats = statsRes.data ?? [];
      return (playersRes.data ?? []).map((p) => {
        const stat = stats.find((s) => s.player_id === p.id);
        return { 
          player_id: p.id, team_id: p.team_id, name: p.name, number: p.number, 
          played: stat ? stat.played : false, 
          points: stat ? stat.points : 0, 
          triples: stat ? stat.triples : 0 
        };
      });
    },
  });

  // Calculate initialResultType based on status
  let initialResultType: 'Normal' | 'WO_Local' | 'WO_Visitante' | 'WO_Doble' = 'Normal';
  if (selectedMatch?.status === 'WO Local') initialResultType = 'WO_Local';
  if (selectedMatch?.status === 'WO Visitante') initialResultType = 'WO_Visitante';
  if (selectedMatch?.status === 'WO Doble') initialResultType = 'WO_Doble';

  return (
    <AdminLayout>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ color: '#FAAD14', marginBottom: 12 }}>✍️ Captura de Resultado</Title>
        <SeasonSelector value={seasonId} onChange={(id) => { setSeasonId(id); setSelectedMatchId(null); setSelectedJornada(null); }} />
      </div>

      {!!seasonId && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 150px', maxWidth: 200 }}>
            <Text style={{ color: '#888', display: 'block', marginBottom: 6 }}>Jornada:</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Todas las jornadas"
              allowClear
              value={selectedJornada}
              onChange={(val) => { setSelectedJornada(val); setSelectedMatchId(null); }}
              options={jornadas.map(j => ({ label: `Jornada ${j}`, value: j }))}
              loading={loadingMatches}
            />
          </div>
          <div style={{ flex: '2 1 300px', maxWidth: 500 }}>
            <Text style={{ color: '#888', display: 'block', marginBottom: 6 }}>Partido a capturar:</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="-- Seleccionar partido programado --"
              options={filteredMatches.map((m) => ({
                label: `J${m.jornada} – ${m.home_team?.name} vs ${m.away_team?.name} ${m.status !== 'Programado' ? `(${m.status})` : ''}`,
                value: m.id,
              }))}
              value={selectedMatchId}
              onChange={setSelectedMatchId}
              loading={loadingMatches}
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              notFoundContent={<Text style={{ color: '#555' }}>{loadingMatches ? 'Cargando...' : 'Sin partidos en esta jornada'}</Text>}
            />
          </div>
          {matches.length === 0 && !loadingMatches && (
            <Alert type="info" message="No hay partidos programados en esta temporada" showIcon style={{ width: '100%', marginTop: 10 }} />
          )}
        </div>
      )}

      {selectedMatch && (
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <Text style={{ color: '#888', fontSize: 12 }}>Jornada {selectedMatch.jornada}</Text>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 4 }}>
              {selectedMatch.home_team?.name}
              <span style={{ color: '#555', margin: '0 12px', fontWeight: 400 }}>vs</span>
              {selectedMatch.away_team?.name}
            </div>
            <Tag color={selectedMatch.status === 'Programado' ? 'blue' : 'green'} style={{ marginTop: 6 }}>
              {selectedMatch.status}
            </Tag>
          </div>
          {loadingHome || loadingAway ? (
            <Spin tip="Cargando cédulas..." />
          ) : (
            <CaptureForm
              key={selectedMatch.id}
              match={selectedMatch}
              homePlayers={homePlayers}
              awayPlayers={awayPlayers}
              initialResultType={initialResultType}
              onSaved={() => setSelectedMatchId(null)}
            />
          )}
        </div>
      )}
    </AdminLayout>
  );
}
