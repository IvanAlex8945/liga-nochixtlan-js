'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Menu, Drawer, Breadcrumb, Button, Tag, Select } from 'antd';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarOutlined,
  TeamOutlined,
  TrophyOutlined,
  EditOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  MenuOutlined,
  LogoutOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import { useAdminAccess } from '@/app/components/AdminAccessProvider';
import { getVisibleAdminModules, type AdminModuleKey } from '@/lib/access-control';
import { useAdminStore } from '@/lib/admin-store';
import { supabase } from '@/lib/supabase';

const { Header, Sider, Content } = Layout;

const moduleIcons: Record<AdminModuleKey, React.ReactNode> = {
  dashboard: <DashboardOutlined />,
  seasons: <TrophyOutlined />,
  teams: <TeamOutlined />,
  calendar: <CalendarOutlined />,
  capture: <EditOutlined />,
  eligibility: <CheckSquareOutlined />,
  access: <SafetyCertificateOutlined />,
};

interface SeasonOption {
  id: number;
  name: string;
  category: string;
  is_active: boolean;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const access = useAdminAccess();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const seasonId = useAdminStore((s) => s.selectedSeasonId);
  const setSeasonId = useAdminStore((s) => s.setSelectedSeasonId);
  const initializeSeason = useAdminStore((s) => s.initializeSeason);

  // Load seasons to keep Topbar selector synced across all admin modules
  const { data: seasons = [] } = useQuery<SeasonOption[]>({
    queryKey: ['admin-shell-seasons'],
    queryFn: async () => {
      const { data } = await supabase
        .from('seasons')
        .select('id, name, category, is_active')
        .order('id', { ascending: false });
      return data ?? [];
    },
  });

  // Ensure active season is initialized in store if not set
  useEffect(() => {
    if (seasons.length > 0) {
      const activeSeasons = seasons.filter((s) => s.is_active);
      initializeSeason(activeSeasons.length > 0 ? activeSeasons : seasons);
    }
  }, [seasons, initializeSeason]);

  const menuItems = getVisibleAdminModules(access.permissions).map((module) => ({
    key: module.path,
    icon: moduleIcons[module.key],
    label: module.navLabel,
  }));

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const client = createClient();
    await client.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Build contextual breadcrumbs based on active route
  const getBreadcrumbItems = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    const items = [
      {
        title: (
          <Link href="/admin" style={{ color: '#888', transition: 'color 0.2s' }}>
            Admin
          </Link>
        ),
      },
    ];

    if (segments.length <= 1) {
      items.push({
        title: <span style={{ color: '#FAAD14', fontWeight: 600 }}>Inicio</span>,
      });
    } else if (segments[1] === 'teams') {
      items.push({
        title:
          segments.length === 2 ? (
            <span style={{ color: '#FAAD14', fontWeight: 600 }}>Equipos</span>
          ) : (
            <Link href="/admin/teams" style={{ color: '#888' }}>
              Equipos
            </Link>
          ),
      });
      if (segments.includes('cedula')) {
        items.push({
          title: <span style={{ color: '#FAAD14', fontWeight: 600 }}>Cédula de Juego</span>,
        });
      }
    } else if (segments[1] === 'calendar') {
      items.push({
        title: <span style={{ color: '#FAAD14', fontWeight: 600 }}>Calendario</span>,
      });
    } else if (segments[1] === 'capture') {
      items.push({
        title: <span style={{ color: '#FAAD14', fontWeight: 600 }}>Captura</span>,
      });
    } else if (segments[1] === 'eligibility') {
      items.push({
        title: <span style={{ color: '#FAAD14', fontWeight: 600 }}>Elegibilidad</span>,
      });
    } else if (segments[1] === 'seasons') {
      items.push({
        title: <span style={{ color: '#FAAD14', fontWeight: 600 }}>Temporadas</span>,
      });
    } else if (segments[1] === 'access') {
      items.push({
        title: <span style={{ color: '#FAAD14', fontWeight: 600 }}>Roles y Permisos</span>,
      });
    } else {
      items.push({
        title: <span style={{ color: '#FAAD14', fontWeight: 600 }}>{segments[1]}</span>,
      });
    }

