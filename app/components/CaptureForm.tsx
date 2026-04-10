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
  Tag,
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
  WO_Local:     'W.O. Local: Visita gana por default. Escribe los puntos en la tabla y captura asistencias correspondientes.',
  WO_Visitante: 'W.O. Visitante: Local gana por default. Escribe los puntos en la tabla y captura asistencias correspondientes.',
  WO_Doble:     'W.O. Doble: Ambos faltan. Captura puntos o asistencias de quienes sí llegaron.',
};

const btnStyle: React.CSSProperties = { flex: '1 1 120px', height: 44, fontSize: 14 };

export default function CaptureForm({ match, homePlayers, awayPlayers, initialResultType = 'Normal', onSaved }: Props) {
  const [resultType, setResultType] = useState<ResultType>(initialResultType);
  const [homeLineup, setHomeLineup] = useState<PlayerRow[]>(homePlayers);
  const [awayLineup, setAwayLineup] = useState<PlayerRow[]>(awayPlayers);
  const [saving, setSaving] = useState(false);

  const isWO = resultType !== 'Normal';
  const disableStats = false;

  const homeScore = homeLineup.reduce((acc, p) => acc + (Number(p.points) || 0), 0);
  const awayScore = awayLineup.reduce((acc, p) => acc + (Number(p.points) || 0), 0);

  const getScoreColor = (score1: number, score2: number) => {
    if (score1 > score2) return '#52c41a'; // Green for winning
    if (score1 < score2) return '#f5222d'; // Red for losing
    return '#888'; // Gray for tie
  };

  const homeColor = getScoreColor(homeScore, awayScore);
  const awayColor = getScoreColor(awayScore, homeScore);

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
        }))
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
              📋 En Doble W.O. puedes capturar los puntos manualmente de los jugadores.
            </Text>
          </div>
        )}

        {/* ── Marcador en vivo ──────────────────────────────── */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 8,
          padding: '16px 24px',
          marginBottom: 16,
          gap: 24
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <Text style={{ fontSize: 16, color: '#ccc', display: 'block', marginBottom: 8, fontWeight: 600 }}>
              🏠 {match.home_team.name}
            </Text>
            {(resultType === 'WO_Local' || resultType === 'WO_Doble') && (
              <div style={{ marginBottom: 12 }}>
                <Tag color="error">🔴 Pierde por default</Tag>
              </div>
            )}
            {resultType === 'WO_Visitante' && (
              <div style={{ marginBottom: 12 }}>
                <Tag color="success">✅ Gana por default</Tag>
              </div>
            )}
            <div style={{
              fontSize: 54,
              fontWeight: 800,
              color: homeColor,
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              lineHeight: 1
            }}>
              {homeScore}
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#555' }}>VS</div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <Text style={{ fontSize: 16, color: '#ccc', display: 'block', marginBottom: 8, fontWeight: 600 }}>
              ✈️ {match.away_team.name}
            </Text>
            {(resultType === 'WO_Visitante' || resultType === 'WO_Doble') && (
              <div style={{ marginBottom: 12 }}>
                <Tag color="error">🔴 Pierde por default</Tag>
              </div>
            )}
            {resultType === 'WO_Local' && (
              <div style={{ marginBottom: 12 }}>
                <Tag color="success">✅ Gana por default</Tag>
              </div>
            )}
            <div style={{
              fontSize: 54,
              fontWeight: 800,
              color: awayColor,
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              lineHeight: 1
            }}>
              {awayScore}
            </div>
          </div>
        </div>

        {/* ── Tablas de asistencia ──────────────────────────── */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <PlayerAttendanceTable
              title={`🏠 ${match.home_team.name}`}
              players={homeLineup}
              disableStats={disableStats}
              onChange={setHomeLineup}
            />
          </Col>
          <Col xs={24} md={12}>
            <PlayerAttendanceTable
              title={`✈️ ${match.away_team.name}`}
              players={awayLineup}
              disableStats={disableStats}
              onChange={setAwayLineup}
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
