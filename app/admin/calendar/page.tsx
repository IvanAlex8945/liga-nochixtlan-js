'use client';

import AdminLayout from '@/app/components/AdminLayout';
import {
  Table, Button, Modal, Form, Select, InputNumber, Tag, Typography, Space, message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import SeasonSelector from '@/app/components/SeasonSelector';
import AdminEditForm, { EditableMatch } from '@/app/components/AdminEditForm';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const PHASES = ['Fase Regular', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Tercer Lugar', 'Final'];
const COURTS = ['Cancha Bicentenario', 'Cancha Techada', 'Cancha III'];
const TIMES = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

interface Match {
  id: number; jornada: number; phase: string; status: string;
  home_team_id: number; away_team_id: number; home_score: number | null; away_score: number | null;
  scheduled_date: string | null; time_str: string | null; court: string | null;
  home_team?: { name: string }; away_team?: { name: string };
}

const statusColor: Record<string, string> = {
  Programado: 'default', Jugado: 'green', 'WO Local': 'orange', 'WO Visitante': 'orange', 'WO Doble': 'red',
};

export default function CalendarPage() {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [editingMatch, setEditingMatch] = useState<EditableMatch | null>(null);

  useEffect(() => {
    supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
      .then(({ data }) => { if (data) setSeasonId(data.id); });
  }, []);

  const { data: teams = [] } = useQuery({
    queryKey: ['teams-active', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data } = await supabase.from('teams').select('id, name').eq('season_id', seasonId!).eq('status', 'Activo');
      return data ?? [];
    },
  });

  const { data: matches = [], isLoading } = useQuery<Match[]>({
    queryKey: ['matches', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`id, jornada, phase, status, home_team_id, away_team_id, home_score, away_score, scheduled_date, time_str, court,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name)`)
        .eq('season_id', seasonId!)
        .order('jornada', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const createMatch = useMutation({
    mutationFn: async (v: any) => {
      const { error } = await supabase.from('matches').insert({ ...v, season_id: seasonId!, status: 'Programado' });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['matches'] }); message.success('Partido creado'); setModalOpen(false); form.resetFields(); },
    onError: (e: Error) => message.error(e.message),
  });

  const autoGenerate = useMutation({
    mutationFn: async () => {
      if (teams.length < 2) throw new Error('Se necesitan al menos 2 equipos');
      const teamIds = teams.map((t) => t.id);
      // If odd, add a dummy 'bye' team
      if (teamIds.length % 2 !== 0) teamIds.push(-1);

      const numRounds = teamIds.length - 1;
      const halfSize = teamIds.length / 2;
      const newMatches = [];
      let currentJornada = 1;

      // 2 Vueltas (Ida y Vuelta)
      for (let vuelta = 0; vuelta < 2; vuelta++) {
        const tIds = [...teamIds];
        for (let round = 0; round < numRounds; round++) {
          let matchesThisRound = 0;
          for (let i = 0; i < halfSize; i++) {
            const home = vuelta === 0 ? tIds[i] : tIds[teamIds.length - 1 - i];
            const away = vuelta === 0 ? tIds[teamIds.length - 1 - i] : tIds[i];

            if (home !== -1 && away !== -1) {
              // Assign chronological times/courts round-robin
              const courtIndex = matchesThisRound % 3;
              const timeIndex = Math.floor(matchesThisRound / 3) % 4;

              newMatches.push({
                season_id: seasonId!,
                jornada: currentJornada,
                phase: 'Fase Regular',
                status: 'Programado',
                home_team_id: home,
                away_team_id: away,
                court: COURTS[courtIndex],
                time_str: TIMES[timeIndex],
              });
              matchesThisRound++;
            }
          }
          currentJornada++;
          tIds.splice(1, 0, tIds.pop()!); // Rotate array leaving first element fixed
        }
      }

      const { error } = await supabase.from('matches').insert(newMatches);
      if (error) throw error;
      return newMatches.length;
    },
    onSuccess: (count) => { qc.invalidateQueries({ queryKey: ['matches'] }); message.success(`Se generaron ${count} partidos automáticamente`); },
    onError: (e: Error) => message.error(e.message),
  });

  const deleteMatch = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from('matches').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['matches'] }); message.success('Partido eliminado'); },
    onError: (e: Error) => message.error(e.message),
  });

  const cols = [
    { title: 'J', dataIndex: 'jornada', key: 'jornada', width: 44, align: 'center' as const },
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
    { title: 'Fase', dataIndex: 'phase', key: 'phase', width: 110 },
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
              Modal.confirm({
                title: '¿Eliminar partido?', okText: 'Eliminar', okType: 'danger', cancelText: 'Cancelar',
                onOk: () => deleteMatch.mutate(m.id),
              })
            } />
          )}
        </Space>
      ),
    },
  ];

  const teamOptions = teams.map((t) => ({ label: t.name, value: t.id }));

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ color: '#FAAD14', margin: 0 }}>📅 Calendario</Title>
          <SeasonSelector value={seasonId} onChange={setSeasonId} style={{ marginTop: 8 }} />
          {seasonId && <Text style={{ color: '#888', fontSize: 12, display: 'block', marginTop: 4 }}>
            {matches.length} partidos · {teams.length} equipos activos
          </Text>}
        </div>
        <Space wrap>
          <Button
            onClick={() => {
              Modal.confirm({
                title: 'Generar Rol Automático',
                content: 'Esto creará un torneo de 2 vueltas todos contra todos (ida y vuelta), asignando la Cancha Bicentenario, Techada y Cancha III desde las 18:00 hrs. Los partidos se añadirán al final del calendario.',
                okText: 'Sí, generar', cancelText: 'Cancelar',
                onOk: () => autoGenerate.mutate(),
              });
            }}
            loading={autoGenerate.isPending}
            disabled={!seasonId || teams.length < 2}
          >
            Generar Rol (Auto)
          </Button>
          <Button type="primary" icon={<PlusOutlined />} disabled={!seasonId || teams.length < 2}
            onClick={() => setModalOpen(true)}>
            Nuevo Partido
          </Button>
        </Space>
      </div>

      {!seasonId ? (
        <Text style={{ color: '#555' }}>Selecciona una temporada.</Text>
      ) : teams.length < 2 && matches.length === 0 ? (
        <Text style={{ color: '#ff4d4f' }}>⚠ Se necesitan al menos 2 equipos activos para crear partidos.</Text>
      ) : (
        <Table dataSource={matches} columns={cols} rowKey="id" loading={isLoading} size="small"
          pagination={{ pageSize: 20, showSizeChanger: false }} scroll={{ x: 480 }} />
      )}

      <Modal title="Nuevo Partido" open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()} confirmLoading={createMatch.isPending} okText="Crear" cancelText="Cancelar">
        <Form form={form} layout="vertical" onFinish={(v) => createMatch.mutate(v)}>
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
          <Form.Item name="scheduled_date" label="Fecha">
            <input type="date" style={{ width: '100%', padding: '6px 11px', background: '#141414', border: '1px solid #424242', borderRadius: 6, color: '#fff', colorScheme: 'dark' }} />
          </Form.Item>
        </Form>
      </Modal>

      {editingMatch && (
        <AdminEditForm
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSaved={() => setEditingMatch(null)}
        />
      )}
    </AdminLayout>
  );
}