    return items;
  };

  const seasonOptions = seasons.map((s) => ({
    label: `${s.name} (${s.category})${s.is_active ? ' ✓' : ''}`,
    value: s.id,
  }));

  return (
    <Layout style={{ minHeight: '100vh', background: '#121212' }}>
      {/* ── Sidebar desktop ──────────────────────────────── */}
      <Sider
        breakpoint="md"
        collapsedWidth={0}
        theme="dark"
        width={220}
        style={{
          background: '#0d0d0d',
          borderRight: '1px solid #262626',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ padding: '20px 16px 16px', textAlign: 'center', borderBottom: '1px solid #1f1f1f' }}>
          <span style={{ fontSize: 32 }}>🏀</span>
          <div style={{ color: '#FAAD14', fontWeight: 700, fontSize: 14, marginTop: 4 }}>
            Liga Admin
          </div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
            {access.roleLabel}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={({ key }) => router.push(key)}
            style={{ background: 'transparent', border: 'none' }}
          />
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid #222', marginTop: 'auto' }}>
          <Link
            href="/"
            style={{
              color: '#888',
              fontSize: 12,
              border: '1px solid #333',
              padding: '6px 0',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginBottom: 8,
              transition: 'all 0.2s',
            }}
            title="Ir al portal público"
          >
            <GlobalOutlined /> Sitio Público
          </Link>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#f5222d',
              border: '1px solid #f5222d44',
              borderRadius: 6,
              padding: '6px 0',
              cursor: 'pointer',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f5222d11')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogoutOutlined /> Cerrar Sesión
          </button>
        </div>
      </Sider>

      {/* ── Mobile Navigation Drawer ─────────────────────── */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="left"
        styles={{
          body: {
            padding: 0,
            background: '#0d0d0d',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          },
          header: {
            background: '#0d0d0d',
            borderBottom: '1px solid #262626',
            color: '#fff',
          },
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🏀</span>
            <span style={{ color: '#FAAD14', fontWeight: 700, fontSize: 16 }}>Liga Admin</span>
          </div>
        }
      >
        <div style={{ padding: '16px', borderBottom: '1px solid #222' }}>
          <div style={{ color: '#888', fontSize: 12 }}>Rol en sesión:</div>
          <div style={{ color: '#fff', fontWeight: 600, marginTop: 2 }}>{access.roleLabel}</div>
          <div style={{ marginTop: 14 }}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>Temporada activa:</div>
            <Select
              value={seasonId}
              onChange={(id) => setSeasonId(id)}
              options={seasonOptions}
              style={{ width: '100%' }}
              placeholder="Seleccionar temporada"
              styles={{ popup: { root: { background: '#1a1a1a', borderColor: '#333' } } }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={({ key }) => {
              router.push(key);
              setDrawerOpen(false);
            }}
            style={{ background: 'transparent', border: 'none' }}
          />
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid #222', marginTop: 'auto' }}>
          <Link
            href="/"
            onClick={() => setDrawerOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '8px 0',
              color: '#aaa',
              border: '1px solid #333',
              borderRadius: 6,
              marginBottom: 10,
              fontSize: 13,
            }}
          >
            <GlobalOutlined /> Ver Sitio Público
          </Link>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#f5222d',
              border: '1px solid #f5222d44',
              borderRadius: 6,
              padding: '8px 0',
              cursor: 'pointer',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#f5222d11')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogoutOutlined /> Cerrar Sesión
          </button>
        </div>
      </Drawer>

      {/* ── Main Content Area with Contextual Topbar ─────── */}
      <Layout style={{ background: '#121212', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Contextual Topbar */}
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 90,
            background: '#0d0d0d',
            borderBottom: '1px solid #262626',
            height: 56,
            lineHeight: '56px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Left section: Hamburger (mobile) + Brand + Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
            <Button
              type="text"
              icon={<MenuOutlined style={{ fontSize: 18, color: '#fff' }} />}
              onClick={() => setDrawerOpen(true)}
              className="md:hidden"
              style={{ padding: '4px 8px' }}
              aria-label="Abrir menú de navegación"
            />
            <div
              className="md:hidden"
              style={{
                fontWeight: 700,
                color: '#FAAD14',
                fontSize: 14,
                whiteSpace: 'nowrap',
              }}
            >
              🏀 Admin
            </div>
            <div
              className="hidden md:flex items-center"
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              <Breadcrumb items={getBreadcrumbItems(pathname)} />
            </div>
          </div>

          {/* Right section: Persistent Active Season Selector + Role + User/Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {/* Active Season Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrophyOutlined style={{ color: '#FAAD14', fontSize: 14 }} className="hidden sm:inline" />
              <Select
                size="middle"
                value={seasonId}
                onChange={(val) => setSeasonId(val)}
                placeholder="Seleccionar temporada"
                options={seasonOptions}
                style={{ width: 230, minWidth: 160 }}
                styles={{ popup: { root: { background: '#1a1a1a', borderColor: '#333' } } }}
                showSearch
                filterOption={(input, opt) =>
                  (opt?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </div>

            {/* Role indicator */}
            <Tag
              className="hidden lg:inline-flex"
              style={{
                background: '#20180a',
                borderColor: '#874d00',
                color: '#FAAD14',
                margin: 0,
                fontWeight: 500,
                fontSize: 11,
              }}
            >
              {access.roleLabel}
            </Tag>

            {/* Public site link */}
            <Link
              href="/"
              className="hidden md:inline-flex"
              style={{
                color: '#888',
                fontSize: 12,
                border: '1px solid #333',
                padding: '4px 10px',
                borderRadius: 6,
                alignItems: 'center',
                gap: 4,
                lineHeight: '20px',
                transition: 'all 0.2s',
              }}
              title="Ver Sitio Público"
            >
              <GlobalOutlined />
            </Link>

            {/* Logout button */}
            <Button
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              size="small"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              title="Cerrar Sesión"
            >
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </Header>

        {/* Content: Fluid & High Density (no 960px lock) */}
        <Content
          style={{
            padding: '20px 24px',
            margin: '0 auto',
            width: '100%',
            maxWidth: 1440,
            flex: 1,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
