'use client';

import AdminLayout from '@/app/components/AdminLayout';
import {
  Table, Button, Modal, Form, Input, Select, Switch, Tag, Typography, Space, message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { invalidatePublicCache } from '@/lib/public-cache-client';
import { useAdminStore } from '@/lib/admin-store';
import { useState } from 'react';

const { Title, Text } = Typography;

interface Season {
  id: number;
  name: string;
  category: string;
  year: number;
  is_active: boolean;
  is_test: boolean;
  created_at: string;
}

const CATEGORIES = ['Libre', 'Veteranos', 'Femenil', '3ra', 'Master'];

export default function SeasonsPage() {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data: seasons = [], isLoading } = useQuery<Season[]>({
    queryKey: ['seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: Omit<Season, 'id' | 'created_at'>) => {
      if (editing) {
        const { error } = await supabase.from('seasons').update(values).eq('id', editing.id);
        if (error) throw error;
        return editing.id;
      } else {
        const { data, error } = await supabase
          .from('seasons')
          .insert(values)
          .select('id')
          .single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: async (seasonId) => {
      qc.invalidateQueries({ queryKey: ['seasons'] });
      qc.invalidateQueries({ queryKey: ['seasons-selector'] });
      await invalidatePublicCache({ seasonId, seasons: true });
      message.success(editing ? 'Temporada actualizada' : 'Temporada creada');
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const activateMutation = useMutation({
    mutationFn: async ({ id, category }: { id: number; category: string }) => {
      // Deactivate all in same category first
      await supabase.from('seasons').update({ is_active: false }).eq('category', category);
      const { error } = await supabase.from('seasons').update({ is_active: true }).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (seasonId) => {
      useAdminStore.getState().setSelectedSeasonId(seasonId);
      qc.invalidateQueries({ queryKey: ['seasons'] });
      qc.invalidateQueries({ queryKey: ['active-season'] });
      qc.invalidateQueries({ queryKey: ['seasons-selector'] });
      await invalidatePublicCache({ seasonId, seasons: true });
      message.success('Temporada activada');
    },
    onError: (e: Error) => message.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('seasons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async (_, seasonId) => {
      if (useAdminStore.getState().selectedSeasonId === seasonId) {
        useAdminStore.getState().clearSeason();
      }
      qc.invalidateQueries({ queryKey: ['seasons'] });
      qc.invalidateQueries({ queryKey: ['seasons-selector'] });
      await invalidatePublicCache({ seasonId, seasons: true });
      message.success('Temporada eliminada');
    },
    onError: (e: Error) => message.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ year: new Date().getFullYear(), is_active: false, is_test: false });
    setModalOpen(true);
  };

  const openEdit = (s: Season) => {
    setEditing(s);
    form.setFieldsValue(s);
    setModalOpen(true);
  };

  const handleDelete = (s: Season) => {
    Modal.confirm({
      title: `¿Eliminar "${s.name}"?`,
      content: 'Esto eliminará todos los equipos, partidos y estadísticas de esta temporada (CASCADE).',
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => deleteMutation.mutate(s.id),
    });
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, row: Season) => (
        <span>
          <Text strong>{v}</Text>
          {row.is_active && <Tag color="green" style={{ marginLeft: 8 }}>Activa</Tag>}
          {row.is_test && <Tag color="orange" style={{ marginLeft: 4 }}>Prueba</Tag>}
        </span>
      ),
    },
    { title: 'Categoría', dataIndex: 'category', key: 'category', width: 110 },
    { title: 'Año', dataIndex: 'year', key: 'year', width: 70, align: 'center' as const },
    {
      title: 'Acciones',
      key: 'actions',
      width: 200,
      render: (_: unknown, row: Season) => (
        <Space>
          {!row.is_active && (
            <Button
              size="small"
              type="primary"
              onClick={() => activateMutation.mutate({ id: row.id, category: row.category })}
            >
              Activar
            </Button>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(row)}
          />
        </Space>
      ),
    },
  ];

  const hasActiveFilters = searchQuery.trim() !== '' || categoryFilter !== 'all' || statusFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  const filteredSeasons = seasons.filter((s) => {
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    if (statusFilter === 'active' && !s.is_active) return false;
    if (statusFilter === 'inactive' && s.is_active) return false;
    if (searchQuery.trim()) {
      const normalized = (text: string) =>
        text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return normalized(s.name).includes(normalized(searchQuery));
    }
    return true;
  });

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ color: '#FAAD14', margin: 0 }}>🏆 Temporadas</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Nueva Temporada
        </Button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar temporada..."
          allowClear
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 260, maxWidth: '100%' }}
        />
        <Select
          value={categoryFilter}
          onChange={setCategoryFilter}
          style={{ width: 140 }}
          options={[
            { label: 'Categorías: todas', value: 'all' },
            ...CATEGORIES.map((c) => ({ label: c, value: c })),
          ]}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 140 }}
          options={[
            { label: 'Estado: todos', value: 'all' },
            { label: 'Activas', value: 'active' },
            { label: 'Inactivas', value: 'inactive' },
          ]}
        />
        <Tag color={hasActiveFilters ? 'gold' : 'default'} style={{ margin: 0, padding: '3px 8px', fontSize: 12 }}>
          {filteredSeasons.length} de {seasons.length} temporadas
        </Tag>
        {hasActiveFilters && (
          <Button size="small" onClick={handleClearFilters}>
            Limpiar filtros
          </Button>
        )}
      </div>

      <Table
        dataSource={filteredSeasons}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={false}
        scroll={{ x: 480 }}
      />

      <Modal
        title={editing ? 'Editar Temporada' : 'Nueva Temporada'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="Ej: Torneo Apertura 2026" />
          </Form.Item>
          <Form.Item name="category" label="Categoría" rules={[{ required: true }]}>
            <Select options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
          </Form.Item>
          <Form.Item name="year" label="Año" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="is_active" label="Activa" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="is_test" label="Torneo de Prueba" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
