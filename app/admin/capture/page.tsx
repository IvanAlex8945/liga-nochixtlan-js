'use client';

import AdminLayout from '@/app/components/AdminLayout';
import { Select, Typography, Alert, Spin, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import SeasonSelector from '@/app/components/SeasonSelector';
import CaptureForm from '@/app/components/CaptureForm';
import type { PlayerRow } from '@/app/components/PlayerAttendanceTable';
import { calcularElegibilidad } from '@/lib/eligibility';

const { Title, Text } = Typography;

interface Match {
  id: number;
  jornada: number;
  status: string;
  phase?: string;
  home_team: { id: number; name: string };
  away_team: { id: number; name: string };
}

interface PlayerCredential {
  player_id: number;
  credential_code: string;
  verify_token: string;
  status: string;
}

interface PlayerRecord {
  id: number;
  name: string;
  number: number | null;
  team_id: number;
  photo_thumb_url?: string | null;
  photo_url?: string | null;
}

async function fetchTeamCredentials(playerIds: number[], seasonId: number) {
  if (playerIds.length === 0) {
    return [] as PlayerCredential[];
  }

  const params = new URLSearchParams();
  params.set('seasonId', String(seasonId));
  for (const playerId of playerIds) {
    params.append('playerId', String(playerId));
  }

  const response = await fetch(`/api/admin/team-credentials?${params.toString()}`);
  const payload = (await response.json()) as {
    credentials?: PlayerCredential[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? 'No se pudieron consultar las credenciales del equipo.');
  }

  return payload.credentials ?? [];
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
        .select(`id, jornada, status, phase,
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
    queryKey: ['players-capture-home', selectedMatch?.id, seasonId],
    enabled: !!selectedMatch,
    queryFn: async () => {
      const [playersRes, statsRes] = await Promise.all([
        supabase.from('players').select('id, name, number, team_id, photo_thumb_url, photo_url')
          .eq('team_id', selectedMatch!.home_team.id).eq('is_active', true).order('number'),
        supabase.from('player_match_stats').select('*').eq('match_id', selectedMatch!.id)
      ]);
      
      let playersData = (playersRes.data ?? []) as PlayerRecord[];
      let eligibilityMap = new Map<number, { elegible: boolean; asistencias: number; min: number }>();
      if (selectedMatch?.phase && selectedMatch.phase !== 'Fase Regular') {
        const { results } = await calcularElegibilidad(supabase, selectedMatch.home_team.id, seasonId!);
        const eligibleSet = new Set(results.filter(r => r.elegible).map(r => r.jugador_id));
        eligibilityMap = new Map(
          results.map((result) => [
            result.jugador_id,
            { elegible: result.elegible, asistencias: result.asistencias, min: result.min_requerido },
          ])
        );
        playersData = playersData.filter(p => eligibleSet.has(p.id));
      }

      const credentials = await fetchTeamCredentials(
        playersData.map((player) => player.id),
        seasonId!
      );

      const credentialMap = new Map<number, PlayerCredential>(
        credentials.map((credential) => [credential.player_id, credential])
      );
      const stats = statsRes.data ?? [];
      return playersData.map((p) => {
        const stat = stats.find((s) => s.player_id === p.id);
        const credential = credentialMap.get(p.id);
        const eligibility = eligibilityMap.get(p.id);
        return { 
          player_id: p.id, team_id: p.team_id, name: p.name, number: p.number, 
          photo_thumb_url: p.photo_thumb_url ?? null,
          photo_url: p.photo_url ?? null,
          credential_code: credential?.credential_code ?? null,
          verify_token: credential?.verify_token ?? null,
          credential_status: credential?.status ?? null,
          eligibility_label: eligibility ? `${eligibility.asistencias}/${eligibility.min}` : null,
          is_eligible: eligibility ? eligibility.elegible : null,
          played: stat ? stat.played : false, 
          points: stat ? stat.points : 0, 
          triples: stat ? stat.triples : 0 
        };
      });
    },
  });

  const { data: awayPlayers = [], isLoading: loadingAway } = useQuery<PlayerRow[]>({
    queryKey: ['players-capture-away', selectedMatch?.id, seasonId],
    enabled: !!selectedMatch,
    queryFn: async () => {
      const [playersRes, statsRes] = await Promise.all([
        supabase.from('players').select('id, name, number, team_id, photo_thumb_url, photo_url')
          .eq('team_id', selectedMatch!.away_team.id).eq('is_active', true).order('number'),
        supabase.from('player_match_stats').select('*').eq('match_id', selectedMatch!.id)
      ]);
      
      let playersData = (playersRes.data ?? []) as PlayerRecord[];
      let eligibilityMap = new Map<number, { elegible: boolean; asistencias: number; min: number }>();
      if (selectedMatch?.phase && selectedMatch.phase !== 'Fase Regular') {
        const { results } = await calcularElegibilidad(supabase, selectedMatch.away_team.id, seasonId!);
        const eligibleSet = new Set(results.filter(r => r.elegible).map(r => r.jugador_id));
        eligibilityMap = new Map(
          results.map((result) => [
            result.jugador_id,
            { elegible: result.elegible, asistencias: result.asistencias, min: result.min_requerido },
          ])
        );
        playersData = playersData.filter(p => eligibleSet.has(p.id));
      }

      const credentials = await fetchTeamCredentials(
        playersData.map((player) => player.id),
        seasonId!
      );

      const credentialMap = new Map<number, PlayerCredential>(
        credentials.map((credential) => [credential.player_id, credential])
      );
      const stats = statsRes.data ?? [];
      return playersData.map((p) => {
        const stat = stats.find((s) => s.player_id === p.id);
        const credential = credentialMap.get(p.id);
        const eligibility = eligibilityMap.get(p.id);
        return { 
          player_id: p.id, team_id: p.team_id, name: p.name, number: p.number, 
          photo_thumb_url: p.photo_thumb_url ?? null,
          photo_url: p.photo_url ?? null,
          credential_code: credential?.credential_code ?? null,
          verify_token: credential?.verify_token ?? null,
          credential_status: credential?.status ?? null,
          eligibility_label: eligibility ? `${eligibility.asistencias}/${eligibility.min}` : null,
          is_eligible: eligibility ? eligibility.elegible : null,
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
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title="Fase 5: pase de lista rápido"
          description="Marca presentes desde la cédula digital del equipo. Usa 'Abrir' solo cuando necesites confirmar identidad o vigencia de una credencial."
        />
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
            <Spin description="Cargando cédulas..." />
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
