'use client';

import { Layout, Menu } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarOutlined,
  TeamOutlined,
  TrophyOutlined,
  EditOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
} from '@ant-design/icons';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '/admin', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/admin/seasons', icon: <TrophyOutlined />, label: 'Temporadas' },
  { key: '/admin/teams', icon: <TeamOutlined />, label: 'Equipos' },
  { key: '/admin/calendar', icon: <CalendarOutlined />, label: 'Calendario' },
  { key: '/admin/capture', icon: <EditOutlined />, label: 'Captura' },
  { key: '/admin/eligibility', icon: <CheckSquareOutlined />, label: 'Elegibilidad' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Layout style={{ minHeight: '100vh', background: '#141414' }}>
      {/* ── Sidebar desktop ──────────────────────────────── */}
      <Sider
        breakpoint="md"
        collapsedWidth={0}
        theme="dark"
        style={{ background: '#0d0d0d', borderRight: '1px solid #222' }}
      >
        <div style={{ padding: '20px 16px 12px', textAlign: 'center' }}>
          <span style={{ fontSize: 28 }}>🏀</span>
          <div style={{ color: '#FAAD14', fontWeight: 700, fontSize: 13, marginTop: 4 }}>
            Liga Admin
          </div>
          <div style={{ marginTop: 12 }}>
            <a href="/" style={{ color: '#888', fontSize: 12, border: '1px solid #333', padding: '4px 10px', borderRadius: 4, display: 'inline-block' }}>
              🏠 Ver Inicio
            </a>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ background: 'transparent', border: 'none' }}
        />
      </Sider>

      {/* ── Content ──────────────────────────────────────── */}
      <Layout style={{ background: '#141414' }}>
        {/* Mobile top nav */}
        <div
          style={{
            background: '#0d0d0d',
            borderBottom: '1px solid #222',
            padding: '8px 0',
            display: 'flex',
            overflowX: 'auto',
          }}
          className="md:hidden"
        >
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => router.push(item.key)}
              style={{
                background: pathname === item.key ? '#FAAD14' : 'transparent',
                color: pathname === item.key ? '#000' : '#aaa',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: 13,
                marginLeft: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        <Content style={{ padding: '20px 16px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
