'use client';

import AdminLayout from '@/app/components/AdminLayout';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Typography, Space, message, Collapse,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserAddOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import SeasonSelector from '@/app/components/SeasonSelector';

const { Title, Text } = Typography;
const CATEGORIES = ['Libre', 'Veteranos', 'Femenil', '3ra'];

interface Team { id: number; name: string; category: string; status: string; permissions_used: number; defaults_count: number; season_id: number; }
interface Player { id: number; team_id: number; name: string; number: number | null; is_active: boolean; }

export default function TeamsPage() {
  const qc = useQueryClient();
  const [teamForm] = Form.useForm();
  const [playerForm] = Form.useForm();
  const [teamModal, setTeamModal] = useState(false);
  const [playerModal, setPlayerModal] = useState<number | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);

  // Auto-select active season on load
  useEffect(() => {
    supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
      .then(({ data }) => { if (data) setSeasonId(data.id); });
  }, []);

  const { data: selectedSeason } = useQuery({
    queryKey: ['season-detail', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data } = await supabase.from('seasons').select('id, name, category').eq('id', seasonId!).single();
      return data;
    },
  });

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ['teams', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').eq('season_id', seasonId!).order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ['players', seasonId],
    enabled: teams.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('players').select('*').in('team_id', teams.map((t) => t.id));
      return data ?? [];
    },
  });

  const saveTeam = useMutation({
    mutationFn: async (v: Partial<Team>) => {
      const payload = { ...v, season_id: seasonId!, status: v.status ?? 'Activo' };
      if (editingTeam) { const { error } = await supabase.from('teams').update(payload).eq('id', editingTeam.id); if (error) throw error; }
      else { const { error } = await supabase.from('teams').insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); message.success(editingTeam ? 'Equipo actualizado' : 'Equipo creado'); setTeamModal(false); setEditingTeam(null); teamForm.resetFields(); },
    onError: (e: Error) => message.error(e.message),
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from('teams').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams', 'players'] }); message.success('Equipo y sus datos eliminados'); },
    onError: (e: Error) => message.error(e.message),
  });

  const savePlayer = useMutation({
    mutationFn: async (v: { name: string; number: number }) => {
      const activeCount = players.filter((p) => p.team_id === playerModal && p.is_active).length;
      if (activeCount >= 12) {
        throw new Error('Límite excedido: El equipo ya tiene 12 jugadores activos permitidos.');
      }
      const { error } = await supabase.from('players').insert({ ...v, team_id: playerModal, category: selectedSeason?.category ?? 'Libre', is_active: true });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['players'] }); message.success('Jugador agregado'); playerForm.resetFields(); },
    onError: (e: Error) => message.error(e.message),
  });

  const togglePlayer = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => { await supabase.from('players').update({ is_active }).eq('id', id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players'] }),
  });

  const deletePlayer = useMutation({
    mutationFn: async (player: Player) => {
      const { error } = await supabase.from('players').delete().eq('id', player.id);
      if (error) {
        // 23503 is PostgreSQL code for foreign_key_violation
        if (error.code === '23503') {
          const { error: updErr } = await supabase.from('players').update({ is_active: false }).eq('id', player.id);
          if (updErr) throw updErr;
          return 'soft-deleted';
        }
        throw error;
      }
      return 'deleted';
    },
    onSuccess: (status) => {
      qc.invalidateQueries({ queryKey: ['players'] });
      if (status === 'soft-deleted') {
        message.info('El jugador tiene estadísticas guardadas. Fue marcado como Baja (Inactivo) para no afectar el historial del equipo.', 5);
      } else {
        message.success('Jugador eliminado permanentemente');
      }
    },
    onError: (e: Error) => message.error(e.message),
  });

  const teamCols = [
    {
      title: 'Equipo', dataIndex: 'name', key: 'name',
      render: (v: string, row: Team) => (
        <span>
          <Text strong>{v}</Text>
          {row.status !== 'Activo' && <Tag color="red" style={{ marginLeft: 6 }}>{row.status}</Tag>}
          {row.defaults_count >= 4 && <Tag color="orange" style={{ marginLeft: 4 }}>≥4 WO</Tag>}
        </span>
      ),
    },
    { title: 'Categoría', dataIndex: 'category', key: 'category', width: 100 },
    { title: 'Permisos', dataIndex: 'permissions_used', key: 'permissions_used', width: 85, align: 'center' as const },
    { title: 'WO', dataIndex: 'defaults_count', key: 'defaults_count', width: 55, align: 'center' as const },
    {
      title: '', key: 'actions', width: 130,
      render: (_: unknown, row: Team) => (
        <Space>
          <Button size="small" icon={<UserAddOutlined />} onClick={() => setPlayerModal(row.id)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingTeam(row); teamForm.setFieldsValue(row); setTeamModal(true); }} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() =>
            Modal.confirm({
              title: `¿Eliminar "${row.name}"?`,
              content: (
                <span>
                  Se eliminarán en cascada:<br />
                  <b>• Todos los jugadores del equipo</b><br />
                  <b>• Todas las estadísticas de partidos</b><br />
                  Esta acción no se puede deshacer.
                </span>
              ),
              okText: 'Sí, eliminar todo', okType: 'danger', cancelText: 'Cancelar',
              onOk: () => deleteTeam.mutate(row.id),
            })
          } />
        </Space>
      ),
    },
  ];

  const selectedTeamPlayers = players.filter((p) => p.team_id === playerModal);

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ color: '#FAAD14', margin: 0 }}>👥 Equipos</Title>
          <SeasonSelector value={seasonId} onChange={setSeasonId} style={{ marginTop: 8 }} />
        </div>
        <Button type="primary" icon={<PlusOutlined />} disabled={!seasonId}
          onClick={() => { setEditingTeam(null); teamForm.resetFields(); teamForm.setFieldsValue({ category: selectedSeason?.category ?? 'Libre', status: 'Activo', permissions_used: 0, defaults_count: 0 }); setTeamModal(true); }}>
          Nuevo Equipo
        </Button>
      </div>

      {!seasonId ? (
        <Text style={{ color: '#555' }}>Selecciona una temporada para ver los equipos.</Text>
      ) : (
        <Table
          dataSource={teams} columns={teamCols} rowKey="id" loading={isLoading} size="small" pagination={false} scroll={{ x: 480 }}
          expandable={{
            expandedRowRender: (team: Team) => {
              const tp = players.filter((p) => p.team_id === team.id);
              return (
                <div style={{ padding: '6px 0' }}>
                  <Text style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 6 }}>{tp.length} jugadores</Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tp.map((p) => (
                      <Tag key={p.id} color={p.is_active ? 'blue' : 'default'} style={{ cursor: 'pointer' }}
                        onClick={() => togglePlayer.mutate({ id: p.id, is_active: !p.is_active })}>
                        #{p.number ?? '?'} {p.name} {!p.is_active && '(baja)'}
                        <span
                          style={{ marginLeft: 6, color: '#ff4d4f', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            Modal.confirm({
                              title: `¿Dar de baja a ${p.name}?`,
                              content: 'Si el jugador no tiene partidos, se eliminará permanentemente. Si ya tiene puntos o asistencias, se marcará como Baja (inactivo) para proteger el historial del equipo.',
                              okText: 'Confirmar', okType: 'danger', cancelText: 'Cancelar',
                              onOk: () => deletePlayer.mutate(p),
                            });
                          }}
                        >×</span>
                      </Tag>
                    ))}
                    {tp.length === 0 && <Text style={{ color: '#555' }}>Sin jugadores</Text>}
                  </div>
                </div>
              );
            },
          }}
        />
      )}

      {/* Team Modal */}
      <Modal title={editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'} open={teamModal}
        onCancel={() => { setTeamModal(false); setEditingTeam(null); }} onOk={() => teamForm.submit()}
        confirmLoading={saveTeam.isPending} okText="Guardar" cancelText="Cancelar">
        <Form form={teamForm} layout="vertical" onFinish={(v) => saveTeam.mutate(v)}>
          <Form.Item name="name" label="Nombre del equipo" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="Categoría" rules={[{ required: true }]}>
            <Select options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
          </Form.Item>
          <Form.Item name="status" label="Estatus">
            <Select options={[{ label: 'Activo', value: 'Activo' }, { label: 'Dado de Baja', value: 'Dado de Baja' }]} />
          </Form.Item>
          <Form.Item name="permissions_used" label="Permisos usados"><Input type="number" min={0} max={3} /></Form.Item>
          <Form.Item name="defaults_count" label="W.O. acumulados"><Input type="number" min={0} /></Form.Item>
        </Form>
      </Modal>

      {/* Player Modal */}
      <Modal title={`Jugadores – ${teams.find((t) => t.id === playerModal)?.name ?? ''}`}
        open={playerModal !== null} onCancel={() => { setPlayerModal(null); playerForm.resetFields(); }}
        footer={null}>
        <Collapse size="small" style={{ marginBottom: 12 }} defaultActiveKey={['1']} items={[
          {
            key: '1', label: `Activos (${selectedTeamPlayers.filter(p => p.is_active).length}/12 permitidos)`,
            children: (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedTeamPlayers.filter(p => p.is_active).map((p) => (
                  <Tag key={p.id} color="blue">#{p.number ?? '?'} {p.name}</Tag>
                ))}
                {selectedTeamPlayers.filter(p => p.is_active).length === 0 && <Text style={{ color: '#555' }}>Sin jugadores activos</Text>}
              </div>
            ),
          },
          {
            key: '2', label: `Bajas / Inactivos (${selectedTeamPlayers.filter(p => !p.is_active).length})`,
            children: (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedTeamPlayers.filter(p => !p.is_active).map((p) => (
                  <Tag key={p.id} color="default">#{p.number ?? '?'} {p.name}</Tag>
                ))}
                {selectedTeamPlayers.filter(p => !p.is_active).length === 0 && <Text style={{ color: '#555', fontSize: 12 }}>Sin bajas</Text>}
              </div>
            ),
          }
        ]} />
        
        <div style={{ borderTop: '1px solid #333', paddingTop: 16, marginTop: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>Inscribir nuevo jugador</Text>
          <Form form={playerForm} layout="vertical" onFinish={(v) => savePlayer.mutate(v)}>
            <Space style={{ width: '100%', alignItems: 'flex-start' }}>
              <Form.Item name="number" label="Dorsal"><Input type="number" min={0} max={99} style={{ width: 80 }} /></Form.Item>
              <Form.Item name="name" label="Nombre completo" rules={[{ required: true }]} style={{ flex: 1 }}><Input /></Form.Item>
              <Form.Item label=" ">
                <Button type="primary" htmlType="submit" loading={savePlayer.isPending} 
                  disabled={selectedTeamPlayers.filter(p => p.is_active).length >= 12}>
                  Agregar
                </Button>
              </Form.Item>
            </Space>
          </Form>
        </div>
      </Modal>
    </AdminLayout>
  );
}
