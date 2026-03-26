'use client';

/**
 * AdminEditForm.tsx
 * Modal para editar un partido ya capturado.
 * Recalcula posiciones y líderes al guardar.
 */

import { useState } from 'react';
import {
  Modal, Form, Select, InputNumber, Button, Typography, Alert, Tag,
  Popconfirm, message, Divider,
} from 'antd';
import { EditOutlined, WarningOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const { Text } = Typography;

export interface EditableMatch {
  id: number;
  jornada: number;
  phase: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team_id: number;
  away_team_id: number;
  court?: string | null;
  time_str?: string | null;
  scheduled_date?: string | null;
  home_team?: { id: number; name: string };
  away_team?: { id: number; name: string };
}

interface Props {
  match: EditableMatch;
  onClose: () => void;
  onSaved: () => void;
}

const STATUSES = [
  { label: '✅ Jugado', value: 'Jugado' },
  { label: '🟡 W.O. Local (local pierde)', value: 'WO Local' },
  { label: '🟡 W.O. Visitante (visitante pierde)', value: 'WO Visitante' },
  { label: '🔴 Doble W.O. (ambos 0 pts)', value: 'WO Doble' },
  { label: '📌 Programado', value: 'Programado' },
  { label: '⏳ Pendiente (Reprogramado)', value: 'Pendiente' },
];

const COURTS = ['Cancha Bicentenario', 'Cancha Techada', 'Cancha III'];
const TIMES = ['06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM'];

export default function AdminEditForm({ match, onClose, onSaved }: Props) {
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const [currentStatus, setCurrentStatus] = useState(match.status);
  const [confirmed, setConfirmed] = useState(false);

  const isWO = (s: string) => s.startsWith('WO') || s.startsWith('W.O');
  const needsScore = currentStatus === 'Jugado';
  const isReadonly = isWO(currentStatus) || currentStatus === 'Programado' || currentStatus === 'Pendiente';

  const editMatch = useMutation({
    mutationFn: async (values: {
      status: string;
      home_score: number | null;
      away_score: number | null;
      phase: string;
      court: string | null;
      time_str: string | null;
      scheduled_date: string | null;
    }) => {
      // Auto-assign W.O. scores
      let hs = values.home_score ?? null;
      let as_ = values.away_score ?? null;
      if (values.status === 'WO Local')      { hs = 0;  as_ = 20; }
      if (values.status === 'WO Visitante')  { hs = 20; as_ = 0;  }
      if (values.status === 'WO Doble')      { hs = 0;  as_ = 0;  }
      if (values.status === 'Programado' || values.status === 'Pendiente') { hs = null; as_ = null; }

      const dateVal = values.scheduled_date ? values.scheduled_date : null;

      const { error } = await supabase
        .from('matches')
        .update({
          status: values.status,
          home_score: hs,
          away_score: as_,
          phase: values.phase,
          court: values.court ?? null,
          time_str: values.time_str ?? null,
          scheduled_date: dateVal,
        })
        .eq('id', match.id);

      if (error) throw error;

      // If status changes back to Programado or Pendiente, purge stats
      if (values.status === 'Programado' || values.status === 'Pendiente') {
        await supabase.from('player_match_stats').delete().eq('match_id', match.id);
      }
    },
    onSuccess: () => {
      // Invalidate everything so standings recalculate
      qc.invalidateQueries({ queryKey: ['matches'] });
      qc.invalidateQueries({ queryKey: ['matches-programmed'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      message.success('Partido actualizado. Las posiciones se han recalculado automáticamente.');
      onSaved();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const handleOk = () => {
    if (!confirmed) {
      message.warning('Marca la casilla de confirmación antes de guardar.');
      return;
    }
    form.submit();
  };

  const homeName = match.home_team?.name ?? `Equipo #${match.home_team_id}`;
  const awayName = match.away_team?.name ?? `Equipo #${match.away_team_id}`;

  const affectedTables = ['matches', 'standings (recalculado)'];
  if (currentStatus === 'Programado' || currentStatus === 'Pendiente') affectedTables.push('player_match_stats (eliminadas)');

  return (
    <Modal
      open
      title={
        <span>
          <EditOutlined style={{ color: '#FAAD14', marginRight: 8 }} />
          Editar Partido J{match.jornada}: <b>{homeName}</b> vs <b>{awayName}</b>
        </span>
      }
      onCancel={onClose}
      footer={null}
      width={520}
      style={{ top: 30 }}
    >
      {/* Impact warning */}
      <Alert
        type="warning"
        icon={<WarningOutlined />}
        showIcon
        message="Guardafuegos Arquitectónico"
        description={
          <span>
            Las modificaciones aquí hechas afectarán el flujo de Posiciones. <br/>
            Si cambias de un partido <b>Jugado</b> a <b>Programado</b>, se <span style={{color: '#ff4d4f', fontWeight: 'bold'}}>eliminarán</span> las estadísticas de los jugadores para limpiar la cédula.
          </span>
        }
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: match.status,
          home_score: match.home_score,
          away_score: match.away_score,
          phase: match.phase,
          court: match.court,
          time_str: match.time_str,
          // Extract just the YYYY-MM-DD for the input type="date"
          scheduled_date: match.scheduled_date ? match.scheduled_date.split('T')[0] : undefined,
        }}
        onFinish={(v) => editMatch.mutate(v)}
        onValuesChange={(changed) => {
          if (changed.status) setCurrentStatus(changed.status);
        }}
      >
        <Form.Item name="status" label="Resultado / Estatus" rules={[{ required: true }]}>
          <Select options={STATUSES} />
        </Form.Item>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Form.Item label="Fase" name="phase" style={{ flex: '1 1 120px' }}>
            <Select options={[
              { label: 'Fase Regular', value: 'Fase Regular' },
              { label: 'Octavos de Final', value: 'Octavos de Final' },
              { label: 'Cuartos de Final', value: 'Cuartos de Final' },
              { label: 'Semifinal', value: 'Semifinal' },
              { label: 'Tercer Lugar', value: 'Tercer Lugar' },
              { label: 'Final', value: 'Final' },
            ]} />
          </Form.Item>
          <Form.Item label="Fecha" name="scheduled_date" style={{ flex: '1 1 120px' }}>
            <input type="date" style={{ width: '100%', padding: '4px 11px', background: '#141414', border: '1px solid #424242', borderRadius: 6, color: '#fff', colorScheme: 'dark', height: 32 }} />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Form.Item label="Cancha" name="court" style={{ flex: '1 1 120px' }}>
            <Select options={COURTS.map((c) => ({ label: c, value: c }))} allowClear placeholder="Sin asignar" />
          </Form.Item>
          <Form.Item label="Hora" name="time_str" style={{ flex: '1 1 120px' }}>
            <Select options={TIMES.map((t) => ({ label: t, value: t }))} allowClear placeholder="Sin asignar" />
          </Form.Item>
        </div>

        {needsScore && (
          <>
            <Divider plain style={{ color: '#555', fontSize: 12 }}>Marcador final (Auto-calculado)</Divider>
            <Alert
              type="info"
              showIcon
              message="Marcador Vinculado"
              description="El resultado global se suma automáticamente desde las estadísticas de los jugadores. Para alterar este resultado, debes modificar los puntos individuales en el módulo 'Captura'."
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Form.Item
                name="home_score"
                label={homeName}
                style={{ flex: 1 }}
              >
                <InputNumber disabled style={{ width: '100%', color: '#FAAD14', fontWeight: 'bold' }} />
              </Form.Item>
              <div style={{ paddingTop: 8, color: '#555', fontWeight: 700 }}>vs</div>
              <Form.Item
                name="away_score"
                label={awayName}
                style={{ flex: 1 }}
              >
                <InputNumber disabled style={{ width: '100%', color: '#FAAD14', fontWeight: 'bold' }} />
              </Form.Item>
            </div>
            {/* Quick link idea */}
            <div style={{ textAlign: 'center', marginTop: -8, marginBottom: 16 }}>
              <a href="/admin/capture" style={{ color: '#1677ff', fontSize: 13, textDecoration: 'underline' }}>
                Ir a módulo de Captura ✍️
              </a>
            </div>
          </>
        )}

        {isReadonly && currentStatus !== 'Programado' && (
          <Alert
            type="info"
            showIcon
            message={
              currentStatus === 'WO Local'
                ? `Marcador automático: ${homeName} 0 – ${awayName} 20`
                : currentStatus === 'WO Visitante'
                  ? `Marcador automático: ${homeName} 20 – ${awayName} 0`
                  : 'Doble W.O.: Marcador 0-0, ambos equipos 0 pts en tabla'
            }
            style={{ marginBottom: 12 }}
          />
        )}

        {(currentStatus === 'Programado' || currentStatus === 'Pendiente') && (
          <Alert
            type="error"
            showIcon
            message={`⚠️ Al cambiar a '${currentStatus}' se eliminarán las estadísticas de jugadores de este partido`}
            style={{ marginBottom: 12 }}
          />
        )}

        {/* Guardfail: liguilla */}
        {match.phase !== 'Fase Regular' && (
          <Alert
            type="error"
            showIcon
            message={`🚫 Guardafuegos: Este partido es de ${match.phase}. Editar puede invalidar la eliminatoria.`}
            description="Solo continúa si este resultado fue capturado incorrectamente."
            style={{ marginBottom: 12 }}
          />
        )}

        {/* Confirmation checkbox */}
        <div
          style={{
            background: '#1a1a1a', border: '1px solid #333', borderRadius: 6,
            padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16,
          }}
        >
          <input
            type="checkbox"
            id="confirm-edit"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ marginTop: 2, cursor: 'pointer', width: 16, height: 16 }}
          />
          <label htmlFor="confirm-edit" style={{ cursor: 'pointer', fontSize: 13, color: '#ccc', lineHeight: 1.4 }}>
            Confirmo que entiendo que este cambio modificará la tabla de posiciones y puede afectar la elegibilidad de liguilla.
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="primary"
            danger={currentStatus === 'Programado'}
            loading={editMatch.isPending}
            onClick={handleOk}
            disabled={!confirmed}
          >
            💾 Guardar Cambio
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
