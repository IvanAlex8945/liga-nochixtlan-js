'use client';

import AdminLayout from '@/app/components/AdminLayout';
import {
  Table, Button, Modal, Form, Select, InputNumber, Tag, Typography, Space, Empty, App, Progress,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, WhatsAppOutlined, CopyOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useMemo } from 'react';
import SeasonSelector from '@/app/components/SeasonSelector';
import AdminEditForm, { EditableMatch } from '@/app/components/AdminEditForm';
import { invalidatePublicCache } from '@/lib/public-cache-client';
import { checkSchedulingConflicts, SchedulingTeam } from '@/lib/scheduling';
import { useAdminStore } from '@/lib/admin-store';
import LiguillaModal from './LiguillaModal';
import MissingMatchesModal from './MissingMatchesModal';

import dayjs from 'dayjs';
import 'dayjs/locale/es';
const { Title, Text } = Typography;
const PHASES = ['Fase Regular', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Tercer Lugar', 'Final'];
const COURTS = ['Cancha Bicentenario', 'Cancha Techada', 'Cancha III'];
const TIMES = ['06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM'];

interface Match {
  id: number; jornada: number | null; phase: string; status: string;
  home_team_id: number; away_team_id: number; home_score: number | null; away_score: number | null;
  scheduled_date: string | null; time_str: string | null; court: string | null;
  vuelta?: 'ida' | 'vuelta' | 'liguilla' | null;
  home_team?: { id: number; name: string }; away_team?: { id: number; name: string };
}

interface GeneratedMatch {
  season_id: number;
  jornada: number | null;
  phase: string;
  status: string;
  home_team_id: number;
  away_team_id: number;
  court: string | null;
  time_str: string | null;
  vuelta: 'ida' | 'vuelta';
}

interface Team extends SchedulingTeam {
  id: number;
  name: string;
}

type LegLabel = 'Ida' | 'Vuelta';
type TeamSide = 'Local' | 'Visitante' | 'Por definir';
type MatchLeg = 'ida' | 'vuelta' | 'liguilla';

interface TeamCalendarRow {
  key: string;
  opponentName: string;
  leg: LegLabel;
  side: TeamSide;
  jornada: number | null;
  scheduled_date: string | null;
  time_str: string | null;
  court: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
}

interface CourtBalanceRow {
  court: string;
  ida: number;
  vuelta: number;
  total: number;
}

interface AssistantSuggestion {
  key: string;
  matchId: number;
  accepted: boolean;
  jornada: number;
  scheduled_date: string;
  court: string | null;
  time_str: string | null;
  homeName: string;
  awayName: string;
  vuelta: MatchLeg | null;
  reason: string;
  warnings: string[];
  blocking: string[];
}

const statusColor: Record<string, string> = {
  Programado: 'default', Pendiente: 'processing', Jugado: 'green', 'WO Local': 'orange', 'WO Visitante': 'orange', 'WO Doble': 'red',
};

const legLabels: Record<'ida' | 'vuelta' | 'liguilla', string> = {
  ida: 'Ida',
  vuelta: 'Vuelta',
  liguilla: 'Liguilla',
};

function isRegularPhase(phase?: string | null) {
  return !phase || phase === 'Fase Regular';
}

function isCompletedStatus(status?: string | null) {
  return status === 'Jugado' || status === 'WO Local' || status === 'WO Visitante' || status === 'WO Doble';
}

function isSamePair(match: Pick<Match, 'home_team_id' | 'away_team_id'>, homeTeamId: number, awayTeamId: number) {
  return (
    (match.home_team_id === homeTeamId && match.away_team_id === awayTeamId) ||
    (match.home_team_id === awayTeamId && match.away_team_id === homeTeamId)
  );
}

function sortMatchesBySchedule(a: Match, b: Match) {
  const jornadaA = a.jornada ?? 9999;
  const jornadaB = b.jornada ?? 9999;
  if (jornadaA !== jornadaB) return jornadaA - jornadaB;
  return a.id - b.id;
}

function getFirstLegJornadaCount(teamCount: number) {
  if (teamCount < 2) return 0;
  return teamCount % 2 === 0 ? teamCount - 1 : teamCount;
}

function shuffleTeamIds(teamIds: number[]) {
  const shuffled = [...teamIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function sortTeamsByName<T extends { name: string }>(teams: T[]) {
  return [...teams].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

export default function CalendarPage() {
  const { message: messageApi, modal } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const seasonId = useAdminStore((s) => s.selectedSeasonId);
  const setSeasonId = useAdminStore((s) => s.setSelectedSeasonId);
  const [editingMatch, setEditingMatch] = useState<EditableMatch | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [missingModalOpen, setMissingModalOpen] = useState(false);
  const [waJornada, setWaJornada] = useState<number | null>(null);
  const [selectedTeamCalendarId, setSelectedTeamCalendarId] = useState<number | null>(null);
  const [teamFilterIds, setTeamFilterIds] = useState<number[]>([]);
  const [vueltaFilter, setVueltaFilter] = useState<'all' | MatchLeg>('all');
  const [calendarStateFilter, setCalendarStateFilter] = useState<'all' | 'played' | 'pending_no_date' | 'scheduled_no_result'>('all');
  const [courtFilter, setCourtFilter] = useState<'all' | string>('all');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantJornada, setAssistantJornada] = useState<number | null>(null);
  const [assistantDate, setAssistantDate] = useState('');
  const [assistantCourts, setAssistantCourts] = useState<string[]>(COURTS.slice(0, 2));
  const [assistantTimes, setAssistantTimes] = useState<string[]>(TIMES.slice(0, 6));
  const [assistantMaxMatches, setAssistantMaxMatches] = useState(6);
  const [assistantSuggestions, setAssistantSuggestions] = useState<AssistantSuggestion[]>([]);

  const [prevSeasonId, setPrevSeasonId] = useState(seasonId);
  if (seasonId !== prevSeasonId) {
    setPrevSeasonId(seasonId);
    setTeamFilterIds([]);
    setSelectedTeamCalendarId(null);
  }

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['teams-active', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, name, match_frequency_days, preferred_time_notes')
        .eq('season_id', seasonId!)
        .eq('status', 'Activo')
        .order('name', { ascending: true });
      return data ?? [];
    },
  });

  const { data: matches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['matches', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`id, jornada, phase, status, vuelta, home_team_id, away_team_id, home_score, away_score, scheduled_date, time_str, court,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)`)
        .eq('season_id', seasonId!)
        .order('jornada', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Match[];
    },
  });

  const createMatch = useMutation({
    mutationFn: async (v: {
      jornada: number;
      home_team_id: number;
      away_team_id: number;
      phase?: string;
      court?: string | null;
      time_str?: string | null;
      scheduled_date?: string | null;
      forceMirrorMismatch?: boolean;
      forceScheduleWarnings?: boolean;
    }) => {
      if (v.home_team_id === v.away_team_id) {
        throw new Error('El equipo local y visitante deben ser diferentes.');
      }

      const phase = v.phase ?? 'Fase Regular';
      const scheduledDate = v.scheduled_date || null;
      const scheduleCheck = checkSchedulingConflicts({
        matches,
        teams,
        homeTeamId: v.home_team_id,
        awayTeamId: v.away_team_id,
        scheduledDate,
        jornada: v.jornada,
        timeStr: v.time_str,
        court: v.court,
      });
      if (scheduleCheck.blocking.length > 0) {
        throw new Error(scheduleCheck.blocking.join(' '));
      }
      if (scheduleCheck.warnings.length > 0 && !v.forceScheduleWarnings) {
        throw new Error(`Revisa estas alertas de programación: ${scheduleCheck.warnings.join(' ')}`);
      }

      if (phase === 'Fase Regular') {
        const existingRegularMatches = matches
          .filter((match) => isRegularPhase(match.phase) && isSamePair(match, v.home_team_id, v.away_team_id))
          .sort(sortMatchesBySchedule);
        const homeName = teams.find((team) => team.id === v.home_team_id)?.name ?? `Equipo #${v.home_team_id}`;
        const awayName = teams.find((team) => team.id === v.away_team_id)?.name ?? `Equipo #${v.away_team_id}`;

        if (existingRegularMatches.length >= 2) {
          throw new Error(`No se puede crear otro partido entre ${homeName} y ${awayName}: ya existen ida y vuelta registrados.`);
        }

        if (existingRegularMatches.length === 0) {
          const mirrorJornada = v.jornada + getFirstLegJornadaCount(teams.length);
          const matchValues = { ...v };
          delete matchValues.forceMirrorMismatch;
          delete matchValues.forceScheduleWarnings;
          const { error } = await supabase.from('matches').insert([
            {
              ...matchValues,
              phase,
              scheduled_date: scheduledDate,
              season_id: seasonId!,
              status: 'Programado',
              vuelta: 'ida',
            },
            {
              season_id: seasonId!,
              jornada: mirrorJornada,
              phase,
              status: 'Pendiente',
              home_team_id: v.away_team_id,
              away_team_id: v.home_team_id,
              scheduled_date: null,
              court: null,
              time_str: null,
              vuelta: 'vuelta',
            },
          ]);
          if (error) throw error;
          return 2;
        }

        const firstLeg = existingRegularMatches[0];
        const targetLeg: MatchLeg = firstLeg.vuelta === 'vuelta' ? 'ida' : 'vuelta';
        if (existingRegularMatches.some((match) => match.vuelta === targetLeg)) {
          throw new Error(`Ya existe un partido de ${legLabels[targetLeg].toLowerCase()} entre ${homeName} y ${awayName}.`);
        }

        const expectedHomeId = firstLeg.away_team_id;
        const expectedAwayId = firstLeg.home_team_id;
        const respectsMirror = v.home_team_id === expectedHomeId && v.away_team_id === expectedAwayId;
        if (!respectsMirror && !v.forceMirrorMismatch) {
          const firstHomeName = firstLeg.home_team?.name ?? teams.find((team) => team.id === firstLeg.home_team_id)?.name ?? `Equipo #${firstLeg.home_team_id}`;
          throw new Error(`Este cruce no respeta el espejo de la ida. En la ida ${firstHomeName} fue local.`);
        }

        const matchValues = { ...v };
        delete matchValues.forceMirrorMismatch;
        delete matchValues.forceScheduleWarnings;
        const { error } = await supabase.from('matches').insert({
          ...matchValues,
          phase,
          scheduled_date: scheduledDate,
          season_id: seasonId!,
          status: 'Programado',
          vuelta: targetLeg,
        });
        if (error) throw error;
        return 1;
      }

      const matchValues = { ...v };
      delete matchValues.forceMirrorMismatch;
      delete matchValues.forceScheduleWarnings;
      const { error } = await supabase.from('matches').insert({
        ...matchValues,
        phase,
        scheduled_date: scheduledDate,
        season_id: seasonId!,
        status: 'Programado',
        vuelta: 'liguilla',
      });
      if (error) throw error;
      return 1;
    },
    onSuccess: async (count) => {
      qc.invalidateQueries({ queryKey: ['matches'] });
      await invalidatePublicCache({ seasonId });
      messageApi.success(count === 2 ? 'Partido de ida creado y vuelta reservada' : 'Partido creado');
      setModalOpen(false);
      form.resetFields();
    },
    onError: (e: Error) => messageApi.error(e.message),
  });

  const submitCreateMatch = (values: {
    jornada: number;
    home_team_id: number;
    away_team_id: number;
    phase?: string;
    court?: string | null;
    time_str?: string | null;
    scheduled_date?: string | null;
    forceMirrorMismatch?: boolean;
    forceScheduleWarnings?: boolean;
  }) => {
    const scheduledDate = values.scheduled_date || null;
    const scheduleCheck = checkSchedulingConflicts({
      matches,
      teams,
      homeTeamId: values.home_team_id,
      awayTeamId: values.away_team_id,
      scheduledDate,
      jornada: values.jornada,
      timeStr: values.time_str,
      court: values.court,
    });

    if (scheduleCheck.blocking.length > 0) {
      messageApi.error(scheduleCheck.blocking.join(' '));
      return;
    }

    const phase = values.phase ?? 'Fase Regular';
    const mirrorWarning = (() => {
      if (phase !== 'Fase Regular') return null;
      const existingRegularMatches = matches
        .filter((match) => isRegularPhase(match.phase) && isSamePair(match, values.home_team_id, values.away_team_id))
        .sort(sortMatchesBySchedule);
      if (existingRegularMatches.length !== 1) return null;
      const firstLeg = existingRegularMatches[0];
      const respectsMirror = values.home_team_id === firstLeg.away_team_id && values.away_team_id === firstLeg.home_team_id;
      if (respectsMirror) return null;
      const firstHomeName = firstLeg.home_team?.name ?? teams.find((team) => team.id === firstLeg.home_team_id)?.name ?? `Equipo #${firstLeg.home_team_id}`;
      return `En la ida ${firstHomeName} fue local.`;
    })();

    const warnings = [
      ...scheduleCheck.warnings,
      ...(mirrorWarning ? [`Este cruce no respeta el espejo de la ida. ${mirrorWarning}`] : []),
    ];

    if (warnings.length > 0 && (!values.forceScheduleWarnings || (mirrorWarning && !values.forceMirrorMismatch))) {
      modal.confirm({
        title: mirrorWarning ? 'Revisar programación y espejo' : 'Revisar programación',
        content: (
          <div>
            {warnings.map((warning) => (
              <div key={warning} style={{ marginBottom: 6 }}>{warning}</div>
            ))}
          </div>
        ),
        okText: mirrorWarning ? 'Forzar' : 'Continuar',
        cancelText: 'Cancelar',
        okType: mirrorWarning ? 'danger' : 'primary',
        onOk: () => createMatch.mutate({
          ...values,
          forceScheduleWarnings: true,
          forceMirrorMismatch: Boolean(mirrorWarning),
        }),
      });
      return;
    }

    if (phase !== 'Fase Regular') {
      createMatch.mutate(values);
      return;
    }

    const existingRegularMatches = matches
      .filter((match) => isRegularPhase(match.phase) && isSamePair(match, values.home_team_id, values.away_team_id))
      .sort(sortMatchesBySchedule);
    if (existingRegularMatches.length !== 1) {
      createMatch.mutate(values);
      return;
    }

    const firstLeg = existingRegularMatches[0];
    const expectedHomeId = firstLeg.away_team_id;
    const expectedAwayId = firstLeg.home_team_id;
    const respectsMirror = values.home_team_id === expectedHomeId && values.away_team_id === expectedAwayId;
    if (respectsMirror) {
      createMatch.mutate(values);
      return;
    }

    const firstHomeName = firstLeg.home_team?.name ?? teams.find((team) => team.id === firstLeg.home_team_id)?.name ?? `Equipo #${firstLeg.home_team_id}`;
    modal.confirm({
      title: 'El cruce no respeta el espejo',
      content: `En la ida ${firstHomeName} fue local. Si guardas este partido, la vuelta quedará con una localía distinta a la regla de espejo. ¿Deseas continuar de todas formas?`,
      okText: 'Forzar',
      cancelText: 'Cancelar',
      okType: 'danger',
      onOk: () => createMatch.mutate({ ...values, forceMirrorMismatch: true }),
    });
  };

  const autoGenerate = useMutation({
    mutationFn: async () => {
      if (teams.length < 2) throw new Error('Se necesitan al menos 2 equipos');
      if (matches.some((match) => isRegularPhase(match.phase))) {
        throw new Error('No se puede generar el rol automático porque esta temporada ya tiene partidos de fase regular.');
      }
      const teamIds = shuffleTeamIds(teams.map((t) => t.id));
      // If odd, add a dummy 'bye' team
      if (teamIds.length % 2 !== 0) teamIds.push(-1);

      const numRounds = teamIds.length - 1;
      const halfSize = teamIds.length / 2;
      const firstLegRounds: GeneratedMatch[][] = [];
      const newMatches: GeneratedMatch[] = [];
      const rotatingTeamIds = [...teamIds];

      // Primera vuelta aleatoria: se barajan los equipos antes de aplicar round-robin.
      for (let round = 0; round < numRounds; round++) {
        const jornada = round + 1;
        const roundMatches: GeneratedMatch[] = [];
        let matchesThisRound = 0;

        for (let i = 0; i < halfSize; i++) {
          const home = rotatingTeamIds[i];
          const away = rotatingTeamIds[teamIds.length - 1 - i];

          if (home !== -1 && away !== -1) {
            const courtIndex = matchesThisRound % COURTS.length;
            const timeIndex = Math.floor(matchesThisRound / COURTS.length) % TIMES.length;

            roundMatches.push({
              season_id: seasonId!,
              jornada,
              phase: 'Fase Regular',
              status: 'Programado',
              home_team_id: home,
              away_team_id: away,
              court: COURTS[courtIndex],
              time_str: TIMES[timeIndex],
              vuelta: 'ida',
            });
            matchesThisRound++;
          }
        }

        firstLegRounds.push(roundMatches);
        newMatches.push(...roundMatches);
        rotatingTeamIds.splice(1, 0, rotatingTeamIds.pop()!); // Rotate array leaving first element fixed
      }

      // Segunda vuelta: espejo exacto de la primera, con localia invertida.
      for (const roundMatches of firstLegRounds) {
        newMatches.push(...roundMatches.map((match): GeneratedMatch => ({
          season_id: match.season_id,
          jornada: (match.jornada ?? 0) + numRounds,
          phase: match.phase,
          status: 'Pendiente',
          home_team_id: match.away_team_id,
          away_team_id: match.home_team_id,
          court: null,
          time_str: null,
          vuelta: 'vuelta',
        })));
      }

      const { error } = await supabase.from('matches').insert(newMatches);
      if (error) throw error;
      return newMatches.length;
    },
    onSuccess: async (count) => {
      qc.invalidateQueries({ queryKey: ['matches'] });
      await invalidatePublicCache({ seasonId });
      messageApi.success(`Se generaron ${count} partidos automáticamente`);
    },
    onError: (e: Error) => messageApi.error(e.message),
  });

  const deleteMatch = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from('matches').delete().eq('id', id); if (error) throw error; },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['matches'] });
      await invalidatePublicCache({ seasonId });
      messageApi.success('Partido eliminado');
    },
    onError: (e: Error) => messageApi.error(e.message),
  });

  const cols = [
    {
      title: 'J',
      dataIndex: 'jornada',
      key: 'jornada',
      width: 44,
      align: 'center' as const,
      render: (value: number | null) => value ?? '?',
    },
    {
      title: 'Partido', key: 'match',
      render: (_: unknown, m: Match) => (
        <div>
          <Text><b>{m.home_team?.name ?? '?'}</b><span style={{ color: '#555', margin: '0 6px' }}>vs</span><b>{m.away_team?.name ?? '?'}</b></Text>
          <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
            {m.scheduled_date ? dayjs(m.scheduled_date).format('DD MMM') : ''}
            {m.time_str && ` • ${m.time_str} hrs`}
            {m.court && ` • ${m.court}`}
          </div>
        </div>
      ),
    },
    {
      title: 'Estatus', dataIndex: 'status', key: 'status', width: 140,
      render: (v: string, m: Match) => (
        <span>
          <Tag color={statusColor[v] ?? 'default'}>{v}</Tag>
          {m.status === 'Jugado' && m.home_score !== null && (
            <Text style={{ color: '#888', fontSize: 12 }}> {m.home_score}–{m.away_score}</Text>
          )}
        </span>
      ),
    },
    {
      title: 'Fase',
      dataIndex: 'phase',
      key: 'phase',
      width: 130,
      render: (value: string, m: Match) => (
        <span>
          {value}
          {m.vuelta && <Tag style={{ marginLeft: 6 }}>{legLabels[m.vuelta]}</Tag>}
        </span>
      ),
    },
    {
      title: '', key: 'actions', width: 90,
      render: (_: unknown, m: Match) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditingMatch(m as EditableMatch)}
          />
          {m.status === 'Programado' && (
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() =>
              modal.confirm({
                title: '¿Eliminar partido?', okText: 'Eliminar', okType: 'danger', cancelText: 'Cancelar',
                onOk: () => deleteMatch.mutate(m.id),
              })
            } />
          )}
        </Space>
      ),
    },
  ];

  const sortedTeams = useMemo(() => sortTeamsByName(teams), [teams]);
  const teamOptions = sortedTeams.map((t) => ({ label: t.name, value: t.id }));

  const uniqueJornadas = Array.from(new Set(matches.map(m => m.jornada).filter((j): j is number => typeof j === 'number'))).sort((a,b) => a - b);
  const regularMatches = matches.filter((match) => isRegularPhase(match.phase));
  const completedRegularMatches = regularMatches.filter((match) => isCompletedStatus(match.status));
  const totalRegularMatchesExpected = teams.length >= 2 ? teams.length * (teams.length - 1) : 0;
  const totalRegularJornadasExpected = teams.length >= 2 ? (teams.length % 2 === 0 ? teams.length - 1 : teams.length) * 2 : 0;
  const completedJornadas = completedRegularMatches
    .map((match) => match.jornada)
    .filter((jornada): jornada is number => typeof jornada === 'number');
  const scheduledJornadas = regularMatches
    .map((match) => match.jornada)
    .filter((jornada): jornada is number => typeof jornada === 'number')
    .sort((a, b) => a - b);
  const currentRegularJornada = completedJornadas.length > 0
    ? Math.max(...completedJornadas)
    : scheduledJornadas[0] ?? null;
  const regularProgressPercent = totalRegularMatchesExpected > 0
    ? Math.min(100, Math.round((completedRegularMatches.length / totalRegularMatchesExpected) * 100))
    : 0;
  const regularPairAudit = (() => {
    let missing = 0;
    let conflicts = 0;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const teamA = teams[i];
        const teamB = teams[j];
        const matchesBetween = regularMatches.filter((match) => isSamePair(match, teamA.id, teamB.id));
        const homeByA = matchesBetween.filter((match) => match.home_team_id === teamA.id).length;
        const homeByB = matchesBetween.filter((match) => match.home_team_id === teamB.id).length;

        if (matchesBetween.length < 2) {
          missing += 2 - matchesBetween.length;
        } else if (matchesBetween.length > 2 || homeByA !== 1 || homeByB !== 1) {
          conflicts++;
        }
      }
    }

    return { missing, conflicts };
  })();

  const progressBox = (label: string, value: string, helper: string, color: string) => (
    <div
      style={{
        minWidth: 190,
        flex: '1 1 190px',
        padding: '12px 14px',
        background: '#111',
        border: `1px solid ${color}55`,
        borderRadius: 8,
      }}
    >
      <div style={{ color, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginTop: 6 }}>{value}</div>
      <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>{helper}</div>
    </div>
  );

  const nextSuggestedJornada = uniqueJornadas.length > 0 ? Math.max(...uniqueJornadas) + 1 : 1;

  const getTeamCourtCount = (teamId: number, court: string) => (
    regularMatches.filter((match) =>
      match.court === court &&
      (match.home_team_id === teamId || match.away_team_id === teamId)
    ).length
  );

  const chooseBalancedCourt = (match: Match, availableCourts: string[]) => {
    if (availableCourts.length === 0) return null;
    const preferredCourts = availableCourts.filter((court) => court !== 'Cancha III');
    const courtsToUse = preferredCourts.length > 0 ? preferredCourts : availableCourts;
    return [...courtsToUse].sort((courtA, courtB) => {
      const balanceA = getTeamCourtCount(match.home_team_id, courtA) + getTeamCourtCount(match.away_team_id, courtA);
      const balanceB = getTeamCourtCount(match.home_team_id, courtB) + getTeamCourtCount(match.away_team_id, courtB);
      return balanceA - balanceB;
    })[0] ?? null;
  };

  const generateAssistantSuggestions = () => {
    if (!assistantJornada || !assistantDate) {
      messageApi.error('Selecciona jornada y fecha para generar sugerencias.');
      return;
    }
    if (assistantCourts.length === 0 || assistantTimes.length === 0) {
      messageApi.error('Selecciona al menos una cancha y un horario.');
      return;
    }

    const pendingMatches = regularMatches
      .filter((match) => match.status !== 'Jugado' && !isCompletedStatus(match.status))
      .filter((match) => !match.scheduled_date || !match.court || !match.time_str || !match.jornada)
      .sort((a, b) => {
        const aScore = (a.vuelta === 'ida' ? 0 : 1) + (a.jornada ? 2 : 0) + (a.scheduled_date ? 2 : 0);
        const bScore = (b.vuelta === 'ida' ? 0 : 1) + (b.jornada ? 2 : 0) + (b.scheduled_date ? 2 : 0);
        if (aScore !== bScore) return aScore - bScore;
        return a.id - b.id;
      })
      .slice(0, Math.max(1, assistantMaxMatches));

    const plannedMatches: Match[] = [];
    const suggestions = pendingMatches.map((match, index) => {
      const time = assistantTimes[index % assistantTimes.length] ?? null;
      const court = chooseBalancedCourt(match, assistantCourts);
      const scheduledDraft: Match = {
        ...match,
        id: -match.id,
        jornada: assistantJornada,
        scheduled_date: assistantDate,
        time_str: time,
        court,
      };
      const scheduleCheck = checkSchedulingConflicts({
        matches: [...matches, ...plannedMatches],
        teams,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        scheduledDate: assistantDate,
        jornada: assistantJornada,
        timeStr: time,
        court,
        excludeMatchId: match.id,
      });
      plannedMatches.push(scheduledDraft);

      const reason = !match.scheduled_date
        ? 'Pendiente sin fecha'
        : !match.jornada
          ? 'Pendiente sin jornada'
          : 'Pendiente por completar programación';

      return {
        key: String(match.id),
        matchId: match.id,
        accepted: scheduleCheck.blocking.length === 0,
        jornada: assistantJornada,
        scheduled_date: assistantDate,
        court,
        time_str: time,
        homeName: match.home_team?.name ?? `Equipo #${match.home_team_id}`,
        awayName: match.away_team?.name ?? `Equipo #${match.away_team_id}`,
        vuelta: match.vuelta ?? null,
        reason,
        warnings: scheduleCheck.warnings,
        blocking: scheduleCheck.blocking,
      } satisfies AssistantSuggestion;
    });

    setAssistantSuggestions(suggestions);
    if (suggestions.length === 0) {
      messageApi.info('No hay partidos pendientes para sugerir con la temporada actual.');
    }
  };

  const updateAssistantSuggestion = (key: string, patch: Partial<AssistantSuggestion>) => {
    setAssistantSuggestions((current) => current.map((suggestion) => (
      suggestion.key === key ? { ...suggestion, ...patch } : suggestion
    )));
  };

  const saveAssistantSuggestions = useMutation({
    mutationFn: async () => {
      const accepted = assistantSuggestions.filter((suggestion) => suggestion.accepted);
      if (accepted.length === 0) throw new Error('No hay sugerencias aceptadas para guardar.');

      const plannedMatches: Match[] = [];
      for (const suggestion of accepted) {
        if (!suggestion.jornada || !suggestion.scheduled_date || !suggestion.court || !suggestion.time_str) {
          throw new Error('Todas las sugerencias aceptadas deben tener jornada, fecha, cancha y horario.');
        }
        const originalMatch = matches.find((match) => match.id === suggestion.matchId);
        if (!originalMatch) throw new Error('No se encontró uno de los partidos sugeridos.');
        const scheduleCheck = checkSchedulingConflicts({
          matches: [...matches, ...plannedMatches],
          teams,
          homeTeamId: originalMatch.home_team_id,
          awayTeamId: originalMatch.away_team_id,
          scheduledDate: suggestion.scheduled_date,
          jornada: suggestion.jornada,
          timeStr: suggestion.time_str,
          court: suggestion.court,
          excludeMatchId: suggestion.matchId,
        });
        if (scheduleCheck.blocking.length > 0) {
          throw new Error(scheduleCheck.blocking.join(' '));
        }
        plannedMatches.push({
          ...originalMatch,
          id: -originalMatch.id,
          jornada: suggestion.jornada,
          scheduled_date: suggestion.scheduled_date,
          court: suggestion.court,
          time_str: suggestion.time_str,
        });

        const { error } = await supabase
          .from('matches')
          .update({
            jornada: suggestion.jornada,
            scheduled_date: suggestion.scheduled_date,
            court: suggestion.court,
            time_str: suggestion.time_str,
            status: 'Programado',
          })
          .eq('id', suggestion.matchId);
        if (error) throw error;
      }
      return accepted.length;
    },
    onSuccess: async (count) => {
      qc.invalidateQueries({ queryKey: ['matches'] });
      await invalidatePublicCache({ seasonId });
      messageApi.success(`Se programaron ${count} partido(s).`);
      setAssistantOpen(false);
      setAssistantSuggestions([]);
    },
    onError: (error: Error) => messageApi.error(error.message),
  });

  const selectedTeamCalendar = teams.find((team) => team.id === selectedTeamCalendarId) ?? null;

  const teamCalendar = (() => {
    if (!selectedTeamCalendar) return { played: [] as TeamCalendarRow[], pendingIda: [] as TeamCalendarRow[], pendingVuelta: [] as TeamCalendarRow[] };

    const isPlayedStatus = (status: string) => status === 'Jugado' || status.startsWith('WO') || status.startsWith('W.O');
    const regularMatches = matches.filter((m) => !m.phase || m.phase === 'Fase Regular');
    const rows: TeamCalendarRow[] = [];

    teams
      .filter((team) => team.id !== selectedTeamCalendar.id)
      .forEach((opponent) => {
        const matchesBetween = regularMatches
          .filter((m) =>
            (m.home_team_id === selectedTeamCalendar.id && m.away_team_id === opponent.id) ||
            (m.home_team_id === opponent.id && m.away_team_id === selectedTeamCalendar.id)
          )
          .sort((a, b) => {
            const jornadaA = a.jornada ?? 9999;
            const jornadaB = b.jornada ?? 9999;
            if (jornadaA !== jornadaB) return jornadaA - jornadaB;
            return a.id - b.id;
          });

        const toRow = (match: Match, leg: LegLabel): TeamCalendarRow => ({
          key: `${match.id}-${leg}`,
          opponentName: opponent.name,
          leg,
          side: match.home_team_id === selectedTeamCalendar.id ? 'Local' : 'Visitante',
          jornada: match.jornada,
          scheduled_date: match.scheduled_date,
          time_str: match.time_str,
          court: match.court,
          status: match.status,
          home_score: match.home_score,
          away_score: match.away_score,
          homeTeamName: match.home_team?.name ?? null,
          awayTeamName: match.away_team?.name ?? null,
        });

        const persistedFirstLeg = matchesBetween.find((match) => match.vuelta === 'ida') ?? null;
        const persistedSecondLeg = matchesBetween.find((match) => match.vuelta === 'vuelta') ?? null;
        const firstLeg = persistedFirstLeg ?? matchesBetween[0] ?? null;
        const secondLeg = persistedSecondLeg ?? matchesBetween.find((match) => match.id !== firstLeg?.id) ?? null;

        if (firstLeg) {
          rows.push(toRow(firstLeg, 'Ida'));
        } else {
          rows.push({
            key: `${selectedTeamCalendar.id}-${opponent.id}-ida-missing`,
            opponentName: opponent.name,
            leg: 'Ida',
            side: 'Por definir',
            jornada: null,
            scheduled_date: null,
            time_str: null,
            court: null,
            status: 'Pendiente',
            home_score: null,
            away_score: null,
            homeTeamName: null,
            awayTeamName: null,
          });
        }

        if (secondLeg) {
          rows.push(toRow(secondLeg, 'Vuelta'));
        } else {
          const expectedSide: TeamSide = firstLeg
            ? firstLeg.home_team_id === selectedTeamCalendar.id
              ? 'Visitante'
              : 'Local'
            : 'Por definir';

          rows.push({
            key: `${selectedTeamCalendar.id}-${opponent.id}-vuelta-missing`,
            opponentName: opponent.name,
            leg: 'Vuelta',
            side: expectedSide,
            jornada: null,
            scheduled_date: null,
            time_str: null,
            court: null,
            status: 'Pendiente',
            home_score: null,
            away_score: null,
            homeTeamName: null,
            awayTeamName: null,
          });
        }
      });

    const byJornada = (a: TeamCalendarRow, b: TeamCalendarRow) => {
      const jornadaA = a.jornada ?? 9999;
      const jornadaB = b.jornada ?? 9999;
      if (jornadaA !== jornadaB) return jornadaA - jornadaB;
      return a.opponentName.localeCompare(b.opponentName);
    };

    return {
      played: rows.filter((row) => isPlayedStatus(row.status)).sort(byJornada),
      pendingIda: rows.filter((row) => row.leg === 'Ida' && !isPlayedStatus(row.status)).sort(byJornada),
      pendingVuelta: rows.filter((row) => row.leg === 'Vuelta' && !isPlayedStatus(row.status)).sort(byJornada),
    };
  })();

  const teamCourtBalance = (() => {
    if (!selectedTeamCalendar) return [] as CourtBalanceRow[];
    const balance = new Map<string, CourtBalanceRow>();
    const ensureRow = (court: string) => {
      if (!balance.has(court)) {
        balance.set(court, { court, ida: 0, vuelta: 0, total: 0 });
      }
      return balance.get(court)!;
    };

    for (const match of regularMatches) {
      if (match.home_team_id !== selectedTeamCalendar.id && match.away_team_id !== selectedTeamCalendar.id) continue;
      const court = match.court ?? 'Sin cancha';
      const leg = match.vuelta === 'vuelta' ? 'vuelta' : 'ida';
      const row = ensureRow(court);
      row[leg] += 1;
      row.total += 1;
    }

    for (const court of [...COURTS, 'Sin cancha']) ensureRow(court);

    return Array.from(balance.values()).sort((a, b) => {
      const order = [...COURTS, 'Sin cancha'];
      return order.indexOf(a.court) - order.indexOf(b.court);
    });
  })();

  const teamCalendarColumns = [
    {
      title: 'Rival',
      key: 'opponent',
      render: (_: unknown, row: TeamCalendarRow) => (
        <div>
          <Text strong>{row.opponentName}</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color={row.side === 'Local' ? 'blue' : row.side === 'Visitante' ? 'purple' : 'default'}>{row.side}</Tag>
            <Tag color={row.leg === 'Ida' ? 'gold' : 'cyan'}>{row.leg}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Detalle',
      key: 'detail',
      render: (_: unknown, row: TeamCalendarRow) => {
        const dateBits = [
          row.jornada ? `J${row.jornada}` : 'Jornada por definir',
          row.scheduled_date ? dayjs(row.scheduled_date).format('DD MMM') : 'Fecha por definir',
          row.time_str ? `${row.time_str} hrs` : null,
          row.court ?? 'Cancha por definir',
        ].filter(Boolean);

        return (
          <div>
            <div style={{ color: '#ccc', fontSize: 12 }}>{dateBits.join(' · ')}</div>
            {row.homeTeamName && row.awayTeamName && (
              <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                {row.homeTeamName} vs {row.awayTeamName}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Estatus',
      key: 'status',
      width: 150,
      render: (_: unknown, row: TeamCalendarRow) => (
        <span>
          <Tag color={statusColor[row.status] ?? 'default'}>{row.status}</Tag>
          {row.status === 'Jugado' && row.home_score !== null && row.away_score !== null && (
            <Text style={{ color: '#888', fontSize: 12 }}>{row.home_score}-{row.away_score}</Text>
          )}
        </span>
      ),
    },
  ];

  const renderTeamCalendarBlock = (title: string, rows: TeamCalendarRow[], emptyText: string) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Title level={5} style={{ color: '#fff', margin: 0 }}>{title}</Title>
        <Tag>{rows.length}</Tag>
      </div>
      <Table<TeamCalendarRow>
        dataSource={rows}
        columns={teamCalendarColumns}
        rowKey="key"
        size="small"
        pagination={false}
        locale={{ emptyText }}
        scroll={{ x: 620 }}
      />
    </div>
  );

  const courtBalanceColumns = [
    {
      title: 'Cancha',
      dataIndex: 'court',
      key: 'court',
      render: (value: string) => <Text strong>{value}</Text>,
    },
    { title: 'Ida', dataIndex: 'ida', key: 'ida', width: 80, align: 'center' as const },
    { title: 'Vuelta', dataIndex: 'vuelta', key: 'vuelta', width: 90, align: 'center' as const },
    { title: 'Total', dataIndex: 'total', key: 'total', width: 80, align: 'center' as const },
  ];

  const waText = (() => {
    if (!waJornada || !seasonId) return '';
    const mForJornada = matches.filter(m => m.jornada === waJornada);
    if (mForJornada.length === 0) return 'No hay partidos programados para esta jornada.';

    let txt = `🏆 *LIGA MUNICIPAL DE BÁSQUETBOL - JORNADA ${waJornada}* 🏆\n\n`;

    const byDate: Record<string, Match[]> = {};
    mForJornada.forEach(m => {
      let dFormat = dayjs(m.scheduled_date || '9999-12-31').locale('es');
      if (m.scheduled_date && !m.scheduled_date.includes('T')) {
        dFormat = dayjs(m.scheduled_date + 'T12:00:00').locale('es');
      }
      const dateKey = m.scheduled_date ? dFormat.format('dddd, DD [de] MMMM [de] YYYY') : 'Fecha por definir';
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(m);
    });

    Object.keys(byDate).sort().forEach(dateKey => {
      if (dateKey !== 'Fecha por definir') {
        const capitalizedDate = dateKey.charAt(0).toUpperCase() + dateKey.slice(1);
        txt += `🗓 *${capitalizedDate}*\n`;
      } else {
        txt += `🗓 *${dateKey}*\n`;
      }

      const matchesOnDate = byDate[dateKey];
      const byCourt: Record<string, Match[]> = {};
      matchesOnDate.forEach(m => {
        const courtKey = m.court || 'Cancha por definir';
        if (!byCourt[courtKey]) byCourt[courtKey] = [];
        byCourt[courtKey].push(m);
      });

      Object.keys(byCourt).sort().forEach(courtKey => {
        txt += `📍 _${courtKey}_\n`;
        const matchesOnCourt = byCourt[courtKey];
        matchesOnCourt.sort((a,b) => (a.time_str || '').localeCompare(b.time_str || ''));
        
        matchesOnCourt.forEach(m => {
          const time = m.time_str || 'Hora por definir';
          let statusText = '';
          if (m.status === 'Pendiente') statusText = ' ⏳ (Pendiente/Reprogramado)';
          else if (m.status.includes('WO')) statusText = ` 🚫 (${m.status})`;
          else if (m.status === 'Jugado') statusText = ` ✅ (Jugado: ${m.home_score}-${m.away_score})`;

          txt += `🏀 ${time} | ${m.home_team?.name || '?'} vs ${m.away_team?.name || '?'}${statusText}\n`;
        });
        txt += `\n`;
      });
    });
    
    return txt.trim();
  })();

  const [jornadaFilter, setJornadaFilter] = useState<number | 'all'>('all');
  const [liguillaModalOpen, setLiguillaModalOpen] = useState(false);

  const displayedMatches = matches.filter(m => {
    let passStatus = false;
    if (filterStatus === 'Todos') passStatus = true;
    else if (filterStatus === 'Jugado') passStatus = m.status === 'Jugado' || m.status.startsWith('WO');
    else passStatus = m.status === filterStatus;

    let passJornada = false;
    if (jornadaFilter === 'all') passJornada = true;
    else passJornada = m.jornada === jornadaFilter;

    const passTeam = teamFilterIds.length === 0 || teamFilterIds.includes(m.home_team_id) || teamFilterIds.includes(m.away_team_id);
    const passVuelta = vueltaFilter === 'all' || m.vuelta === vueltaFilter;
    const passCourt = courtFilter === 'all' || m.court === courtFilter;
    let passCalendarState = true;
    if (calendarStateFilter === 'played') {
      passCalendarState = isCompletedStatus(m.status);
    } else if (calendarStateFilter === 'pending_no_date') {
      passCalendarState = m.status === 'Pendiente' && !m.scheduled_date;
    } else if (calendarStateFilter === 'scheduled_no_result') {
      passCalendarState = m.status === 'Programado' && !isCompletedStatus(m.status);
    }

    return passStatus && passJornada && passTeam && passVuelta && passCourt && passCalendarState;
  });

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ color: '#FAAD14', margin: 0 }}>📅 Calendario</Title>
          <SeasonSelector value={seasonId} onChange={setSeasonId} style={{ marginTop: 8 }} />
          {seasonId && <Text style={{ color: '#888', fontSize: 12, display: 'block', marginTop: 4 }}>
            {matches.length} partidos totales · {teams.length} equipos activos
          </Text>}
          {seasonId && (
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, maxWidth: 920 }}>
              <Select
                mode="multiple"
                size="small"
                allowClear
                maxTagCount="responsive"
                placeholder="Equipo"
                value={teamFilterIds}
                onChange={setTeamFilterIds}
                options={teamOptions}
                optionFilterProp="label"
              />
              <Select
                size="small"
                value={vueltaFilter}
                onChange={setVueltaFilter}
                options={[
                  { label: 'Todas las vueltas', value: 'all' },
                  { label: 'Ida', value: 'ida' },
                  { label: 'Vuelta', value: 'vuelta' },
                  { label: 'Liguilla', value: 'liguilla' },
                ]}
              />
              <Select
                size="small"
                value={calendarStateFilter}
                onChange={setCalendarStateFilter}
                options={[
                  { label: 'Todos los estados', value: 'all' },
                  { label: 'Jugado', value: 'played' },
                  { label: 'Pendiente sin fecha', value: 'pending_no_date' },
                  { label: 'Programado sin resultado', value: 'scheduled_no_result' },
                ]}
              />
              <Select
                size="small"
                value={courtFilter}
                onChange={setCourtFilter}
                options={[
                  { label: 'Todas las canchas', value: 'all' },
                  ...COURTS.map((court) => ({ label: court, value: court })),
                ]}
              />
              <Select size="small" value={filterStatus} onChange={setFilterStatus} options={[
                { label: 'Status: todos', value: 'Todos' },
                { label: 'Pendientes', value: 'Pendiente' },
                { label: 'Programados', value: 'Programado' },
                { label: 'Jugados / W.O.', value: 'Jugado' }
              ]} />
              <Select size="small" value={jornadaFilter} onChange={setJornadaFilter} options={[
                { label: 'Todas las jornadas', value: 'all' },
                ...uniqueJornadas.map(j => ({ label: `Jornada ${j}`, value: j }))
              ]} />
            </div>
          )}
        </div>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} disabled={!seasonId || teams.length < 2}
            onClick={() => setModalOpen(true)}>
            Nuevo Partido
          </Button>
          <Button onClick={() => setMissingModalOpen(true)} disabled={!seasonId || teams.length < 2}>
            Partidos Faltantes
          </Button>
          <Button
            onClick={() => {
              setAssistantJornada(nextSuggestedJornada);
              setAssistantDate('');
              setAssistantSuggestions([]);
              setAssistantOpen(true);
            }}
            disabled={!seasonId || teams.length < 2}
            style={{ borderColor: '#13c2c2', color: '#13c2c2', fontWeight: 600 }}
          >
            Asistente de Jornada
          </Button>
          <Button
            icon={<WhatsAppOutlined />}
            style={{ color: '#25D366', borderColor: '#25D366' }}
            disabled={!seasonId || matches.length === 0}
            onClick={() => {
              const jornadas = matches.map((m) => m.jornada).filter((j): j is number => typeof j === 'number');
              const latest = jornadas.length > 0 ? Math.max(...jornadas) : null;
              setWaJornada(latest);
              setWaModalOpen(true);
            }}
          >
            WhatsApp
          </Button>
          <Button
            onClick={() => {
              modal.confirm({
                title: 'Generar Rol Automático',
                content: 'Esto creará un torneo de 2 vueltas todos contra todos (ida y vuelta), asignando las canchas desde las 06:00 PM. Los partidos formarán "Fase Regular".',
                okText: 'Sí, generar', cancelText: 'Cancelar',
                onOk: () => autoGenerate.mutate(),
              });
            }}
            loading={autoGenerate.isPending}
            disabled={!seasonId || teams.length < 2}
          >
            Rol Básico (Auto)
          </Button>
          <Button
            onClick={() => setLiguillaModalOpen(true)}
            disabled={!seasonId || matches.length === 0}
            style={{ borderColor: '#FAAD14', color: '#FAAD14', fontWeight: 600 }}
          >
            🔥 Arrancar Liguilla
          </Button>
        </Space>
      </div>

      {!seasonId ? (
        <Text style={{ color: '#555' }}>Selecciona una temporada.</Text>
      ) : teams.length < 2 && matches.length === 0 ? (
        <Text style={{ color: '#ff4d4f' }}>⚠ Se necesitan al menos 2 equipos activos para crear partidos.</Text>
      ) : (
        <>
          <div style={{ marginBottom: 18, padding: 16, background: '#101010', border: '1px solid #2a2a2a', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <Title level={5} style={{ color: '#FAAD14', margin: 0 }}>Progreso de temporada regular</Title>
                <Text style={{ color: '#888', fontSize: 12 }}>
                  Calculado con equipos activos y partidos de fase regular registrados.
                </Text>
              </div>
              <div style={{ minWidth: 180 }}>
                <Progress
                  percent={regularProgressPercent}
                  strokeColor="#52c41a"
                  railColor="#2a2a2a"
                  format={(percent) => `${percent}%`}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {progressBox(
                'Jornada actual',
                `${currentRegularJornada ?? 0} / ${totalRegularJornadasExpected}`,
                `${scheduledJornadas.length} jornadas con partidos registrados`,
                '#1677ff'
              )}
              {progressBox(
                'Partidos jugados',
                `${completedRegularMatches.length} / ${totalRegularMatchesExpected}`,
                `${regularMatches.length} partidos regulares registrados`,
                '#52c41a'
              )}
              {progressBox(
                'Avance',
                `${regularProgressPercent}%`,
                teams.length >= 2 ? `${teams.length} equipos activos` : 'Sin suficientes equipos activos',
                '#faad14'
              )}
              {progressBox(
                'Faltantes reales',
                String(regularPairAudit.missing),
                'Cruces de ida/vuelta todavía no registrados',
                '#ff7875'
              )}
              {progressBox(
                'Conflictos',
                String(regularPairAudit.conflicts),
                'Parejas con localía duplicada o más de 2 juegos',
                '#13c2c2'
              )}
            </div>
          </div>

          <div style={{ marginBottom: 24, padding: 16, background: '#111', border: '1px solid #2a2a2a', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <Title level={5} style={{ color: '#FAAD14', margin: 0 }}>Calendario por equipo</Title>
                <Text style={{ color: '#888', fontSize: 12 }}>
                  Selecciona un equipo para ver sus juegos jugados y pendientes separados por ida y vuelta.
                </Text>
              </div>
              <Select
                allowClear
                showSearch
                placeholder="Selecciona equipo"
                value={selectedTeamCalendarId}
                onChange={(value) => setSelectedTeamCalendarId(value ?? null)}
                options={teamOptions}
                optionFilterProp="label"
                style={{ width: 280, maxWidth: '100%' }}
              />
            </div>

            {!selectedTeamCalendar ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span style={{ color: '#888' }}>Selecciona un equipo para abrir el resumen.</span>}
              />
            ) : (
              <>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div style={{ minWidth: 150, padding: '10px 12px', border: '1px solid #52c41a55', borderRadius: 8, background: '#0d1710' }}>
                    <div style={{ color: '#52c41a', fontSize: 12, fontWeight: 700 }}>Jugados</div>
                    <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{teamCalendar.played.length}</div>
                  </div>
                  <div style={{ minWidth: 150, padding: '10px 12px', border: '1px solid #faad1455', borderRadius: 8, background: '#19150a' }}>
                    <div style={{ color: '#faad14', fontSize: 12, fontWeight: 700 }}>Pendientes ida</div>
                    <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{teamCalendar.pendingIda.length}</div>
                  </div>
                  <div style={{ minWidth: 150, padding: '10px 12px', border: '1px solid #13c2c255', borderRadius: 8, background: '#081819' }}>
                    <div style={{ color: '#13c2c2', fontSize: 12, fontWeight: 700 }}>Pendientes vuelta</div>
                    <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>{teamCalendar.pendingVuelta.length}</div>
                  </div>
                </div>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Title level={5} style={{ color: '#fff', margin: 0 }}>Balance de sedes</Title>
                    <Text style={{ color: '#888', fontSize: 12 }}>Ida / vuelta por cancha</Text>
                  </div>
                  <Table<CourtBalanceRow>
                    dataSource={teamCourtBalance}
                    columns={courtBalanceColumns}
                    rowKey="court"
                    size="small"
                    pagination={false}
                    scroll={{ x: 420 }}
                  />
                </div>
                {renderTeamCalendarBlock('Partidos ya jugados', teamCalendar.played, 'Este equipo todavía no tiene partidos jugados.')}
                {renderTeamCalendarBlock('Partidos pendientes de la ida', teamCalendar.pendingIda, 'No hay pendientes de ida para este equipo.')}
                {renderTeamCalendarBlock('Partidos pendientes de la vuelta', teamCalendar.pendingVuelta, 'No hay pendientes de vuelta para este equipo.')}
              </>
            )}
          </div>

          <Title level={5} style={{ color: '#fff', marginBottom: 16 }}>Listado de Partidos</Title>
          <Table dataSource={displayedMatches} columns={cols} rowKey="id" loading={isLoading} size="small"
            pagination={{ pageSize: 20, showSizeChanger: false }} scroll={{ x: 480 }} />
        </>
      )}

      <Modal title="Nuevo Partido" open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()} confirmLoading={createMatch.isPending} okText="Crear" cancelText="Cancelar">
        <Form form={form} layout="vertical" onFinish={(v) => submitCreateMatch(v)}>
          <Form.Item name="jornada" label="Jornada" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="home_team_id" label="Equipo Local" rules={[{ required: true }]}>
            <Select options={teamOptions} showSearch />
          </Form.Item>
          <Form.Item name="away_team_id" label="Equipo Visitante" rules={[{ required: true }]}>
            <Select options={teamOptions} showSearch />
          </Form.Item>
          <Form.Item name="phase" label="Fase" initialValue="Fase Regular">
            <Select options={PHASES.map((p) => ({ label: p, value: p }))} />
          </Form.Item>
          <Form.Item name="court" label="Cancha">
            <Select options={COURTS.map((c) => ({ label: c, value: c }))} />
          </Form.Item>
          <Form.Item name="time_str" label="Horario">
            <Select options={TIMES.map((t) => ({ label: t, value: t }))} />
          </Form.Item>
          <Form.Item
            name="scheduled_date"
            label="Fecha"
            getValueProps={(value) => ({ value: value ?? '' })}
          >
            <input type="date" style={{ width: '100%', padding: '6px 11px', background: '#141414', border: '1px solid #424242', borderRadius: 6, color: '#fff', colorScheme: 'dark' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Generar Mensaje para WhatsApp" open={waModalOpen} onCancel={() => setWaModalOpen(false)}
        footer={null} width={500}>
        <div style={{ marginBottom: 16 }}>
          <Text style={{ display: 'block', marginBottom: 8 }}>Selecciona la jornada a compartir:</Text>
          <Select 
            value={waJornada} 
            onChange={setWaJornada} 
            style={{ width: '100%' }}
            options={uniqueJornadas.map(j => ({ label: `Jornada ${j}`, value: j }))}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <textarea
            readOnly
            value={waText}
            style={{ width: '100%', height: 300, padding: 12, background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 8, fontFamily: 'monospace', resize: 'none' }}
          />
          <Button 
            type="primary" 
            icon={<CopyOutlined />} 
            style={{ position: 'absolute', top: 12, right: 12 }}
            onClick={() => {
              navigator.clipboard.writeText(waText);
              messageApi.success('Mensaje copiado al portapapeles');
            }}
          >
            Copiar
          </Button>
        </div>
        <div style={{ marginTop: 16 }}>
          <Button type="primary" block style={{ background: '#25D366', borderColor: '#25D366' }}
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank')}
          >
            Abrir WhatsApp Web
          </Button>
        </div>
      </Modal>

      <Modal
        title="Asistente de Jornada"
        open={assistantOpen}
        onCancel={() => setAssistantOpen(false)}
        width={1120}
        footer={[
          <Button key="cancel" onClick={() => setAssistantOpen(false)}>Cerrar</Button>,
          <Button key="generate" onClick={generateAssistantSuggestions}>Generar sugerencias</Button>,
          <Button
            key="save"
            type="primary"
            loading={saveAssistantSuggestions.isPending}
            onClick={() => saveAssistantSuggestions.mutate()}
            disabled={assistantSuggestions.filter((suggestion) => suggestion.accepted).length === 0}
          >
            Guardar aceptados
          </Button>,
        ]}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 14 }}>
          <div>
            <Text style={{ color: '#888', fontSize: 12 }}>Jornada</Text>
            <InputNumber
              min={1}
              value={assistantJornada}
              onChange={(value) => setAssistantJornada(typeof value === 'number' ? value : null)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
          <div>
            <Text style={{ color: '#888', fontSize: 12 }}>Fecha</Text>
            <input
              type="date"
              value={assistantDate}
              onChange={(event) => setAssistantDate(event.target.value)}
              style={{ width: '100%', marginTop: 4, padding: '6px 11px', background: '#141414', border: '1px solid #424242', borderRadius: 6, color: '#fff', colorScheme: 'dark' }}
            />
          </div>
          <div>
            <Text style={{ color: '#888', fontSize: 12 }}>Canchas</Text>
            <Select
              mode="multiple"
              value={assistantCourts}
              onChange={setAssistantCourts}
              options={COURTS.map((court) => ({ label: court, value: court }))}
              style={{ width: '100%', marginTop: 4 }}
              maxTagCount="responsive"
            />
          </div>
          <div>
            <Text style={{ color: '#888', fontSize: 12 }}>Horarios</Text>
            <Select
              mode="multiple"
              value={assistantTimes}
              onChange={setAssistantTimes}
              options={TIMES.map((time) => ({ label: time, value: time }))}
              style={{ width: '100%', marginTop: 4 }}
              maxTagCount="responsive"
            />
          </div>
          <div>
            <Text style={{ color: '#888', fontSize: 12 }}>Máximo partidos</Text>
            <InputNumber
              min={1}
              max={30}
              value={assistantMaxMatches}
              onChange={(value) => setAssistantMaxMatches(value ?? 1)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
        </div>

        <Table<AssistantSuggestion>
          dataSource={assistantSuggestions}
          rowKey="key"
          size="small"
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1120, y: 460 }}
          locale={{ emptyText: 'Configura la jornada y genera sugerencias.' }}
          columns={[
            {
              title: 'Usar',
              key: 'accepted',
              width: 70,
              render: (_: unknown, record) => (
                <input
                  type="checkbox"
                  checked={record.accepted}
                  disabled={record.blocking.length > 0}
                  onChange={(event) => updateAssistantSuggestion(record.key, { accepted: event.target.checked })}
                />
              ),
            },
            {
              title: 'Partido',
              key: 'match',
              width: 260,
              render: (_: unknown, record) => (
                <div>
                  <Text strong>{record.homeName}</Text> <span style={{ color: '#777' }}>vs</span> <Text strong>{record.awayName}</Text>
                  <div style={{ marginTop: 6 }}>
                    <Tag>{record.vuelta ? legLabels[record.vuelta] : 'Regular'}</Tag>
                    <Tag color="cyan">{record.reason}</Tag>
                  </div>
                </div>
              ),
            },
            {
              title: 'Jornada',
              key: 'jornada',
              width: 90,
              render: (_: unknown, record) => (
                <InputNumber
                  min={1}
                  value={record.jornada}
                  onChange={(value) => updateAssistantSuggestion(record.key, { jornada: value ?? record.jornada })}
                  style={{ width: 70 }}
                />
              ),
            },
            {
              title: 'Cancha',
              key: 'court',
              width: 180,
              render: (_: unknown, record) => (
                <Select
                  value={record.court}
                  onChange={(value) => updateAssistantSuggestion(record.key, { court: value })}
                  options={COURTS.map((court) => ({ label: court, value: court }))}
                  style={{ width: 160 }}
                  placeholder="Cancha"
                />
              ),
            },
            {
              title: 'Hora',
              key: 'time',
              width: 140,
              render: (_: unknown, record) => (
                <Select
                  value={record.time_str}
                  onChange={(value) => updateAssistantSuggestion(record.key, { time_str: value })}
                  options={TIMES.map((time) => ({ label: time, value: time }))}
                  style={{ width: 120 }}
                  placeholder="Hora"
                />
              ),
            },
            {
              title: 'Alertas',
              key: 'alerts',
              render: (_: unknown, record) => (
                <Space orientation="vertical" size={4}>
                  {record.blocking.map((item) => <Tag key={item} color="red">{item}</Tag>)}
                  {record.warnings.map((item) => <Tag key={item} color="gold">{item}</Tag>)}
                  {record.blocking.length === 0 && record.warnings.length === 0 && <Tag color="green">Sin alertas</Tag>}
                </Space>
              ),
            },
          ]}
        />
      </Modal>

      {editingMatch && (
        <AdminEditForm
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSaved={() => setEditingMatch(null)}
        />
      )}

      {seasonId && liguillaModalOpen && (
        <LiguillaModal
          open={liguillaModalOpen}
          onClose={() => setLiguillaModalOpen(false)}
          seasonId={seasonId}
          matches={matches}
          teams={teams}
        />
      )}
      {seasonId && missingModalOpen && (
        <MissingMatchesModal
          open={missingModalOpen}
          onClose={() => setMissingModalOpen(false)}
          seasonId={seasonId}
          matches={matches}
          teams={teams}
        />
      )}
    </AdminLayout>
  );
}
