'use client';

import React from 'react';
import { Card, Row, Col, Typography, Tag, Button, Progress } from 'antd';
import { useRouter } from 'next/navigation';
import {
  DashboardOutlined,
  TrophyOutlined,
  TeamOutlined,
  CalendarOutlined,
  EditOutlined,
  CheckSquareOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import AdminLayout from '@/app/components/AdminLayout';
import { useAdminAccess } from '@/app/components/AdminAccessProvider';
import { getVisibleAdminModules, type AdminModuleKey } from '@/lib/access-control';
import { useAdminStore } from '@/lib/admin-store';
import { supabase } from '@/lib/supabase';

const { Title, Text } = Typography;

const moduleCardIcons: Record<AdminModuleKey, React.ReactNode> = {
  dashboard: <DashboardOutlined style={{ fontSize: 28, color: '#8c8c8c' }} />,
  seasons: <TrophyOutlined style={{ fontSize: 28, color: '#FAAD14' }} />,
  teams: <TeamOutlined style={{ fontSize: 28, color: '#52c41a' }} />,
  calendar: <CalendarOutlined style={{ fontSize: 28, color: '#1677ff' }} />,
  capture: <EditOutlined style={{ fontSize: 28, color: '#ff4d4f' }} />,
  eligibility: <CheckSquareOutlined style={{ fontSize: 28, color: '#722ed1' }} />,
  access: <SafetyCertificateOutlined style={{ fontSize: 28, color: '#13c2c2' }} />,
};

interface DashboardMatch {
  id: number;
  jornada: number | null;
  status: string;
  phase?: string | null;
  date?: string | null;
  time?: string | null;
  court?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  home_team?: { id: number; name: string } | null;
  away_team?: { id: number; name: string } | null;
}

interface DashboardTeam {
  id: number;
  name: string;
  category: string;
  is_active: boolean;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const access = useAdminAccess();
  const seasonId = useAdminStore((s) => s.selectedSeasonId);
  const modules = getVisibleAdminModules(access.permissions).filter((module) => module.key !== 'dashboard');

  // 1. Query current season details
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

  // 2. Query teams in current season
  const { data: teams = [], isLoading: loadingTeams } = useQuery<DashboardTeam[]>({
    queryKey: ['admin-dashboard-teams', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, category, is_active')
        .eq('season_id', seasonId!)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as DashboardTeam[];
    },
  });

  // 3. Query matches in current season
  const { data: matches = [], isLoading: loadingMatches } = useQuery<DashboardMatch[]>({
    queryKey: ['admin-dashboard-matches', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          jornada,
          status,
          phase,
          date,
          time,
          court,
          home_score,
          away_score,
          home_team:teams!matches_home_team_id_fkey(id, name),
          away_team:teams!matches_away_team_id_fkey(id, name)
        `)
        .eq('season_id', seasonId!)
        .order('jornada', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as DashboardMatch[];
    },
  });

  // 4. Query players count in teams belonging to this season
  const teamIds = teams.map((t) => t.id);
  const { data: playersCount = 0, isLoading: loadingPlayers } = useQuery<number>({
    queryKey: ['admin-dashboard-players-count', seasonId, teamIds],
    enabled: !!seasonId && teamIds.length > 0,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .in('team_id', teamIds)
        .eq('is_active', true);

      if (error) {
        const { data } = await supabase
          .from('players')
          .select('id')
          .in('team_id', teamIds)
          .eq('is_active', true);
        return data ? data.length : 0;
      }
      return count ?? 0;
    },
  });

  // Metric derivations
  const totalTeams = teams.length;
  const totalMatches = matches.length;
  const playedMatches = matches.filter((m) => m.status === 'Jugado').length;
  const pendingMatches = matches.filter(
    (m) => m.status !== 'Jugado' && m.status !== 'Cancelado' && m.status !== 'No Necesario'
  );
  const progressPercent = totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0;

  // Uncaptured matches for quick resolution
  const topPendingMatches = pendingMatches.slice(0, 5);

  return (
    <AdminLayout>
      {/* ── Season Summary Banner ─────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #181d26 0%, #12151b 100%)',
          border: '1px solid #2a3344',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Title level={3} style={{ color: '#fff', margin: 0 }}>
                🏀 Centro de Operaciones
              </Title>
              {season ? (
                <>
                  <Tag
                    color={season.is_active ? 'gold' : 'default'}
                    style={{ fontSize: 13, padding: '2px 10px', fontWeight: 600 }}
                  >
                    {season.name} ({season.category})
                  </Tag>
                  {season.is_active ? (
                    <Tag color="success">Temporada Activa</Tag>
                  ) : (
                    <Tag color="default">Histórica</Tag>
                  )}
                </>
              ) : (
                <Tag color="error">Sin temporada seleccionada</Tag>
              )}
            </div>
            <Text style={{ color: '#8b949e', display: 'block', marginTop: 6, fontSize: 13 }}>
              Rol: <b style={{ color: '#e6edf3' }}>{access.roleLabel}</b> · Monitoreo y captura de jornada en tiempo real.
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              size="small"
              onClick={() => router.push('/admin/seasons')}
              style={{
                background: '#21262d',
                borderColor: '#30363d',
                color: '#c9d1d9',
                fontSize: 12,
              }}
            >
              Cambiar Temporada
            </Button>
          </div>
        </div>
      </div>

      {/* ── Quick Action Shortcuts ────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
          Atajos Rápidos de Operación
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Button
            type="primary"
            icon={<CalendarOutlined />}
            onClick={() => router.push('/admin/calendar')}
            style={{ background: '#1677ff', borderColor: '#1677ff', fontWeight: 500 }}
          >
            + Nuevo Partido
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => router.push('/admin/capture')}
            style={{ background: '#d48806', borderColor: '#d48806', color: '#000', fontWeight: 600 }}
          >
            Capturar Resultado
          </Button>
          <Button
            icon={<TeamOutlined />}
            onClick={() => router.push('/admin/teams')}
            style={{ background: '#1f1f1f', borderColor: '#333', color: '#fff' }}
          >
            + Nuevo Equipo
          </Button>
          <Button
            icon={<CheckSquareOutlined />}
            onClick={() => router.push('/admin/eligibility')}
            style={{ background: '#1f1f1f', borderColor: '#333', color: '#fff' }}
          >
            Ver Elegibilidad
          </Button>
          <Button
            icon={<TrophyOutlined />}
            onClick={() => router.push('/admin/seasons')}
            style={{ background: '#1f1f1f', borderColor: '#333', color: '#888' }}
          >
            Temporadas
          </Button>
        </div>
      </div>

      {/* ── Operational KPI Cards ─────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* KPI 1: Teams */}
        <Col xs={12} sm={12} lg={6}>
          <Card
            style={{
              background: '#161b22',
              borderColor: '#30363d',
              borderRadius: 8,
              height: '100%',
            }}
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text style={{ color: '#8b949e', fontSize: 12, display: 'block' }}>
                  Equipos Inscritos
                </Text>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#52c41a', marginTop: 4 }}>
                  {loadingTeams ? '—' : totalTeams}
                </div>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: '#1b3222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TeamOutlined style={{ fontSize: 20, color: '#52c41a' }} />
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: '#6e7681' }}>Categoría activa</Text>
              <Button
                type="link"
                size="small"
                onClick={() => router.push('/admin/teams')}
                style={{ padding: 0, fontSize: 11, color: '#52c41a' }}
              >
                Ver equipos →
              </Button>
            </div>
          </Card>
        </Col>

        {/* KPI 2: Season Progress */}
        <Col xs={12} sm={12} lg={6}>
          <Card
            style={{
              background: '#161b22',
              borderColor: '#30363d',
              borderRadius: 8,
              height: '100%',
            }}
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text style={{ color: '#8b949e', fontSize: 12, display: 'block' }}>
                  Progreso Temporada
                </Text>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#FAAD14', marginTop: 4 }}>
                  {loadingMatches ? '—' : `${progressPercent}%`}
                </div>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: '#2b2111',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrophyOutlined style={{ fontSize: 20, color: '#FAAD14' }} />
              </div>
            </div>
            <Progress
              percent={progressPercent}
              size="small"
              strokeColor="#FAAD14"
              showInfo={false}
              style={{ marginTop: 8, marginBottom: 2 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: '#6e7681' }}>
                {playedMatches} de {totalMatches} jugados
              </Text>
              <Button
                type="link"
                size="small"
                onClick={() => router.push('/admin/calendar')}
                style={{ padding: 0, fontSize: 11, color: '#FAAD14' }}
              >
                Calendario →
              </Button>
            </div>
          </Card>
        </Col>

        {/* KPI 3: Pending Matches */}
        <Col xs={12} sm={12} lg={6}>
          <Card
            style={{
              background: '#161b22',
              borderColor: '#30363d',
              borderRadius: 8,
              height: '100%',
            }}
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text style={{ color: '#8b949e', fontSize: 12, display: 'block' }}>
                  Partidos Pendientes
                </Text>
                <div style={{ fontSize: 26, fontWeight: 700, color: pendingMatches.length > 0 ? '#ff7875' : '#52c41a', marginTop: 4 }}>
                  {loadingMatches ? '—' : pendingMatches.length}
                </div>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: pendingMatches.length > 0 ? '#381a1a' : '#1b3222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClockCircleOutlined style={{ fontSize: 20, color: pendingMatches.length > 0 ? '#ff7875' : '#52c41a' }} />
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: '#6e7681' }}>
                {pendingMatches.length > 0 ? 'Requieren captura' : '¡Todo al día!'}
              </Text>
              <Button
                type="link"
                size="small"
                onClick={() => router.push('/admin/capture')}
                style={{ padding: 0, fontSize: 11, color: '#1677ff' }}
              >
                Capturar →
              </Button>
            </div>
          </Card>
        </Col>

        {/* KPI 4: Active Players */}
        <Col xs={12} sm={12} lg={6}>
          <Card
            style={{
              background: '#161b22',
              borderColor: '#30363d',
              borderRadius: 8,
              height: '100%',
            }}
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text style={{ color: '#8b949e', fontSize: 12, display: 'block' }}>
                  Jugadores Registrados
                </Text>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#d3adf7', marginTop: 4 }}>
                  {loadingPlayers ? '—' : playersCount}
                </div>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: '#2a1a38',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserOutlined style={{ fontSize: 20, color: '#d3adf7' }} />
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: '#6e7681' }}>En cédulas activas</Text>
              <Button
                type="link"
                size="small"
                onClick={() => router.push('/admin/teams')}
                style={{ padding: 0, fontSize: 11, color: '#d3adf7' }}
              >
                Cédulas →
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Pending Matches Alert Banner / Card ───────────── */}
      <div style={{ marginBottom: 24 }}>
        {pendingMatches.length > 0 ? (
          <Card
            style={{
              background: '#161b22',
              borderColor: '#874d00',
              borderRadius: 10,
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertOutlined style={{ color: '#FAAD14', fontSize: 18 }} />
                <Text strong style={{ color: '#FAAD14', fontSize: 15 }}>
                  Partidos pendientes de captura
                </Text>
                <Tag color="warning">{pendingMatches.length} pendiente(s)</Tag>
              </div>

              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => router.push('/admin/capture')}
                style={{ background: '#d48806', borderColor: '#d48806', color: '#000', fontWeight: 600 }}
              >
                Ir a Capturar Resultados
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topPendingMatches.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: '#0d1117',
                    border: '1px solid #21262d',
                    borderRadius: 6,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>
                      J{m.jornada || '—'}
                    </Tag>
                    <Text strong style={{ color: '#fff', fontSize: 14 }}>
                      {m.home_team?.name ?? 'Local'} vs {m.away_team?.name ?? 'Visita'}
                    </Text>
                    {(m.date || m.court) && (
                      <Text style={{ color: '#8b949e', fontSize: 12 }}>
                        {m.date ? `📅 ${m.date}` : ''}
                        {m.time ? ` · ⏰ ${m.time}` : ''}
                        {m.court ? ` · 📍 ${m.court}` : ''}
                      </Text>
                    )}
                  </div>

                  <Button
                    type="primary"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => router.push('/admin/capture')}
                    style={{ background: '#1f6feb', borderColor: '#1f6feb', fontSize: 12 }}
                  >
                    Capturar
                  </Button>
                </div>
              ))}

              {pendingMatches.length > 5 && (
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => router.push('/admin/capture')}
                    style={{ color: '#FAAD14', fontSize: 12 }}
                  >
                    Ver los {pendingMatches.length - 5} partidos pendientes adicionales en Captura →
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card
            style={{
              background: '#0f2416',
              borderColor: '#238636',
              borderRadius: 10,
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircleOutlined style={{ color: '#3fb950', fontSize: 24 }} />
              <div>
                <Text strong style={{ color: '#3fb950', fontSize: 15, display: 'block' }}>
                  {totalMatches > 0
                    ? '¡Temporada al día! Todos los partidos programados han sido capturados.'
                    : 'Temporada en preparación: Aún no hay partidos programados.'}
                </Text>
                <Text style={{ color: '#8b949e', fontSize: 12 }}>
                  {totalMatches > 0
                    ? `Se han registrado las estadísticas completas de los ${playedMatches} partidos jugados.`
                    : 'Usa el botón "+ Nuevo Partido" para registrar la primera jornada.'}
                </Text>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ── Admin Modules Navigation Grid ─────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <Text style={{ color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Módulos Administrativos
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {modules.map((mod) => (
          <Col key={mod.path} xs={24} sm={12} md={8}>
            <Card
              hoverable
              onClick={() => router.push(mod.path)}
              style={{
                background: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              styles={{ body: { padding: 18 } }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: '#0d1117',
                    border: '1px solid #21262d',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {moduleCardIcons[mod.key]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#8b949e', fontSize: 11, marginBottom: 2 }}>
                    Paso {mod.step}
                  </div>
                  <Text strong style={{ fontSize: 15, color: '#fff', display: 'block' }}>
                    {mod.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#8b949e',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {mod.desc}
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Security & Role Footer ────────────────────────── */}
      <div
        style={{
          marginTop: 32,
          padding: '12px 16px',
          background: '#0d1117',
          borderRadius: 8,
          border: '1px solid #21262d',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <SafetyCertificateOutlined style={{ color: '#13c2c2', fontSize: 16 }} />
        <Text style={{ color: '#6e7681', fontSize: 12 }}>
          Sesión protegida: solo accedes a los módulos autorizados para el rol <b style={{ color: '#c9d1d9' }}>{access.roleLabel}</b>.
        </Text>
      </div>
    </AdminLayout>
  );
}
