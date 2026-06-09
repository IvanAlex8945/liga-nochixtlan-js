import Link from 'next/link';

import { Button, Card, Typography } from 'antd';

import { createClient } from '@/lib/supabase/server';
import { buildAccessSnapshot } from '@/lib/access-control';

const { Title, Paragraph, Text } = Typography;

export default async function NoAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = buildAccessSnapshot(user?.email);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        padding: 20,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 560,
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: 18,
        }}
      >
        <Title level={3} style={{ color: '#FAAD14', marginTop: 0 }}>
          Acceso no autorizado
        </Title>
        <Paragraph style={{ color: '#bbb' }}>
          Tu cuenta inicio sesion correctamente, pero no tiene un rol administrativo asignado
          para este panel o intento entrar a un modulo sin permiso.
        </Paragraph>
        <Paragraph style={{ color: '#888', marginBottom: 8 }}>
          Correo detectado:
        </Paragraph>
        <Text style={{ color: '#fff', display: 'block', marginBottom: 16 }}>
          {access.email ?? 'Sin correo disponible'}
        </Text>
        <Paragraph style={{ color: '#888', marginBottom: 8 }}>
          Rol identificado:
        </Paragraph>
        <Text style={{ color: '#fff', display: 'block', marginBottom: 24 }}>
          {access.roleLabel ?? 'Sin asignacion local'}
        </Text>
        <Paragraph style={{ color: '#666' }}>
          Para habilitar acceso local de prueba, revisa el archivo
          {' '}
          <code>lib/access-control.ts</code>
          {' '}
          o la variable
          {' '}
          <code>ADMIN_ROLE_OVERRIDES_JSON</code>.
        </Paragraph>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
          <Link href="/login">
            <Button>Volver a login</Button>
          </Link>
          <Link href="/">
            <Button type="primary">Ir al inicio publico</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
