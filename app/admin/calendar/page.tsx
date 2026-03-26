'use client';

import AdminLayout from '@/app/components/AdminLayout';
import {
  Table, Button, Modal, Form, Select, InputNumber, Tag, Typography, Space, message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, WhatsAppOutlined, CopyOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import SeasonSelector from '@/app/components/SeasonSelector';
import AdminEditForm, { EditableMatch } from '@/app/components/AdminEditForm';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const PHASES = ['Fase Regular', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Tercer Lugar', 'Final'];
const COURTS = ['Cancha Bicentenario', 'Cancha Techada', 'Cancha III'];
const TIMES = ['06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'];

interface Match {
  id: number; jornada: number; phase: string; status: string;
  home_team_id: number; away_team_id: number; home_score: number | null; away_score: number | null;
  scheduled_date: string | null; time_str: string | null; court: string | null;
  home_team?: { name: string }; away_team?: { name: string };
}

const statusColor: Record<string, string> = {
  Programado: 'default', Pendiente: 'processing', Jugado: 'green', 'WO Local': 'orange', 'WO Visitante': 'orange', 'WO Doble': 'red',
};

export default function CalendarPage() {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [editingMatch, setEditingMatch] = useState<EditableMatch | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waJornada, setWaJornada] = useState<number | null>(null);

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

  const uniqueJornadas = Array.from(new Set(matches.map(m => m.jornada))).sort((a,b) => a - b);

  const waText = (() => {
    if (!waJornada || !seasonId) return '';
    const mForJornada = matches.filter(m => m.jornada === waJornada).sort((a,b) => {
      const dateA = a.scheduled_date || '9999-12-31';
      const dateB = b.scheduled_date || '9999-12-31';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.time_str || '').localeCompare(b.time_str || '');
    });
    if (mForJornada.length === 0) return 'No hay partidos programados para esta jornada.';

    let txt = `🏆 *LIGA NOCHIXTLÁN - JORNADA ${waJornada}* 🏆\n\n`;
    mForJornada.forEach(m => {
       txt += `⚽ *${m.home_team?.name || '?'}* vs *${m.away_team?.name || '?'}*\n`;
       if (m.scheduled_date) {
         let dFormat = dayjs(m.scheduled_date);
         if (!m.scheduled_date.includes('T')) dFormat = dayjs(m.scheduled_date + 'T12:00:00');
         const d = dFormat.format('dddd DD [de] MMMM');
         txt += `🗓 Fecha: ${d.charAt(0).toUpperCase() + d.slice(1)}\n`;
       }
       if (m.time_str) txt += `⏰ Hora: ${m.time_str}\n`;
       if (m.court) txt += `🏟️ Cancha: ${m.court}\n`;
       txt += `\n`;
    });
    return txt.trim();
  })();

  const displayedMatches = matches.filter(m => {
    if (filterStatus === 'Todos') return true;
    if (filterStatus === 'Jugado') return m.status === 'Jugado' || m.status.startsWith('WO');
    return m.status === filterStatus;
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
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#888', fontSize: 13 }}>Filtro rápido:</Text>
              <Select size="small" value={filterStatus} onChange={setFilterStatus} style={{ width: 140 }} options={[
                { label: 'Todos', value: 'Todos' },
                { label: '⏳ Pendientes', value: 'Pendiente' },
                { label: '📌 Programados', value: 'Programado' },
                { label: '✅ Jugados / W.O.', value: 'Jugado' }
              ]} />
            </div>
          )}
        </div>
        <Space wrap>
          <Button
            icon={<WhatsAppOutlined />}
            style={{ color: '#25D366', borderColor: '#25D366' }}
            disabled={!seasonId || matches.length === 0}
            onClick={() => {
              const latest = matches.length > 0 ? Math.max(...matches.map(m => m.jornada)) : null;
              setWaJornada(latest);
              setWaModalOpen(true);
            }}
          >
            WhatsApp
          </Button>
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
        <Table dataSource={displayedMatches} columns={cols} rowKey="id" loading={isLoading} size="small"
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
              message.success('Mensaje copiado al portapapeles');
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
