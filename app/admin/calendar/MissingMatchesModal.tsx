'use client';
import React, { useState, useMemo } from 'react';
import { Modal, Table, Button, Select, InputNumber, Space, DatePicker, Tag, Segmented, App } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { invalidatePublicCache } from '@/lib/public-cache-client';
import { checkSchedulingConflicts, SchedulingTeam } from '@/lib/scheduling';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const COURTS = ['Cancha Bicentenario', 'Cancha Techada', 'Cancha III'];
const TIMES = ['06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM'];

const statusColor: Record<string, string> = {
  Programado: 'blue',
  Pendiente: 'gold',
  Jugado: 'green',
  'WO Local': 'orange',
  'WO Visitante': 'orange',
  'WO Doble': 'red',
};

const vueltaLabel: Record<string, string> = {
  ida: 'Ida',
  vuelta: 'Vuelta',
  liguilla: 'Liguilla',
};

interface Team extends SchedulingTeam { id: number; name: string; }
interface MatchData {
  id?: number;
  home_team_id: number;
  away_team_id: number;
  phase: string;
  status?: string;
  vuelta?: 'ida' | 'vuelta' | 'liguilla' | null;
  jornada?: number | null;
  scheduled_date?: string | null;
  time_str?: string | null;
  court?: string | null;
}
interface MissingMatch {
  key: string;
  home: Team;
  away: Team;
  pairLabel: string;
  pairKey: string;
  reason: string;
  suggestedJornada?: number;
}
interface RegisteredMatchRow extends MatchData {
  key: string;
  homeName: string;
  awayName: string;
}
interface PairAudit {
  key: string;
  pairLabel: string;
  teamA: Team;
  teamB: Team;
  total: number;
  homeByA: number;
  homeByB: number;
  playedSummary: string;
  status: 'completo' | 'faltante' | 'conflicto';
  notes: string;
  orderedMatches: MatchData[];
}
interface RowState { jornada?: number; court?: string | null; time_str?: string | null; scheduled_date?: dayjs.Dayjs | null; }
interface MutationVars { home_team_id: number; away_team_id: number; jornada: number; court: string | null; time_str: string | null; scheduled_date: string | null; vuelta: 'ida' | 'vuelta'; reserveMirror?: boolean; forceScheduleWarnings?: boolean; }

interface MissingMatchesModalProps {
  open: boolean;
  onClose: () => void;
  seasonId: number;
  teams: Team[];
  matches: MatchData[];
}

function isRegularPhase(phase?: string | null) {
  return !phase || phase === 'Fase Regular';
}

function isSamePair(match: Pick<MatchData, 'home_team_id' | 'away_team_id'>, homeTeamId: number, awayTeamId: number) {
  return (
    (match.home_team_id === homeTeamId && match.away_team_id === awayTeamId) ||
    (match.home_team_id === awayTeamId && match.away_team_id === homeTeamId)
  );
}

function sortMatchesBySchedule(a: MatchData, b: MatchData) {
  const jornadaA = a.jornada ?? 9999;
  const jornadaB = b.jornada ?? 9999;
  if (jornadaA !== jornadaB) return jornadaA - jornadaB;
  return (a.id ?? 0) - (b.id ?? 0);
}

function getFirstLegJornadaCount(teamCount: number) {
  if (teamCount < 2) return 0;
  return teamCount % 2 === 0 ? teamCount - 1 : teamCount;
}

