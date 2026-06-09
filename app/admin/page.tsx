'use client';

import AdminLayout from '@/app/components/AdminLayout';
import { Card, Row, Col, Typography, Tag } from 'antd';
import { useRouter } from 'next/navigation';
import {
  DashboardOutlined,
  TrophyOutlined,
  TeamOutlined,
  CalendarOutlined,
  EditOutlined,
  CheckSquareOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import SeasonSelector from '@/app/components/SeasonSelector';
import { useAdminAccess } from '@/app/components/AdminAccessProvider';
import { getVisibleAdminModules, type AdminModuleKey } from '@/lib/access-control';

const { Title, Text } = Typography;

const moduleCardIcons: Record<AdminModuleKey, React.ReactNode> = {
  dashboard: <DashboardOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />,
  seasons: <TrophyOutlined style={{ fontSize: 32, color: '#FAAD14' }} />,
  teams: <TeamOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
  calendar: <CalendarOutlined style={{ fontSize: 32, color: '#1677ff' }} />,
  capture: <EditOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />,
  eligibility: <CheckSquareOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
  access: <SafetyCertificateOutlined style={{ fontSize: 32, color: '#13c2c2' }} />,
};

function AdminPage() {
  const router = useRouter();
  const access = useAdminAccess();
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const modules = getVisibleAdminModules(access.permissions).filter((module) => module.key !== 'dashboard');

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
        <Text style={{ color: '#888', display: 'block', marginTop: 6 }}>
          Sesion con rol: <b style={{ color: '#fff' }}>{access.roleLabel}</b>
        </Text>
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
          <Col key={mod.path} xs={24} sm={12} md={8}>
            <Card
              hoverable
              onClick={() => router.push(mod.path)}
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
                  {moduleCardIcons[mod.key]}
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
          📋 <b style={{ color: '#888' }}>Acceso actual:</b> solo ves modulos permitidos para tu rol.
          La autorizacion se valida tanto en navegacion como en las rutas protegidas.
        </Text>
      </div>
    </AdminLayout>
  );
}

export default AdminPage;
