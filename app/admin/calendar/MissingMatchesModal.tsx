'use client';
import React, { useState, useMemo } from 'react';
import { Modal, Table, Button, Select, InputNumber, Space, DatePicker, message, Tag, Segmented } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const COURTS = ['Cancha Bicentenario', 'Cancha Techada', 'Cancha III'];
const TIMES = ['06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM'];

interface Team { id: number; name: string; }
interface MatchData {
  id?: number;
  home_team_id: number;
  away_team_id: number;
  phase: string;
  status?: string;
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
interface ComparisonRow {
  key: string;
  pairLabel: string;
  firstLeg: MatchData | null;
  secondLeg: MatchData | null;
  expectedHome: Team | null;
  expectedAway: Team | null;
  status: 'listo' | 'faltante' | 'conflicto';
  note: string;
}
interface JornadaMirrorRow {
  key: string;
  firstJornada: number;
  secondJornada: number | null;
  firstMatch: MatchData | null;
  secondMatch: MatchData | null;
  expectedHome: Team | null;
  expectedAway: Team | null;
  status: 'listo' | 'faltante' | 'extra' | 'sin-segunda';
  note: string;
}
interface RowState { jornada?: number; court?: string | null; time_str?: string | null; scheduled_date?: dayjs.Dayjs | null; }
interface MutationVars { home_team_id: number; away_team_id: number; jornada: number; court: string | null; time_str: string | null; scheduled_date: string | null; }

interface MissingMatchesModalProps {
  open: boolean;
  onClose: () => void;
  seasonId: number;
  teams: Team[];
  matches: MatchData[];
}

export default function MissingMatchesModal({ open, onClose, seasonId, teams, matches }: MissingMatchesModalProps) {
  const qc = useQueryClient();
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [viewMode, setViewMode] = useState<'jornadas' | 'comparativa' | 'faltantes' | 'conflictos' | 'completos'>('jornadas');
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
            reason: 'No existe ningún juego entre estos equipos.',
          });
          faltantes.push({
            key: `${audit.key}-vuelta`,
            home: audit.teamB,
            away: audit.teamA,
            pairLabel: audit.pairLabel,
            pairKey: audit.key,
            reason: 'No existe ningún juego entre estos equipos.',
          });
          return;
        }

        if (audit.total === 1) {
          const missingHome = audit.homeByA === 0 ? audit.teamA : audit.teamB;
          const missingAway = missingHome.id === audit.teamA.id ? audit.teamB : audit.teamA;
          faltantes.push({
            key: `${audit.key}-mirror`,
            home: missingHome,
            away: missingAway,
            pairLabel: audit.pairLabel,
            pairKey: audit.key,
            reason: 'Falta únicamente el juego espejo.',
          });
        }
      });

    return faltantes;
  }, [pairAudit]);

  const conflictingPairs = useMemo(
    () => pairAudit.filter((audit) => audit.status === 'conflicto'),
    [pairAudit]
  );

  const completePairs = useMemo(
    () => pairAudit.filter((audit) => audit.status === 'completo'),
    [pairAudit]
  );

  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    return pairAudit.map((audit) => {
      const firstLeg = audit.orderedMatches[0] ?? null;
      const secondLeg = audit.orderedMatches[1] ?? null;

      if (!firstLeg) {
        return {
          key: audit.key,
          pairLabel: audit.pairLabel,
          firstLeg: null,
          secondLeg: null,
          expectedHome: audit.teamA,
          expectedAway: audit.teamB,
          status: 'faltante',
          note: 'No existe primera vuelta todavía.',
        };
      }

      const expectedHome = firstLeg.away_team_id === audit.teamA.id ? audit.teamA : audit.teamB;
      const expectedAway = expectedHome.id === audit.teamA.id ? audit.teamB : audit.teamA;

      if (!secondLeg) {
        return {
          key: audit.key,
          pairLabel: audit.pairLabel,
          firstLeg,
          secondLeg: null,
          expectedHome,
          expectedAway,
          status: 'faltante',
          note: 'Falta programar el espejo de la primera vuelta.',
        };
      }

      const secondIsMirror = secondLeg.home_team_id === expectedHome.id && secondLeg.away_team_id === expectedAway.id;
      const hasExtraMatches = audit.orderedMatches.length > 2;

      let status: ComparisonRow['status'] = 'listo';
      let note = 'Segunda vuelta correcta.';

      if (!secondIsMirror) {
        status = 'conflicto';
        note = 'La segunda vuelta no respeta el espejo de la primera.';
      } else if (hasExtraMatches) {
        status = 'conflicto';
        note = 'Existe el espejo, pero además hay partidos extra para esta pareja.';
      }

      return {
        key: audit.key,
        pairLabel: audit.pairLabel,
        firstLeg,
        secondLeg,
        expectedHome,
        expectedAway,
        status,
        note,
      };
    });
  }, [pairAudit]);

  const regularMatches = useMemo(
    () => matches.filter((m) => m.phase === 'Fase Regular'),
    [matches]
  );

  const regularJornadas = useMemo(
    () => Array.from(new Set(regularMatches.map((m) => m.jornada).filter((j): j is number => typeof j === 'number'))).sort((a, b) => a - b),
    [regularMatches]
  );

  const jornadaMirrorRows = useMemo<JornadaMirrorRow[]>(() => {
    const rows: JornadaMirrorRow[] = [];
    const half = Math.ceil(regularJornadas.length / 2);
    const firstLegJornadas = regularJornadas.slice(0, half);
    const secondLegJornadas = regularJornadas.slice(half);

    firstLegJornadas.forEach((firstJornada, index) => {
      const secondJornada = secondLegJornadas[index] ?? null;
      const firstMatches = regularMatches
        .filter((m) => m.jornada === firstJornada)
        .sort((a, b) => {
          const homeA = teamsById[a.home_team_id]?.name ?? '';
          const homeB = teamsById[b.home_team_id]?.name ?? '';
          if (homeA !== homeB) return homeA.localeCompare(homeB);
          const awayA = teamsById[a.away_team_id]?.name ?? '';
          const awayB = teamsById[b.away_team_id]?.name ?? '';
          return awayA.localeCompare(awayB);
        });

      const secondMatches = secondJornada === null
        ? []
        : regularMatches.filter((m) => m.jornada === secondJornada);

      const usedSecondMatchIds = new Set<number>();

      firstMatches.forEach((firstMatch, matchIndex) => {
        const expectedHome = teamsById[firstMatch.away_team_id] ?? null;
        const expectedAway = teamsById[firstMatch.home_team_id] ?? null;
        const matchedSecond = secondMatches.find((candidate) => {
          if (candidate.id && usedSecondMatchIds.has(candidate.id)) return false;
          return candidate.home_team_id === firstMatch.away_team_id && candidate.away_team_id === firstMatch.home_team_id;
        }) ?? null;

        if (matchedSecond?.id) usedSecondMatchIds.add(matchedSecond.id);

        rows.push({
          key: `${firstJornada}-${secondJornada ?? 'na'}-${firstMatch.id ?? matchIndex}`,
          firstJornada,
          secondJornada,
          firstMatch,
          secondMatch: matchedSecond,
          expectedHome,
          expectedAway,
          status: secondJornada === null
            ? 'sin-segunda'
            : matchedSecond
              ? 'listo'
              : 'faltante',
          note: secondJornada === null
            ? 'Todavía no existe una jornada espejo para esta jornada.'
            : matchedSecond
              ? 'El espejo está capturado en la jornada correspondiente.'
              : 'Falta capturar el espejo de este partido en la jornada correspondiente.',
        });
      });

      secondMatches
        .filter((match) => !match.id || !usedSecondMatchIds.has(match.id))
        .forEach((extraMatch, extraIndex) => {
          rows.push({
            key: `${firstJornada}-${secondJornada ?? 'na'}-extra-${extraMatch.id ?? extraIndex}`,
            firstJornada,
            secondJornada,
            firstMatch: null,
            secondMatch: extraMatch,
            expectedHome: null,
            expectedAway: null,
            status: 'extra',
            note: 'Existe en la jornada espejo, pero no encontró partido base en la primera vuelta.',
          });
        });
    });

    return rows;
  }, [regularJornadas, regularMatches, teamsById]);

  const createMissingMatch = useMutation({
    mutationFn: async (vars: MutationVars) => {
      const { error } = await supabase.from('matches').insert({
        season_id: seasonId,
        phase: 'Fase Regular',
        status: 'Programado',
        ...vars
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matches'] });
      message.success('Partido programado con éxito');
    },
    onError: (e: Error) => message.error(e.message),
  });

  const updateRowState = (key: string, field: keyof RowState, value: unknown) => {
    setRowStates((prev: Record<string, RowState>) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { jornada: nextSuggestedJornada }),
        [field]: value
      }
    }));
  };

  const attemptCreate = (record: MissingMatch) => {
    const s = rowStates[record.key] || { jornada: nextSuggestedJornada };
    if (!s.jornada) {
      message.error('Debes proporcionar una jornada.');
      return;
    }
    
    createMissingMatch.mutate({
      home_team_id: record.home.id,
      away_team_id: record.away.id,
      jornada: s.jornada,
      court: s.court || null,
      time_str: s.time_str || null,
      scheduled_date: s.scheduled_date ? s.scheduled_date.format('YYYY-MM-DD') : null,
    });
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
          value={rowStates[record.key]?.jornada || nextSuggestedJornada} 
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
        <Space direction="vertical" size={2}>
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

  const formatMatchLine = (match: MatchData | null, teamsById: Record<number, Team>) => {
    if (!match) return 'Sin partido';
    const home = teamsById[match.home_team_id]?.name ?? `#${match.home_team_id}`;
    const away = teamsById[match.away_team_id]?.name ?? `#${match.away_team_id}`;
    const jornada = match.jornada ? `J${match.jornada}` : 'J?';
    const status = match.status ?? 'Sin estatus';
    const dateBits = [
      match.scheduled_date ? dayjs(match.scheduled_date).format('DD/MM') : null,
      match.time_str ?? null,
      match.court ?? null,
    ].filter(Boolean);
    return `${jornada}: ${home} vs ${away} (${status})${dateBits.length ? ` · ${dateBits.join(' · ')}` : ''}`;
  };

  const comparisonColumns = [
    {
      title: 'Pareja',
      key: 'pair',
      render: (_: unknown, record: ComparisonRow) => (
        <div>
          <b>{record.pairLabel}</b>
          <div style={{ marginTop: 6 }}>
            <Tag color={record.status === 'listo' ? 'green' : record.status === 'faltante' ? 'gold' : 'red'}>
              {record.status === 'listo' ? 'Espejo correcto' : record.status === 'faltante' ? 'Falta espejo' : 'Revisar'}
            </Tag>
          </div>
        </div>
      ),
      width: 180,
    },
    {
      title: 'Primera Vuelta',
      key: 'firstLeg',
      render: (_: unknown, record: ComparisonRow) => (
        <span style={{ fontSize: 12, color: '#ccc' }}>
          {formatMatchLine(record.firstLeg, teamsById)}
        </span>
      ),
      width: 280,
    },
    {
      title: 'Segunda Vuelta Capturada',
      key: 'secondLeg',
      render: (_: unknown, record: ComparisonRow) => (
        <span style={{ fontSize: 12, color: '#ccc' }}>
          {formatMatchLine(record.secondLeg, teamsById)}
        </span>
      ),
      width: 280,
    },
    {
      title: 'Espejo Esperado',
      key: 'expectedMirror',
      render: (_: unknown, record: ComparisonRow) => (
        <div style={{ fontSize: 12, color: '#fff' }}>
          {record.expectedHome && record.expectedAway
            ? `${record.expectedHome.name} vs ${record.expectedAway.name}`
            : 'Pendiente de definir'}
          <div style={{ color: '#888', marginTop: 6 }}>{record.note}</div>
        </div>
      ),
    },
  ];

  const jornadaMirrorColumns = [
    {
      title: 'Jornadas Espejo',
      key: 'jornadas',
      render: (_: unknown, record: JornadaMirrorRow) => (
        <div>
          <b>J{record.firstJornada}</b>
          <span style={{ color: '#888' }}> vs </span>
          <b>{record.secondJornada ? `J${record.secondJornada}` : 'Sin espejo'}</b>
          <div style={{ marginTop: 6 }}>
            <Tag color={
              record.status === 'listo'
                ? 'green'
                : record.status === 'faltante'
                  ? 'gold'
                  : record.status === 'extra'
                    ? 'red'
                    : 'default'
            }>
              {record.status === 'listo'
                ? 'Correcto'
                : record.status === 'faltante'
                  ? 'Faltante'
                  : record.status === 'extra'
                    ? 'Extra'
                    : 'Sin jornada espejo'}
            </Tag>
          </div>
        </div>
      ),
      width: 170,
    },
    {
      title: 'Partido Primera Vuelta',
      key: 'firstMatch',
      render: (_: unknown, record: JornadaMirrorRow) => (
        <span style={{ fontSize: 12, color: '#ccc' }}>
          {formatMatchLine(record.firstMatch, teamsById)}
        </span>
      ),
      width: 290,
    },
    {
      title: 'Partido Segunda Vuelta',
      key: 'secondMatch',
      render: (_: unknown, record: JornadaMirrorRow) => (
        <span style={{ fontSize: 12, color: '#ccc' }}>
          {formatMatchLine(record.secondMatch, teamsById)}
        </span>
      ),
      width: 290,
    },
    {
      title: 'Espejo Esperado',
      key: 'expected',
      render: (_: unknown, record: JornadaMirrorRow) => (
        <div style={{ fontSize: 12 }}>
          <div style={{ color: '#fff' }}>
            {record.expectedHome && record.expectedAway
              ? `${record.expectedHome.name} vs ${record.expectedAway.name}`
              : 'Sin referencia'}
          </div>
          <div style={{ color: '#888', marginTop: 6 }}>{record.note}</div>
        </div>
      ),
    },
  ];

  const jornadaMirrorSummary = useMemo(() => ({
    total: jornadaMirrorRows.length,
    ready: jornadaMirrorRows.filter((row) => row.status === 'listo').length,
    missing: jornadaMirrorRows.filter((row) => row.status === 'faltante').length,
    extra: jornadaMirrorRows.filter((row) => row.status === 'extra').length,
  }), [jornadaMirrorRows]);

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
      title={<span style={{ color: '#FAAD14' }}>🔍 Revisión de Partidos Faltantes</span>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={1080}
      destroyOnClose
    >
      <div style={{ marginBottom: 16, color: '#ccc', lineHeight: 1.5 }}>
        La revisión compara cada pareja de equipos activos en <b>Fase Regular</b>. Sólo se pueden programar aquí los faltantes seguros.
        Si una pareja ya tiene 2 juegos mal capturados o más de 2 juegos, se manda a <b>Conflictos</b> para evitar triplicar partidos.
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {summaryBox('Cruces por jornada', jornadaMirrorSummary.total, '#1677ff')}
        {summaryBox('Espejos correctos', jornadaMirrorSummary.ready, '#52c41a')}
        {summaryBox('Espejos faltantes', jornadaMirrorSummary.missing, '#faad14')}
        {summaryBox('Partidos extra', jornadaMirrorSummary.extra, '#ff4d4f')}
        {summaryBox('Faltantes seguros', missingMatches.length, '#faad14')}
        {summaryBox('Parejas con conflicto', conflictingPairs.length, '#ff4d4f')}
        {summaryBox('Parejas completas', completePairs.length, '#52c41a')}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Segmented
          value={viewMode}
          onChange={(value) => setViewMode(value as 'jornadas' | 'comparativa' | 'faltantes' | 'conflictos' | 'completos')}
          options={[
            { label: `Jornadas Espejo (${jornadaMirrorRows.length})`, value: 'jornadas' },
            { label: `Comparativa (${comparisonRows.length})`, value: 'comparativa' },
            { label: `Faltantes (${missingMatches.length})`, value: 'faltantes' },
            { label: `Conflictos (${conflictingPairs.length})`, value: 'conflictos' },
            { label: `Completos (${completePairs.length})`, value: 'completos' },
          ]}
        />
        <Tag color="gold" style={{ alignSelf: 'center', padding: '4px 10px' }}>
          Jornada sugerida para nuevos juegos: J{nextSuggestedJornada}
        </Tag>
      </div>
      {viewMode === 'jornadas' ? (
        <Table<JornadaMirrorRow>
          dataSource={jornadaMirrorRows}
          columns={jornadaMirrorColumns}
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: 'No hay jornadas regulares suficientes para comparar.' }}
          scroll={{ x: 1100, y: 500 }}
          size="small"
        />
      ) : viewMode === 'comparativa' ? (
        <Table<ComparisonRow>
          dataSource={comparisonRows}
          columns={comparisonColumns}
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: 'No hay parejas para comparar.' }}
          scroll={{ x: 1080, y: 500 }}
          size="small"
        />
      ) : viewMode === 'faltantes' ? (
        <Table<MissingMatch>
          dataSource={missingMatches}
          columns={missingColumns}
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: 'No hay faltantes seguros por programar.' }}
          scroll={{ x: 960, y: 500 }}
          size="small"
        />
      ) : (
        <Table<PairAudit>
          dataSource={viewMode === 'conflictos' ? conflictingPairs : completePairs}
          columns={pairColumns}
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: viewMode === 'conflictos' ? 'No hay conflictos detectados.' : 'No hay parejas completas todavía.' }}
          scroll={{ x: 960, y: 500 }}
          size="small"
        />
      )}
    </Modal>
  );
}
