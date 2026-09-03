'use client';

/**
 * AdminEditForm.tsx
 * Modal para editar un partido ya capturado.
 * Recalcula posiciones y líderes al guardar.
 */

import { useState } from 'react';
import {
  Modal, Form, Select, InputNumber, Button, Alert,
  Divider, App,
} from 'antd';
import { EditOutlined, WarningOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidatePublicCache } from '@/lib/public-cache-client';
import { checkSchedulingConflicts, SchedulingMatch, SchedulingTeam } from '@/lib/scheduling';
import { supabase } from '@/lib/supabase';

export interface EditableMatch {
  id: number;
  jornada: number | null;
  phase: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team_id: number;
  away_team_id: number;
  court?: string | null;
  time_str?: string | null;
  scheduled_date?: string | null;
  vuelta?: 'ida' | 'vuelta' | 'liguilla' | null;
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

function isRegularPhase(phase?: string | null) {
  return !phase || phase === 'Fase Regular';
}

export default function AdminEditForm({ match, onClose, onSaved }: Props) {
  const { message: messageApi, modal } = App.useApp();
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
      jornada: number | null;
      home_score: number | null;
      away_score: number | null;
      phase: string;
      court: string | null;
      time_str: string | null;
      scheduled_date: string | null;
      forceScheduleWarnings?: boolean;
    }) => {
      // Auto-assign W.O. scores
      let hs = values.home_score ?? null;
      let as_ = values.away_score ?? null;
      if (values.status === 'WO Local')      { hs = 0;  as_ = 20; }
      if (values.status === 'WO Visitante')  { hs = 20; as_ = 0;  }
      if (values.status === 'WO Doble')      { hs = 0;  as_ = 0;  }
      if (values.status === 'Programado' || values.status === 'Pendiente') { hs = null; as_ = null; }

      const dateVal = values.scheduled_date ? values.scheduled_date : null;
      const { data: matchMeta } = await supabase
        .from('matches')
        .select('season_id')
        .eq('id', match.id)
        .single();

      if (matchMeta?.season_id) {
        const [{ data: seasonMatches, error: matchesError }, { data: seasonTeams, error: teamsError }] = await Promise.all([
          supabase
            .from('matches')
            .select('id, jornada, home_team_id, away_team_id, scheduled_date, time_str, court')
            .eq('season_id', matchMeta.season_id),
          supabase
            .from('teams')
            .select('id, name, match_frequency_days, preferred_time_notes')
            .eq('season_id', matchMeta.season_id),
        ]);
        if (matchesError) throw matchesError;
        if (teamsError) throw teamsError;

        const scheduleCheck = checkSchedulingConflicts({
          matches: (seasonMatches ?? []) as SchedulingMatch[],
          teams: (seasonTeams ?? []) as SchedulingTeam[],
          homeTeamId: match.home_team_id,
          awayTeamId: match.away_team_id,
          scheduledDate: dateVal,
          jornada: values.jornada,
          timeStr: values.time_str,
          court: values.court,
          excludeMatchId: match.id,
        });
        if (scheduleCheck.blocking.length > 0) {
          throw new Error(scheduleCheck.blocking.join(' '));
        }
        if (scheduleCheck.warnings.length > 0 && !values.forceScheduleWarnings) {
          throw new Error(`Revisa estas alertas de programación: ${scheduleCheck.warnings.join(' ')}`);
        }
      }

      if (values.phase === 'Fase Regular' && !isRegularPhase(match.phase) && matchMeta?.season_id) {
        const { data: existingRegularMatches, error: validationError } = await supabase
          .from('matches')
          .select('id, phase, vuelta')
          .eq('season_id', matchMeta.season_id)
          .in('home_team_id', [match.home_team_id, match.away_team_id])
          .in('away_team_id', [match.home_team_id, match.away_team_id])
          .neq('id', match.id);

        if (validationError) throw validationError;
        const existingRegularPhaseMatches = (existingRegularMatches ?? []).filter((existing) => isRegularPhase(existing.phase));
        if (existingRegularPhaseMatches.length >= 2) {
          throw new Error('No se puede cambiar este partido a Fase Regular: esa pareja ya tiene ida y vuelta registrados.');
        }
        if (match.vuelta && existingRegularPhaseMatches.some((existing) => existing.vuelta === match.vuelta)) {
          throw new Error(`No se puede cambiar este partido a Fase Regular: ya existe un partido de ${match.vuelta} para esta pareja.`);
        }
      }

      const { error } = await supabase
        .from('matches')
        .update({
          status: values.status,
          jornada: values.jornada ?? null,
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

      // --- RECALCULATE LIGUILLA SERIES (same logic as saveMatchResult) ---
      const activePhase = values.phase ?? match.phase;
      if (activePhase && activePhase !== 'Fase Regular') {
        const teamA = match.home_team_id;
        const teamB = match.away_team_id;

        if (matchMeta?.season_id) {
          const { data: seriesMatches } = await supabase
            .from('matches')
            .select('id, status, home_score, away_score, home_team_id, away_team_id')
            .eq('season_id', matchMeta.season_id)
            .eq('phase', activePhase)
            .in('home_team_id', [teamA, teamB])
            .in('away_team_id', [teamA, teamB]);

          if (seriesMatches && seriesMatches.length > 0) {
            let winsA = 0;
            let winsB = 0;

            for (const m of seriesMatches) {
              if (['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status)) {
                const scoreH = m.home_score || 0;
                const scoreAw = m.away_score || 0;
                if (scoreH > scoreAw) {
                  if (m.home_team_id === teamA) winsA++; else winsB++;
                } else if (scoreAw > scoreH) {
                  if (m.away_team_id === teamA) winsA++; else winsB++;
                }
              }
            }

            if (winsA >= 2 || winsB >= 2) {
              const toCancel = seriesMatches.filter(m => m.status === 'Programado');
              if (toCancel.length > 0) {
                await supabase.from('matches').update({ status: 'No Necesario' }).in('id', toCancel.map(m => m.id));
              }
            } else {
              const toRevert = seriesMatches.filter(m => m.status === 'No Necesario');
              if (toRevert.length > 0) {
                await supabase.from('matches').update({ status: 'Programado' }).in('id', toRevert.map(m => m.id));
              }
            }
          }
        }
      }

      return matchMeta?.season_id ?? null;
    },
    onSuccess: async (seasonId) => {
      // Invalidate everything so standings recalculate
      qc.invalidateQueries({ queryKey: ['matches'] });
      qc.invalidateQueries({ queryKey: ['matches-programmed'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      await invalidatePublicCache({ seasonId });
      messageApi.success('Partido actualizado. Las posiciones se han recalculado automáticamente.');
      onSaved();
    },
    onError: (e: Error) => messageApi.error(e.message),
  });

  const handleOk = () => {
    if (!confirmed) {
      messageApi.warning('Marca la casilla de confirmación antes de guardar.');
      return;
    }
    form.submit();
  };

  const handleFinish = async (values: {
    status: string;
    jornada: number | null;
    home_score: number | null;
    away_score: number | null;
    phase: string;
    court: string | null;
    time_str: string | null;
    scheduled_date: string | null;
  }) => {
    const dateVal = values.scheduled_date ? values.scheduled_date : null;
    const { data: matchMeta } = await supabase
      .from('matches')
      .select('season_id')
      .eq('id', match.id)
      .single();

    if (!matchMeta?.season_id) {
      editMatch.mutate(values);
      return;
    }

    const [{ data: seasonMatches }, { data: seasonTeams }] = await Promise.all([
      supabase
        .from('matches')
        .select('id, jornada, home_team_id, away_team_id, scheduled_date, time_str, court')
        .eq('season_id', matchMeta.season_id),
      supabase
        .from('teams')
        .select('id, name, match_frequency_days, preferred_time_notes')
        .eq('season_id', matchMeta.season_id),
    ]);

    const scheduleCheck = checkSchedulingConflicts({
      matches: (seasonMatches ?? []) as SchedulingMatch[],
      teams: (seasonTeams ?? []) as SchedulingTeam[],
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      scheduledDate: dateVal,
      jornada: values.jornada,
      timeStr: values.time_str,
      court: values.court,
      excludeMatchId: match.id,
    });

    if (scheduleCheck.blocking.length > 0) {
      messageApi.error(scheduleCheck.blocking.join(' '));
      return;
    }

    if (scheduleCheck.warnings.length > 0) {
      modal.confirm({
        title: 'Revisar programación',
        content: (
          <div>
            {scheduleCheck.warnings.map((warning) => (
              <div key={warning} style={{ marginBottom: 6 }}>{warning}</div>
            ))}
          </div>
        ),
        okText: 'Continuar',
        cancelText: 'Cancelar',
        onOk: () => editMatch.mutate({ ...values, forceScheduleWarnings: true }),
      });
      return;
    }

    editMatch.mutate(values);
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
          Editar Partido J{match.jornada ?? '?'}: <b>{homeName}</b> vs <b>{awayName}</b>
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
        title="Guardafuegos Arquitectónico"
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
          jornada: match.jornada,
          home_score: match.home_score,
          away_score: match.away_score,
          phase: match.phase,
          court: match.court,
          time_str: match.time_str,
          // Extract just the YYYY-MM-DD for the input type="date"
          scheduled_date: match.scheduled_date ? match.scheduled_date.split('T')[0] : '',
        }}
        onFinish={handleFinish}
        onValuesChange={(changed) => {
          if (changed.status) setCurrentStatus(changed.status);
        }}
      >
        <Form.Item name="status" label="Resultado / Estatus" rules={[{ required: true }]}>
          <Select options={STATUSES} />
        </Form.Item>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Form.Item label="Jornada" name="jornada" style={{ flex: '1 1 90px' }}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Por definir" />
          </Form.Item>
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
          <Form.Item
            label="Fecha"
            name="scheduled_date"
            style={{ flex: '1 1 120px' }}
            getValueProps={(value) => ({ value: value ?? '' })}
          >
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
              title="Marcador Vinculado"
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
            title={
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
            title={`⚠️ Al cambiar a '${currentStatus}' se eliminarán las estadísticas de jugadores de este partido`}
            style={{ marginBottom: 12 }}
          />
        )}

        {/* Guardfail: liguilla */}
        {match.phase !== 'Fase Regular' && (
          <Alert
            type="error"
            showIcon
            title={`🚫 Guardafuegos: Este partido es de ${match.phase}. Editar puede invalidar la eliminatoria.`}
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
