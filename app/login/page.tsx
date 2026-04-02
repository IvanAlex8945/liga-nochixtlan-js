'use client';

import { useState } from 'react';
import { Form, Input, Button, Typography, message, Card } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        message.error(
          error.message === 'Invalid login credentials' 
            ? 'Correo o contraseña incorrectos' 
            : error.message
        );
      } else if (data.session) {
        message.success('¡Bienvenido al panel de administración!');
        router.push('/admin');
        router.refresh(); // Refrescar para garantizar que middleware e interfaz se actualicen
      }
    } catch (err: any) {
      message.error('Ocurrió un error inesperado al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', padding: 20 }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40vh', background: 'linear-gradient(180deg, #FAAD1422 0%, #0a0a0a 100%)', zIndex: 0 }} />
      
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 1
        }}
        bodyStyle={{ padding: '32px 24px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 8 }}>🏀</div>
          <Title level={3} style={{ color: '#FAAD14', margin: 0 }}>Acceso Seguro</Title>
          <Text style={{ color: '#888', display: 'block', marginTop: 4 }}>Administración de Liga Nochixtlán</Text>
        </div>

        <Form
          name="login_form"
          layout="vertical"
          onFinish={handleLogin}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Por favor ingresa el correo' },
              { type: 'email', message: 'Formato de correo inválido' }
            ]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#555' }} />} 
              placeholder="admin@liganochixtlan.com" 
              style={{ background: '#1f1f1f', borderColor: '#333', color: '#fff' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Por favor ingresa la contraseña' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#555' }} />}
              placeholder="Contraseña"
              style={{ background: '#1f1f1f', borderColor: '#333', color: '#fff' }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%', background: '#FAAD14', color: '#000', fontWeight: 600, height: 44, border: 'none' }}
            >
              INGRESAR AL PANEL
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/" style={{ color: '#555', fontSize: 13, textDecoration: 'underline' }}>
            ← Volver al inicio público
          </a>
        </div>
      </Card>
    </div>
  );
}
