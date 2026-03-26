'use client';

import AdminLayout from '@/app/components/AdminLayout';
import { Select, Typography, Alert, Spin, Tag, Button } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import SeasonSelector from '@/app/components/SeasonSelector';
import EligibilityTable from '@/app/components/EligibilityTable';
import { calcularElegibilidad } from '@/lib/eligibility';
import { generateEligibilityPDF } from '@/lib/pdfReport';
import { calcularPosiciones, MatchForStandings } from '@/lib/standings';

const { Title, Text } = Typography;

export default function EligibilityPage() {
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
      .then(({ data }) => { if (data) setSeasonId(data.id); });
  }, []);

  const { data: selectedSeason } = useQuery({
    queryKey: ['season-detail', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data } = await supabase.from('seasons').select('id, name').eq('id', seasonId!).single();
      return data;
    },
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data } = await supabase.from('teams').select('id, name').eq('season_id', seasonId!).eq('status', 'Activo').order('name');
      return data ?? [];
    },
  });

  const { data: allMatches = [] } = useQuery({
    queryKey: ['matches', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data } = await supabase.from('matches')
        .select(`id, season_id, home_team_id, away_team_id, home_score, away_score, status,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)`)
        .eq('season_id', seasonId!);
      return (data ?? []) as any[];
    },
  });

  const { data: allStats = [] } = useQuery({
    queryKey: ['stats', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const matchIds = allMatches.map((m: any) => m.id);
      if (matchIds.length === 0) return [];
      const { data } = await supabase.from('player_match_stats')
        .select('player_id, match_id, team_id, played, points, triples, players!inner(id, name)')
        .in('match_id', matchIds).eq('played', true);
      return data ?? [];
    },
  });

  const { data: eligibilityData, isLoading: loadingElig } = useQuery({
    queryKey: ['eligibility', selectedTeamId, seasonId],
    enabled: !!selectedTeamId && !!seasonId,
    queryFn: () => calcularElegibilidad(supabase, selectedTeamId!, seasonId!),
  });

  const standings = calcularPosiciones(
    allMatches.filter((m: any) => ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status ?? '')) as MatchForStandings[]
  );

  const handlePDF = () => {
    if (!selectedSeason) return;
    generateEligibilityPDF(standings, allMatches, selectedSeason.name, allStats as any[]);
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ color: '#FAAD14', margin: 0 }}>✅ Elegibilidad de Liguilla</Title>
          <SeasonSelector value={seasonId} onChange={(id) => { setSeasonId(id); setSelectedTeamId(null); }} style={{ marginTop: 8 }} />
        </div>
        <Button icon={<FilePdfOutlined />} onClick={handlePDF} disabled={standings.length === 0} type="primary">
          Descargar PDF (Top 8)
        </Button>
      </div>

      <div style={{ marginBottom: 12, padding: '8px 12px', background: '#111', borderRadius: 6, border: '1px solid #222' }}>
        <Text style={{ color: '#888', fontSize: 12 }}>
          Fórmula: <b style={{ color: '#fff' }}>mínimo = ⌊partidos_equipo / 2⌋ + 1</b>
          {'  '}· Ejemplo: 11 partidos → mínimo <b style={{ color: '#FAAD14' }}>6</b> asistencias
        </Text>
      </div>

      {!!seasonId && (
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#888', display: 'block', marginBottom: 6 }}>Selecciona el equipo:</Text>
          <Select
            style={{ width: '100%', maxWidth: 400 }}
            placeholder="-- Seleccionar equipo --"
            options={teams.map((t) => ({ label: t.name, value: t.id }))}
            value={selectedTeamId}
            onChange={setSelectedTeamId}
            showSearch
          />
        </div>
      )}

      {loadingElig && selectedTeamId && <Spin tip="Calculando..." />}

      {eligibilityData && !loadingElig && (
        <div>
          <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 10 }}>
            Total de partidos del equipo: <b style={{ color: '#fff' }}>{eligibilityData.totalPartidos}</b>
            {'  '}·{'  '}
            Mínimo: <b style={{ color: '#FAAD14' }}>{eligibilityData.minRequerido} asistencias</b>
          </Text>
          <EligibilityTable data={eligibilityData.results} totalPartidos={eligibilityData.totalPartidos} />
        </div>
      )}

      {eligibilityData?.results.length === 0 && !loadingElig && selectedTeamId && (
        <Alert type="info" message="No hay jugadores activos en este equipo" showIcon />
      )}
    </AdminLayout>
  );
}
