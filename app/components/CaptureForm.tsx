'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Radio,
  Row,
  Col,
  Button,
  Alert,
  Spin,
  message,
  Typography,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import PlayerAttendanceTable, { PlayerRow } from './PlayerAttendanceTable';
import { saveMatchResult, ResultType } from '@/lib/saveMatch';
import { supabase } from '@/lib/supabase';

const { Text } = Typography;

interface MatchInfo {
  id: number;
  home_team: { id: number; name: string };
  away_team: { id: number; name: string };
}

interface Props {
  match: MatchInfo;
  homePlayers: PlayerRow[];
  awayPlayers: PlayerRow[];
  initialResultType?: ResultType;
  onSaved?: () => void;
}

const scoreLabels: Record<ResultType, string> = {
  Normal: '',
  WO_Local:     'Local falta — Visitante gana 20-0. Se puede capturar asistencia.',
  WO_Visitante: 'Visitante falta — Local gana 20-0. Se puede capturar asistencia.',
  WO_Doble:     'Ambos equipos faltan — Marcador 0-0, 0 pts c/u. Solo se captura asistencia de quienes sí llegaron.',
};

const btnStyle: React.CSSProperties = { flex: '1 1 120px', height: 44, fontSize: 14 };

export default function CaptureForm({ match, homePlayers, awayPlayers, initialResultType = 'Normal', onSaved }: Props) {
  const [resultType, setResultType] = useState<ResultType>(initialResultType);
  const [homeLineup, setHomeLineup] = useState<PlayerRow[]>(homePlayers);
  const [awayLineup, setAwayLineup] = useState<PlayerRow[]>(awayPlayers);
  const [woScorerId, setWoScorerId] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);

  // Determine an initial woScorerId if this match is already a W.O.
  useEffect(() => {
    if (initialResultType === 'Normal' || initialResultType === 'WO_Doble') return;
    // Find the player who has 20 points
    const woPlayer = [...homePlayers, ...awayPlayers].find(p => p.points === 20);
    if (woPlayer) setWoScorerId(woPlayer.player_id);
  }, [initialResultType, homePlayers, awayPlayers]);

  const isWO = resultType !== 'Normal';
  // In Doble WO, attendance IS captured but stats are blocked
  const disableStats = isWO;

  // Only show 20pts scorer column when one team clearly wins
  const showHomeScorerCol = resultType === 'WO_Visitante';
  const showAwayScorerCol = resultType === 'WO_Local';

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMatchResult(
        supabase,
        match.id,
        resultType,
        homeLineup.map((r) => ({
          player_id: r.player_id,
          team_id: r.team_id,
          played: r.played,
          points: r.points,
          triples: r.triples,
        })),
        awayLineup.map((r) => ({
          player_id: r.player_id,
          team_id: r.team_id,
          played: r.played,
          points: r.points,
          triples: r.triples,
        })),
        woScorerId
      );
      message.success('Resultado guardado correctamente');
      onSaved?.();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Spin spinning={saving} tip="Guardando...">
      <Form layout="vertical">
        {/* ── Tipo de resultado ─────────────────────────────── */}
        <Form.Item label="Tipo de resultado">
          <Radio.Group
            value={resultType}
            onChange={(e) => {
              setResultType(e.target.value);
              setWoScorerId(undefined);
            }}
            buttonStyle="solid"
            className="capture-radio-group"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
          >
            <Radio.Button value="Normal"       style={btnStyle}>Normal</Radio.Button>
            <Radio.Button value="WO_Local"     style={btnStyle}>W.O. Local</Radio.Button>
            <Radio.Button value="WO_Visitante" style={btnStyle}>W.O. Visitante</Radio.Button>
            <Radio.Button value="WO_Doble"     style={btnStyle}>Doble W.O.</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* ── Alerta W.O. ──────────────────────────────────────── */}
        {isWO && (
          <Alert
            type={resultType === 'WO_Doble' ? 'error' : 'warning'}
            showIcon
            message={scoreLabels[resultType]}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* ── Info Doble WO ─────────────────────────────────── */}
        {resultType === 'WO_Doble' && (
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
            <Text style={{ color: '#888', fontSize: 12 }}>
              📋 En Doble W.O. puedes marcar a los jugadores que sí se presentaron a la cancha.
              Su asistencia se registra aunque el partido no cuente en la tabla.
              Los campos de Pts y Triples quedan bloqueados (marcador oficial: 0-0).
            </Text>
          </div>
        )}

        {/* ── Tablas de asistencia ──────────────────────────── */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <PlayerAttendanceTable
              title={`🏠 ${match.home_team.name}`}
              players={homeLineup}
              disableStats={disableStats}
              showWOScorer={showHomeScorerCol}
              woScorerId={woScorerId}
              onChange={setHomeLineup}
              onWOScorerChange={setWoScorerId}
            />
          </Col>
          <Col xs={24} md={12}>
            <PlayerAttendanceTable
              title={`✈️ ${match.away_team.name}`}
              players={awayLineup}
              disableStats={disableStats}
              showWOScorer={showAwayScorerCol}
              woScorerId={woScorerId}
              onChange={setAwayLineup}
              onWOScorerChange={setWoScorerId}
            />
          </Col>
        </Row>

        {/* ── Botón guardar ─────────────────────────────────── */}
        <Button
          type="primary"
          size="large"
          icon={<SaveOutlined />}
          onClick={handleSave}
          className="btn-capture"
          style={{ width: '100%', marginTop: 16 }}
        >
          {resultType === 'WO_Doble'
            ? '💾 Guardar Doble W.O.'
            : isWO
              ? '💾 Guardar W.O.'
              : '💾 Guardar Resultado'}
        </Button>
      </Form>
    </Spin>
  );
}
