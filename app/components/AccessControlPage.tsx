'use client';

import { Card, Col, Row, Table, Tag, Typography } from 'antd';

import { useAdminAccess } from '@/app/components/AdminAccessProvider';
import AdminLayout from '@/app/components/AdminLayout';
import type { AdminPermission, AdminRole } from '@/lib/access-control';

const { Title, Text, Paragraph } = Typography;

interface RoleView {
  role: AdminRole;
  label: string;
  description: string;
  permissions: AdminPermission[];
}

interface AssignmentView {
  email: string;
  role: AdminRole;
  roleLabel: string;
}

function formatPermission(permission: AdminPermission) {
  return permission.replaceAll('_', ' ');
}

export default function AccessControlPage({
  roles,
  assignments,
}: {
  roles: RoleView[];
  assignments: AssignmentView[];
}) {
  const access = useAdminAccess();

  return (
    <AdminLayout>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ color: '#FAAD14', margin: 0 }}>
          🔐 Control de Accesos
        </Title>
        <Text style={{ color: '#888' }}>
          Vista local de prueba para identificar roles, permisos y correos asignados.
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={10}>
          <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <Title level={5} style={{ color: '#fff', marginTop: 0 }}>
              Sesion actual
            </Title>
            <Paragraph style={{ color: '#bbb', marginBottom: 8 }}>
              Correo: <b style={{ color: '#fff' }}>{access.email ?? 'No disponible'}</b>
            </Paragraph>
            <Paragraph style={{ color: '#bbb', marginBottom: 8 }}>
              Rol: <b style={{ color: '#fff' }}>{access.roleLabel ?? 'Sin rol'}</b>
            </Paragraph>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {access.permissions.map((permission) => (
                <Tag key={permission} color="gold">
                  {formatPermission(permission)}
                </Tag>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
            <Title level={5} style={{ color: '#fff', marginTop: 0 }}>
              Como editar la prueba local
            </Title>
            <Paragraph style={{ color: '#bbb', marginBottom: 8 }}>
              1. Cambia correos y roles en <code>lib/access-control.ts</code>.
            </Paragraph>
            <Paragraph style={{ color: '#bbb', marginBottom: 8 }}>
              2. Opcionalmente sobreescribe sin tocar codigo con <code>ADMIN_ROLE_OVERRIDES_JSON</code>.
            </Paragraph>
            <Paragraph style={{ color: '#666', marginBottom: 0 }}>
              Ejemplo: <code>{`{"captura@liganochixtlan.com":"captura_resultados"}`}</code>
            </Paragraph>
          </Card>
        </Col>
      </Row>

      <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', marginBottom: 20 }}>
        <Title level={5} style={{ color: '#fff', marginTop: 0 }}>
          Roles y permisos
        </Title>
        <Row gutter={[16, 16]}>
          {roles.map((role) => (
            <Col key={role.role} xs={24} md={12}>
              <Card
                size="small"
                style={{ background: '#111', border: '1px solid #252525' }}
              >
                <Text strong style={{ color: '#fff', display: 'block', marginBottom: 6 }}>
                  {role.label}
                </Text>
                <Text style={{ color: '#777', display: 'block', marginBottom: 12 }}>
                  {role.description}
                </Text>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {role.permissions.map((permission) => (
                    <Tag key={permission} color="blue">
                      {formatPermission(permission)}
                    </Tag>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
        <Title level={5} style={{ color: '#fff', marginTop: 0 }}>
          Asignaciones locales por correo
        </Title>
        <Table
          rowKey="email"
          pagination={false}
          dataSource={assignments}
          columns={[
            { title: 'Correo', dataIndex: 'email', key: 'email' },
            { title: 'Clave de rol', dataIndex: 'role', key: 'role', width: 180 },
            { title: 'Rol visible', dataIndex: 'roleLabel', key: 'roleLabel', width: 220 },
          ]}
        />
      </Card>
    </AdminLayout>
  );
}