export default function MissingMatchesModal({ open, onClose, seasonId, teams, matches }: MissingMatchesModalProps) {
  const { message: messageApi, modal } = App.useApp();
  const qc = useQueryClient();
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [viewMode, setViewMode] = useState<'faltantes' | 'registrados' | 'conflictos'>('faltantes');
  const [teamFilterIds, setTeamFilterIds] = useState<number[]>([]);
  const [vueltaFilter, setVueltaFilter] = useState<'all' | 'ida' | 'vuelta'>('all');
  const [missingStateFilter, setMissingStateFilter] = useState<'all' | 'pending_no_date' | 'scheduled_no_result' | 'played'>('all');
  const [courtFilter, setCourtFilter] = useState<'all' | string>('all');
  const teamsById = useMemo(
    () => Object.fromEntries(teams.map((team) => [team.id, team])),
    [teams]
  );
  const nextSuggestedJornada = useMemo(() => {
    const regularJornadas = matches
      .filter((m) => m.phase === 'Fase Regular' && typeof m.jornada === 'number')
      .map((m) => m.jornada as number);
    return regularJornadas.length > 0 ? Math.max(...regularJornadas) + 1 : 1;
  }, [matches]);
  const firstLegJornadaCount = getFirstLegJornadaCount(teams.length);

  const pairAudit = useMemo(() => {
    const audits: PairAudit[] = [];

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const teamA = teams[i];
        const teamB = teams[j];
        const matchesBetween = matches.filter(
          (m) =>
            m.phase === 'Fase Regular' &&
            ((m.home_team_id === teamA.id && m.away_team_id === teamB.id) ||
              (m.home_team_id === teamB.id && m.away_team_id === teamA.id))
        );
        const orderedMatches = [...matchesBetween].sort((a, b) => {
          const jornadaA = a.jornada ?? 9999;
          const jornadaB = b.jornada ?? 9999;
          if (jornadaA !== jornadaB) return jornadaA - jornadaB;
          return (a.id ?? 0) - (b.id ?? 0);
        });
        const homeByA = matchesBetween.filter((m) => m.home_team_id === teamA.id).length;
        const homeByB = matchesBetween.filter((m) => m.home_team_id === teamB.id).length;
        const playedSummary = orderedMatches.length === 0
          ? 'Sin partidos'
          : orderedMatches
            .map((m) => {
              const jornada = m.jornada ? `J${m.jornada}` : 'J?';
              const status = m.status ?? 'Sin estatus';
              const local = m.home_team_id === teamA.id ? teamA.name : teamB.name;
              const visita = m.away_team_id === teamA.id ? teamA.name : teamB.name;
              return `${jornada}: ${local} vs ${visita} (${status})`;
            })
            .join(' | ');

        let status: PairAudit['status'] = 'completo';
        let notes = 'Serie regular completa: una localía por equipo.';

        if (matchesBetween.length === 0) {
          status = 'faltante';
          notes = 'Faltan ida y vuelta.';
        } else if (matchesBetween.length === 1) {
          status = 'faltante';
          notes = 'Falta el partido espejo.';
        } else if (matchesBetween.length === 2 && homeByA === 1 && homeByB === 1) {
          status = 'completo';
        } else {
          status = 'conflicto';
          if (matchesBetween.length > 2) {
            notes = 'Hay más de 2 partidos capturados para esta pareja.';
          } else if (homeByA === 2 || homeByB === 2) {
            notes = 'Hay 2 partidos con la misma localía. No programes otro hasta corregirlo.';
          } else {
            notes = 'La serie necesita revisión manual.';
          }
        }

        audits.push({
          key: `${teamA.id}-${teamB.id}`,
          pairLabel: `${teamA.name} vs ${teamB.name}`,
          teamA,
          teamB,
          total: matchesBetween.length,
          homeByA,
          homeByB,
          playedSummary,
          status,
          notes,
          orderedMatches,
        });
      }
    }

    return audits.sort((a, b) => a.pairLabel.localeCompare(b.pairLabel));
  }, [teams, matches]);

  const missingMatches = useMemo(() => {
    const faltantes: MissingMatch[] = [];

    pairAudit
      .filter((audit) => audit.status === 'faltante')
      .forEach((audit) => {
        if (audit.total === 0) {
          faltantes.push({
            key: `${audit.key}-ida`,
            home: audit.teamA,
            away: audit.teamB,
            pairLabel: audit.pairLabel,
            pairKey: audit.key,
            reason: 'No existe ningún juego entre estos equipos. Al crear la ida se reservará la vuelta espejo.',
            suggestedJornada: nextSuggestedJornada,
          });
          return;
        }

        if (audit.total === 1) {
          const existingMatch = audit.orderedMatches[0];
          const suggestedJornada = existingMatch?.jornada
            ? existingMatch.jornada + firstLegJornadaCount
            : nextSuggestedJornada;
          const missingHome = audit.homeByA === 0 ? audit.teamA : audit.teamB;
          const missingAway = missingHome.id === audit.teamA.id ? audit.teamB : audit.teamA;
          faltantes.push({
            key: `${audit.key}-mirror`,
            home: missingHome,
            away: missingAway,
            pairLabel: audit.pairLabel,
            pairKey: audit.key,
            reason: 'Falta únicamente el juego espejo.',
            suggestedJornada,
          });
        }
      });

    return faltantes;
  }, [firstLegJornadaCount, nextSuggestedJornada, pairAudit]);

  const applyPairFilters = (homeId: number, awayId: number, vuelta?: 'ida' | 'vuelta', match?: MatchData | null) => {
    const passTeam = teamFilterIds.length === 0 || teamFilterIds.includes(homeId) || teamFilterIds.includes(awayId);
    const passVuelta = vueltaFilter === 'all' || vuelta === vueltaFilter;
    const passCourt = courtFilter === 'all' || match?.court === courtFilter;
    let passState = true;
    if (missingStateFilter === 'pending_no_date') {
      passState = !match || (match.status === 'Pendiente' && !match.scheduled_date);
    } else if (missingStateFilter === 'scheduled_no_result') {
      passState = Boolean(match && match.status === 'Programado');
    } else if (missingStateFilter === 'played') {
      passState = Boolean(match && ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(match.status ?? ''));
    }
    return passTeam && passVuelta && passCourt && passState;
  };

  const filteredMissingMatches = missingMatches.filter((record) => {
    const vuelta = record.key.endsWith('-ida') ? 'ida' : 'vuelta';
    return applyPairFilters(record.home.id, record.away.id, vuelta, null);
  });

  const registeredMatches = useMemo<RegisteredMatchRow[]>(() => {
    return matches
      .filter((match) => isRegularPhase(match.phase))
      .map((match) => ({
        ...match,
        key: String(match.id ?? `${match.home_team_id}-${match.away_team_id}-${match.jornada ?? 'na'}`),
        homeName: teamsById[match.home_team_id]?.name ?? `#${match.home_team_id}`,
        awayName: teamsById[match.away_team_id]?.name ?? `#${match.away_team_id}`,
      }))
      .sort(sortMatchesBySchedule);
  }, [matches, teamsById]);

  const filteredRegisteredMatches = registeredMatches.filter((match) => (
    applyPairFilters(
      match.home_team_id,
      match.away_team_id,
      match.vuelta === 'ida' || match.vuelta === 'vuelta' ? match.vuelta : undefined,
      match
    )
  ));

  const conflictingPairs = useMemo(
    () => pairAudit.filter((audit) => audit.status === 'conflicto'),
    [pairAudit]
  );

  const filteredConflictingPairs = conflictingPairs.filter((audit) => {
    const representative = audit.orderedMatches[0] ?? null;
    return applyPairFilters(audit.teamA.id, audit.teamB.id, representative?.vuelta === 'ida' || representative?.vuelta === 'vuelta' ? representative.vuelta : undefined, representative);
  });

  const createMissingMatch = useMutation({
    mutationFn: async (vars: MutationVars) => {
      const scheduleCheck = checkSchedulingConflicts({
        matches,
        teams,
        homeTeamId: vars.home_team_id,
        awayTeamId: vars.away_team_id,
        scheduledDate: vars.scheduled_date,
        jornada: vars.jornada,
        timeStr: vars.time_str,
        court: vars.court,
      });
      if (scheduleCheck.blocking.length > 0) {
        throw new Error(scheduleCheck.blocking.join(' '));
      }
      if (scheduleCheck.warnings.length > 0 && !vars.forceScheduleWarnings) {
        throw new Error(`Revisa estas alertas de programación: ${scheduleCheck.warnings.join(' ')}`);
      }

      const existingRegularMatches = matches
        .filter((match) => isRegularPhase(match.phase) && isSamePair(match, vars.home_team_id, vars.away_team_id))
        .sort(sortMatchesBySchedule);

      if (existingRegularMatches.length >= 2) {
        throw new Error('No se puede crear otro partido: esta pareja ya tiene ida y vuelta registrados.');
      }

      if (existingRegularMatches.some((match) => match.vuelta === vars.vuelta)) {
        throw new Error(`Ya existe un partido de ${vars.vuelta} para esta pareja.`);
      }

      if (vars.reserveMirror && existingRegularMatches.length > 0) {
        throw new Error('No se puede reservar ida y vuelta porque esta pareja ya tiene un partido registrado.');
      }

      if (!vars.reserveMirror && existingRegularMatches.length === 1) {
        const firstLeg = existingRegularMatches[0];
        const respectsMirror = vars.home_team_id === firstLeg.away_team_id && vars.away_team_id === firstLeg.home_team_id;
        if (!respectsMirror) {
          throw new Error('Este cruce no respeta el espejo de la ida. Corrige la localía antes de programarlo.');
        }
      }

      const matchVars = { ...vars };
      const reserveMirror = matchVars.reserveMirror;
      delete matchVars.reserveMirror;
      delete matchVars.forceScheduleWarnings;
      const mirrorJornada = vars.jornada + firstLegJornadaCount;
      const rows = reserveMirror
        ? [
            {
              season_id: seasonId,
              phase: 'Fase Regular',
              status: 'Programado',
              ...matchVars,
            },
            {
              season_id: seasonId,
              phase: 'Fase Regular',
              status: 'Pendiente',
              home_team_id: vars.away_team_id,
              away_team_id: vars.home_team_id,
              jornada: mirrorJornada,
              court: null,
              time_str: null,
              scheduled_date: null,
              vuelta: 'vuelta',
            },
          ]
        : [
            {
              season_id: seasonId,
              phase: 'Fase Regular',
              status: 'Programado',
              ...matchVars,
            },
          ];

      const { error } = await supabase.from('matches').insert(rows);
      if (error) throw error;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['matches'] });
      await invalidatePublicCache({ seasonId });
      messageApi.success('Partido programado con éxito');
    },
    onError: (e: Error) => messageApi.error(e.message),
  });

  const updateRowState = (key: string, field: keyof RowState, value: unknown) => {
    const defaultJornada = missingMatches.find((record) => record.key === key)?.suggestedJornada ?? nextSuggestedJornada;
    setRowStates((prev: Record<string, RowState>) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { jornada: defaultJornada }),
        [field]: value
      }
    }));
  };

  const attemptCreate = (record: MissingMatch) => {
    const s = rowStates[record.key] || { jornada: record.suggestedJornada ?? nextSuggestedJornada };
    if (!s.jornada) {
      messageApi.error('Debes proporcionar una jornada.');
      return;
    }
    
    const vars: MutationVars = {
      home_team_id: record.home.id,
      away_team_id: record.away.id,
      jornada: s.jornada,
      court: s.court || null,
      time_str: s.time_str || null,
      scheduled_date: s.scheduled_date ? s.scheduled_date.format('YYYY-MM-DD') : null,
      vuelta: record.key.endsWith('-ida') ? 'ida' : 'vuelta',
      reserveMirror: record.key.endsWith('-ida'),
    };

    const scheduleCheck = checkSchedulingConflicts({
      matches,
      teams,
      homeTeamId: vars.home_team_id,
      awayTeamId: vars.away_team_id,
      scheduledDate: vars.scheduled_date,
      jornada: vars.jornada,
      timeStr: vars.time_str,
      court: vars.court,
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
        onOk: () => createMissingMatch.mutate({ ...vars, forceScheduleWarnings: true }),
      });
      return;
    }

    createMissingMatch.mutate(vars);
  };

  const missingColumns = [
    {
      title: 'Enfrentamiento Faltante',
      key: 'matchup',
      render: (_: unknown, record: MissingMatch) => (
        <div>
          <b>{record.home.name}</b> <span style={{ color: '#666' }}>(Local)</span> 
          <br/>
          <span style={{ fontSize: 12, color: '#888' }}>vs</span>
          <br/>
          <b>{record.away.name}</b> <span style={{ color: '#666' }}>(Visita)</span>
          <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>{record.reason}</div>
        </div>
      ),
      width: 280,
    },
    {
      title: 'Jornada',
      key: 'jornada',
      render: (_: unknown, record: MissingMatch) => (
        <InputNumber 
          min={1} 
          value={rowStates[record.key]?.jornada ?? record.suggestedJornada ?? nextSuggestedJornada}
          onChange={(val) => updateRowState(record.key, 'jornada', val)}
          style={{ width: 60 }}
        />
      ),
      width: 80,
    },
    {
      title: 'Fecha',
      key: 'date',
      render: (_: unknown, record: MissingMatch) => (
        <DatePicker 
          format="YYYY-MM-DD"
          value={rowStates[record.key]?.scheduled_date}
          onChange={(val) => updateRowState(record.key, 'scheduled_date', val)}
          style={{ width: 130 }}
        />
      ),
      width: 140,
    },
    {
      title: 'Cancha y Hora',
      key: 'court_time',
      render: (_: unknown, record: MissingMatch) => (
        <Space orientation="vertical" size={2}>
          <Select 
            placeholder="Cancha"
            allowClear
            value={rowStates[record.key]?.court}
            onChange={(val) => updateRowState(record.key, 'court', val)}
            options={COURTS.map(c => ({ label: c, value: c }))}
            style={{ width: 160 }}
          />
          <Select 
            placeholder="Horario"
            allowClear
            value={rowStates[record.key]?.time_str}
            onChange={(val) => updateRowState(record.key, 'time_str', val)}
            options={TIMES.map(t => ({ label: t, value: t }))}
            style={{ width: 120 }}
          />
        </Space>
      ),
      width: 180,
    },
    {
      title: 'Acción',
      key: 'action',
      render: (_: unknown, record: MissingMatch) => (
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => attemptCreate(record)}
          loading={createMissingMatch.isPending && createMissingMatch.variables?.home_team_id === record.home.id}
        >
          Programar
        </Button>
      ),
      fixed: 'right' as const,
      width: 130,
    }
  ];

  const pairColumns = [
    {
      title: 'Enfrentamiento',
      key: 'pair',
      render: (_: unknown, record: PairAudit) => (
        <div>
          <b>{record.pairLabel}</b>
          <div style={{ color: '#888', fontSize: 12, marginTop: 6 }}>{record.notes}</div>
        </div>
      ),
      width: 260,
    },
    {
      title: 'Resumen',
      key: 'counts',
      render: (_: unknown, record: PairAudit) => (
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          <div>Total: <b>{record.total}</b></div>
          <div>{record.teamA.name} local: <b>{record.homeByA}</b></div>
          <div>{record.teamB.name} local: <b>{record.homeByB}</b></div>
        </div>
      ),
      width: 160,
    },
    {
      title: 'Detalle capturado',
      dataIndex: 'playedSummary',
      key: 'playedSummary',
      render: (value: string) => <span style={{ fontSize: 12, color: '#ccc' }}>{value}</span>,
    },
  ];

  const registeredColumns = [
    {
      title: 'Partido',
      key: 'match',
      render: (_: unknown, record: RegisteredMatchRow) => (
        <div>
          <b>{record.homeName}</b> <span style={{ color: '#777' }}>vs</span> <b>{record.awayName}</b>
          <div style={{ marginTop: 6 }}>
            <Tag>{record.vuelta ? vueltaLabel[record.vuelta] ?? record.vuelta : 'Sin vuelta'}</Tag>
            <Tag color={statusColor[record.status ?? ''] ?? 'default'}>{record.status ?? 'Sin estatus'}</Tag>
          </div>
        </div>
      ),
      width: 280,
    },
    {
      title: 'Programación',
      key: 'schedule',
      render: (_: unknown, record: RegisteredMatchRow) => {
        const bits = [
          record.jornada ? `J${record.jornada}` : 'Jornada por definir',
          record.scheduled_date ? dayjs(record.scheduled_date).format('DD/MM/YYYY') : 'Fecha por definir',
          record.time_str ?? 'Hora por definir',
          record.court ?? 'Cancha por definir',
        ];
        return <span style={{ color: '#ccc', fontSize: 12 }}>{bits.join(' · ')}</span>;
      },
    },
  ];

  const summaryBox = (label: string, value: number, color: string) => (
    <div
      style={{
        minWidth: 150,
        padding: '10px 12px',
        borderRadius: 10,
        background: '#111',
        border: `1px solid ${color}55`,
      }}
    >
      <div style={{ color, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );

  return (
    <Modal
      title={<span style={{ color: '#FAAD14' }}>Partidos Faltantes</span>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={1080}
      destroyOnHidden
    >
      <div style={{ marginBottom: 14, color: '#aaa', lineHeight: 1.5 }}>
        Revisión de cruces de fase regular por pareja de equipos. Los partidos con conflicto se separan para evitar duplicados.
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        {summaryBox('Faltantes', filteredMissingMatches.length, '#faad14')}
        {summaryBox('Registrados', filteredRegisteredMatches.length, '#1677ff')}
        {summaryBox('Conflictos', filteredConflictingPairs.length, '#ff4d4f')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, marginBottom: 14 }}>
        <Select
          mode="multiple"
          allowClear
          maxTagCount="responsive"
          placeholder="Equipo"
          value={teamFilterIds}
          onChange={setTeamFilterIds}
          options={teams.map((team) => ({ label: team.name, value: team.id }))}
          optionFilterProp="label"
        />
        <Select
          value={vueltaFilter}
          onChange={setVueltaFilter}
          options={[
            { label: 'Todas las vueltas', value: 'all' },
            { label: 'Ida', value: 'ida' },
            { label: 'Vuelta', value: 'vuelta' },
          ]}
        />
        <Select
          value={missingStateFilter}
          onChange={setMissingStateFilter}
          options={[
            { label: 'Todos los estados', value: 'all' },
            { label: 'Pendiente sin fecha', value: 'pending_no_date' },
            { label: 'Programado sin resultado', value: 'scheduled_no_result' },
            { label: 'Jugado', value: 'played' },
          ]}
        />
        <Select
          value={courtFilter}
          onChange={setCourtFilter}
          options={[
            { label: 'Todas las canchas', value: 'all' },
            ...COURTS.map((court) => ({ label: court, value: court })),
          ]}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Segmented
          value={viewMode}
          onChange={(value) => setViewMode(value as 'faltantes' | 'registrados' | 'conflictos')}
          options={[
            { label: `Faltantes (${filteredMissingMatches.length})`, value: 'faltantes' },
            { label: `Registrados (${filteredRegisteredMatches.length})`, value: 'registrados' },
            { label: `Conflictos (${filteredConflictingPairs.length})`, value: 'conflictos' },
          ]}
        />
        <Tag color="gold" style={{ alignSelf: 'center', padding: '4px 10px' }}>
          Jornada sugerida para nuevos juegos: J{nextSuggestedJornada}
        </Tag>
      </div>
      {viewMode === 'faltantes' ? (
        <Table<MissingMatch>
          dataSource={filteredMissingMatches}
          columns={missingColumns}
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: 'No hay faltantes seguros por programar.' }}
          scroll={{ x: 960, y: 500 }}
          size="small"
        />
      ) : viewMode === 'registrados' ? (
        <Table<RegisteredMatchRow>
          dataSource={filteredRegisteredMatches}
          columns={registeredColumns}
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: 'No hay partidos registrados con esos filtros.' }}
          scroll={{ x: 760, y: 500 }}
          size="small"
        />
      ) : (
        <Table<PairAudit>
          dataSource={filteredConflictingPairs}
          columns={pairColumns}
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: 'No hay conflictos detectados.' }}
          scroll={{ x: 960, y: 500 }}
          size="small"
        />
      )}
    </Modal>
  );
}
