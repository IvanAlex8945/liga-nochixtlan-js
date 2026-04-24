'use client';

import { useState, useMemo } from 'react';
import { Modal, Button, Checkbox, Select, Typography, message } from 'antd';
import { calcularPosiciones, MatchForStandings, TeamStats } from '@/lib/standings';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const { Title, Text } = Typography;

interface Match {
  id: number;
  jornada: number;
  phase: string;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
  home_team?: { id: number; name: string };
  away_team?: { id: number; name: string };
}

export default function LiguillaModal({
  open,
  onClose,
  seasonId,
  matches,
  teams
}: {
  open: boolean;
  onClose: () => void;
  seasonId: number;
  matches: Match[];
  teams: unknown[];
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [formatCuartos, setFormatCuartos] = useState<'1' | '3'>('1');
  const [formatSemis, setFormatSemis] = useState<'1' | '3'>('1');
  const [selectedSemisTeamIds, setSelectedSemisTeamIds] = useState<number[]>([]);
  const [selectedFinalistsIds, setSelectedFinalistsIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Calculate General Standings ONLY from Fase Regular
  const standbyFaseRegular = useMemo(() => {
    const regularMatches = matches.filter(m => !m.phase || m.phase === 'Fase Regular');
    // Adapt to MatchForStandings structure
    const st = calcularPosiciones(regularMatches as unknown as MatchForStandings[]);
    return st; // Ordered from 1st to Nth
  }, [matches]);

  const top8 = standbyFaseRegular.slice(0, 8);

  const cuartosExist = matches.some(m => m.phase === 'Cuartos de Final' || m.phase === 'Octavos de Final');
  const semisExist = matches.some(m => m.phase === 'Semifinal');
  const finalExists = matches.some(m => m.phase === 'Final');

  // Determinar en qué etapa de la liguilla nos encontramos automáticamente
  const defaultStep = useMemo(() => {
    if (!cuartosExist) return 1; // Hacer cuartos
    if (!semisExist) return 2; // Hacer semis
    if (!finalExists) return 3; // Hacer finales
    return 4; // Terminado
  }, [cuartosExist, semisExist, finalExists]);

  const insertMatches = async (matchesArray: Record<string, unknown>[]) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('matches').insert(matchesArray);
      if (error) throw error;
      message.success('Partidos de liguilla inyectados al calendario.');
      qc.invalidateQueries({ queryKey: ['matches'] });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        message.error(err.message);
      } else {
        message.error('Ocurrió un error inesperado al insertar partidos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateCuartos = () => {
    if (top8.length < 8) {
      message.error('No hay suficientes equipos (se necesitan 8) para arrancar la liguilla.');
      return;
    }

    const matchPairs = [
      { h: top8[0], a: top8[7] }, // 1 vs 8
      { h: top8[1], a: top8[6] }, // 2 vs 7
      { h: top8[2], a: top8[5] }, // 3 vs 6
      { h: top8[3], a: top8[4] }  // 4 vs 5
    ];

    const toInsert: Record<string, unknown>[] = [];
    const maxJornada = matches.length > 0 ? Math.max(...matches.map(m => m.jornada)) : 10;
    const nextJornada = maxJornada + 1;

    matchPairs.forEach(pair => {
      const loop = formatCuartos === '3' ? 3 : 1;
      for (let i = 1; i <= loop; i++) {
        toInsert.push({
          season_id: seasonId,
          jornada: loop === 1 ? nextJornada : nextJornada + (i - 1),
          phase: 'Cuartos de Final',
          status: 'Programado',
          home_team_id: i === 2 ? pair.a.id : pair.h.id, // Game 2 the away team is home
          away_team_id: i === 2 ? pair.h.id : pair.a.id,
        });
      }
    });

    insertMatches(toInsert);
  };

  const generateSemis = () => {
    if (selectedSemisTeamIds.length !== 4) {
      message.error('Debes seleccionar exactamente 4 equipos vencedores para arrancar la Semifinal.');
      return;
    }

    // Re-seeding logic
    const reseedingTeams = selectedSemisTeamIds
      .map(id => standbyFaseRegular.find(t => t.id === id))
      .filter((t): t is TeamStats => Boolean(t));

    // Sort heavily utilizing original stance (highest Pts, DP) - already sorted in standbyFaseRegular, so we just use index!
    reseedingTeams.sort((a, b) => {
      const idxA = standbyFaseRegular.findIndex(t => t.id === a.id);
      const idxB = standbyFaseRegular.findIndex(t => t.id === b.id);
      return idxA - idxB; // Lowest index is better
    });

    // 1st vs 4th, 2nd vs 3rd
    const matchPairs = [
      { h: reseedingTeams[0], a: reseedingTeams[3] },
      { h: reseedingTeams[1], a: reseedingTeams[2] }
    ];

    const toInsert: Record<string, unknown>[] = [];
    const maxJornada = matches.length > 0 ? Math.max(...matches.map(m => m.jornada)) : 10;
    const nextJornada = maxJornada + 1;

    matchPairs.forEach(pair => {
      const loop = formatSemis === '3' ? 3 : 1;
      for (let i = 1; i <= loop; i++) {
        toInsert.push({
          season_id: seasonId,
          jornada: loop === 1 ? nextJornada : nextJornada + (i - 1),
          phase: 'Semifinal',
          status: 'Programado',
          home_team_id: i === 2 ? pair.a.id : pair.h.id,
          away_team_id: i === 2 ? pair.h.id : pair.a.id,
        });
      }
    });

    insertMatches(toInsert);
  };

  const generateFinals = () => {
    if (selectedFinalistsIds.length !== 2) {
      message.error('Debes seleccionar exactamente 2 equipos vencedores para arrancar la Final.');
      return;
    }

    // Identificar a los perdedores de las semis para pelear 3er lugar
    // Quienes jugaron semis y NO estan en los finalistas definidos:
    const semisMatches = matches.filter(m => m.phase === 'Semifinal');
    const allSemiTeamIds = new Set<number>();
    semisMatches.forEach(m => { allSemiTeamIds.add(m.home_team_id); allSemiTeamIds.add(m.away_team_id); });
    
    selectedFinalistsIds.forEach(id => allSemiTeamIds.delete(id));
    const losersArray = Array.from(allSemiTeamIds); // Estos van a 3er lugar

    const toInsert: Record<string, unknown>[] = [];
    const maxJornada = matches.length > 0 ? Math.max(...matches.map(m => m.jornada)) : 10;
    const nextJornada = maxJornada + 1;

    // Gran Final
    toInsert.push({
      season_id: seasonId, jornada: nextJornada, phase: 'Final', status: 'Programado',
      home_team_id: selectedFinalistsIds[0], away_team_id: selectedFinalistsIds[1],
    });

    // 3er Lugar
    if (losersArray.length === 2) {
      toInsert.push({
        season_id: seasonId, jornada: nextJornada, phase: 'Tercer Lugar', status: 'Programado',
        home_team_id: losersArray[0], away_team_id: losersArray[1],
      });
    }

    insertMatches(toInsert);
  };


  if (defaultStep === 4) {
    return (
      <Modal open={open} onCancel={onClose} footer={null}>
        <div style={{ textAlign: 'center', padding: '30px 10px' }}>
          <Title level={3} style={{ color: '#FAAD14' }}>¡Liguilla Completa!</Title>
          <Text style={{ color: '#aaa' }}>Todas las fases de la liguilla (Cuartos, Semis y Final) ya fueron generadas en el calendario.</Text>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      title={<span style={{ color: '#FAAD14', fontSize: 20 }}>🔥 Dashboard Liguilla (Playoffs)</span>}
    >
      <div style={{ padding: '10px 0' }}>
        
        {defaultStep === 1 && (
          <div>
            <Title level={4} style={{ color: '#fff' }}>1. Generar Cuartos de Final</Title>
            <Text style={{ color: '#888', display: 'block', marginBottom: 16 }}>
              Se cruzará al 1 vs 8, 2 vs 7, etc., basado estrictamente en el Top 8 de la Fase Regular de esta temporada.
            </Text>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1, background: '#111', padding: 12, borderRadius: 8, border: '1px solid #333' }}>
                <Text strong style={{ color: '#FAAD14' }}>1°</Text> {top8[0]?.equipo} <br/>
                <Text style={{ color: '#888', fontSize: 11 }}>vs</Text> <br/>
                <Text strong style={{ color: '#666' }}>8°</Text> {top8[7]?.equipo}
              </div>
              <div style={{ flex: 1, background: '#111', padding: 12, borderRadius: 8, border: '1px solid #333' }}>
                <Text strong style={{ color: '#FAAD14' }}>2°</Text> {top8[1]?.equipo} <br/>
                <Text style={{ color: '#888', fontSize: 11 }}>vs</Text> <br/>
                <Text strong style={{ color: '#666' }}>7°</Text> {top8[6]?.equipo}
              </div>
              <div style={{ flex: 1, background: '#111', padding: 12, borderRadius: 8, border: '1px solid #333' }}>
                <Text strong style={{ color: '#FAAD14' }}>3°</Text> {top8[2]?.equipo} <br/>
                <Text style={{ color: '#888', fontSize: 11 }}>vs</Text> <br/>
                <Text strong style={{ color: '#666' }}>6°</Text> {top8[5]?.equipo}
              </div>
              <div style={{ flex: 1, background: '#111', padding: 12, borderRadius: 8, border: '1px solid #333' }}>
                <Text strong style={{ color: '#FAAD14' }}>4°</Text> {top8[3]?.equipo} <br/>
                <Text style={{ color: '#888', fontSize: 11 }}>vs</Text> <br/>
                <Text strong style={{ color: '#666' }}>5°</Text> {top8[4]?.equipo}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Text>Formato de serie:</Text>
              <Select value={formatCuartos} onChange={setFormatCuartos} style={{ width: 180 }}>
                <Select.Option value="1">A un solo partido</Select.Option>
                <Select.Option value="3">Serie 2 de 3</Select.Option>
              </Select>
            </div>

            <div style={{ marginTop: 24 }}>
              <Button type="primary" size="large" onClick={generateCuartos} loading={loading} style={{ background: '#FAAD14', color: '#000', fontWeight: 600 }}>
                ¡Generar Cuartos de Final!
              </Button>
            </div>
          </div>
        )}

        {defaultStep === 2 && (
          <div>
            <Title level={4} style={{ color: '#fff' }}>2. Re-seeding Semifinales</Title>
            <Text style={{ color: '#888', display: 'block', marginBottom: 16 }}>
              Selecciona a los 4 equipos que ganaron sus series de cuartos. El sistema automáticamente detectará y protegerá al equipo con mejor ranking de la fase regular.
            </Text>

            <Checkbox.Group
              options={top8.map(t => ({ label: `${t.equipo} (General #${standbyFaseRegular.findIndex(x => x.id === t.id)+1})`, value: t.id }))}
              value={selectedSemisTeamIds}
              onChange={(v) => setSelectedSemisTeamIds(v as number[])}
              style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#111', padding: 16, borderRadius: 8, border: '1px solid #222' }}
            />

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 20 }}>
              <Text>Formato de serie:</Text>
              <Select value={formatSemis} onChange={setFormatSemis} style={{ width: 180 }}>
                <Select.Option value="1">A un solo partido</Select.Option>
                <Select.Option value="3">Serie 2 de 3</Select.Option>
              </Select>
            </div>

            <div style={{ marginTop: 24 }}>
              <Button type="primary" size="large" disabled={selectedSemisTeamIds.length !== 4} onClick={generateSemis} loading={loading} style={{ background: '#FAAD14', color: '#000', fontWeight: 600 }}>
                ¡Ordenar y Generar Semis!
              </Button>
              {selectedSemisTeamIds.length !== 4 && <Text style={{ marginLeft: 16, color: '#f5222d' }}>Faltan {4 - selectedSemisTeamIds.length} equipos para avanzar.</Text>}
            </div>
          </div>
        )}

        {defaultStep === 3 && (
          <div>
            <Title level={4} style={{ color: '#fff' }}>3. Rumbo a la Gran Final</Title>
            <Text style={{ color: '#888', display: 'block', marginBottom: 16 }}>
              Selecciona a los 2 equipos vencedores de las Semifinales. El sistema hará que ellos jueguen la Gran Final a 1 partido, enviando al resto al duelo por el Tercer Lugar.
            </Text>

            <Checkbox.Group
              options={
                Array.from(new Set(matches.filter(m => m.phase === 'Semifinal').flatMap(m => [m.home_team, m.away_team])))
                  .filter((v, i, a) => v && a.findIndex(t => t?.id === v.id) === i)
                  .map((t) => ({ label: t?.name ?? 'Desconocido', value: t?.id as number }))
              }
              value={selectedFinalistsIds}
              onChange={(v) => setSelectedFinalistsIds(v as number[])}
              style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#111', padding: 16, borderRadius: 8, border: '1px solid #222' }}
            />

            <div style={{ marginTop: 24 }}>
              <Button type="primary" size="large" disabled={selectedFinalistsIds.length !== 2} onClick={generateFinals} loading={loading} style={{ background: '#FAAD14', color: '#000', fontWeight: 600 }}>
                ¡Crear Final + Tercer Lugar!
              </Button>
              {selectedFinalistsIds.length !== 2 && <Text style={{ marginLeft: 16, color: '#f5222d' }}>Puntúa a 2 equipos para continuar.</Text>}
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
