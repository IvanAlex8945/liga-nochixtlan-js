'use client';

import AdminLayout from '@/app/components/AdminLayout';
import { Card, Row, Col, Typography, Tag } from 'antd';
import { useRouter } from 'next/navigation';
import {
  TrophyOutlined,
  TeamOutlined,
  CalendarOutlined,
  EditOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import SeasonSelector from '@/app/components/SeasonSelector';

const { Title, Text } = Typography;

const modules = [
  {
    key: '/admin/seasons',
    icon: <TrophyOutlined style={{ fontSize: 32, color: '#FAAD14' }} />,
    title: 'Temporadas',
    desc: 'Crear y gestionar torneos',
    step: 1,
  },
  {
    key: '/admin/teams',
    icon: <TeamOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
    title: 'Equipos',
    desc: 'Registrar equipos y cédulas',
    step: 2,
  },
  {
    key: '/admin/calendar',
    icon: <CalendarOutlined style={{ fontSize: 32, color: '#1677ff' }} />,
    title: 'Calendario',
    desc: 'Programar y editar partidos',
    step: 3,
  },
  {
    key: '/admin/capture',
    icon: <EditOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />,
    title: 'Captura',
    desc: 'Registrar resultados y W.O.',
    step: 4,
  },
  {
    key: '/admin/eligibility',
    icon: <CheckSquareOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
    title: 'Elegibilidad',
    desc: 'Reporte de liguilla',
    step: 5,
  },
];

function AdminPage() {
  const router = useRouter();
  const [seasonId, setSeasonId] = useState<number | null>(null);

  // Auto-select active season on load if none selected
  useEffect(() => {
    supabase.from('seasons').select('id').eq('is_active', true).limit(1).single()
      .then(({ data }) => { if (data) setSeasonId(data.id); });
  }, []);

  const { data: season } = useQuery({
    queryKey: ['season-detail', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data } = await supabase
        .from('seasons')
        .select('id, name, category, year, is_active')
        .eq('id', seasonId!)
        .single();
      return data;
    },
  });

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: '#FAAD14', margin: 0 }}>
          🏀 Panel de Administración
        </Title>
        <div style={{ marginTop: 12, marginBottom: 8, maxWidth: 320 }}>
          <Text style={{ color: '#888', display: 'block', marginBottom: 6 }}>Seleccionar Temporada a Gestionar:</Text>
          <SeasonSelector value={seasonId} onChange={setSeasonId} />
        </div>
        {season ? (
          <Text style={{ color: '#888' }}>
            Temporada seleccionada: <b style={{ color: '#fff' }}>{season.name}</b>{' '}
            <Tag color={season.is_active ? 'green' : 'default'}>{season.category}</Tag>
            {!season.is_active && <Tag color="red" style={{ marginLeft: 4 }}>Histórica (Inactiva)</Tag>}
          </Text>
        ) : (
          <Text style={{ color: '#ff4d4f' }}>
            ⚠ No hay temporada seleccionada.
          </Text>
        )}
      </div>

      <Row gutter={[16, 16]}>
        {modules.map((mod) => (
          <Col key={mod.key} xs={24} sm={12} md={8}>
            <Card
              hoverable
              onClick={() => router.push(mod.key)}
              style={{
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    background: '#111',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {mod.icon}
                </div>
                <div>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 2 }}>
                    Paso {mod.step}
                  </div>
                  <Text strong style={{ fontSize: 16, color: '#fff', display: 'block' }}>
                    {mod.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#666' }}>{mod.desc}</Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ marginTop: 32, padding: 16, background: '#111', borderRadius: 8, border: '1px solid #222' }}>
        <Text style={{ color: '#555', fontSize: 12 }}>
          📋 <b style={{ color: '#888' }}>Orden obligatorio:</b> Temporadas → Equipos → Calendario → Captura → Elegibilidad.
          El sistema bloquea pasos sin prerequisitos.
        </Text>
      </div>
    </AdminLayout>
  );
}

export default AdminPage;
