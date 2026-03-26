'use client';

import { Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

/** Mirrors the `teams` table schema in Supabase */
export interface Team {
  id: number;
  name: string;
  games_played: number; // PJ
  wins: number;         // PG
  losses: number;       // PP
  points: number;       // Pts en tabla
}

interface TablaClasificacionProps {
  teams: Team[];
}

const columns: ColumnsType<Team & { pos: number }> = [
  {
    title: '#',
    dataIndex: 'pos',
    key: 'pos',
    width: 36,
    align: 'center',
    render: (pos: number) => {
      const medal: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
      return (
        <Text style={{ color: '#FFFFFF', fontSize: 13 }}>
          {medal[pos] ?? pos}
        </Text>
      );
    },
  },
  {
    title: 'Equipo',
    dataIndex: 'name',
    key: 'name',
    render: (name: string) => (
      <Text strong style={{ color: '#FFFFFF', fontSize: 13 }}>
        {name}
      </Text>
    ),
  },
  {
    title: 'PJ',
    dataIndex: 'games_played',
    key: 'games_played',
    width: 40,
    align: 'center',
    render: (v: number) => (
      <Text style={{ color: '#FFFFFF', fontSize: 13 }}>{v}</Text>
    ),
  },
  {
    title: 'PG',
    dataIndex: 'wins',
    key: 'wins',
    width: 40,
    align: 'center',
    render: (v: number) => (
      <Text style={{ color: '#52c41a', fontSize: 13 }}>{v}</Text>
    ),
  },
  {
    title: 'PP',
    dataIndex: 'losses',
    key: 'losses',
    width: 40,
    align: 'center',
    render: (v: number) => (
      <Text style={{ color: '#ff4d4f', fontSize: 13 }}>{v}</Text>
    ),
  },
  {
    title: 'Pts',
    dataIndex: 'points',
    key: 'points',
    width: 50,
    align: 'center',
    render: (pts: number) => (
      <Tag
        color="#FAAD14"
        style={{
          color: '#000',
          fontWeight: 700,
          fontSize: 13,
          border: 'none',
          minWidth: 32,
          textAlign: 'center',
        }}
      >
        {pts}
      </Tag>
    ),
  },
];

type EmptyState = 'no-data' | 'rls-check';

function EmptyTable({ reason }: { reason: EmptyState }) {
  const messages: Record<EmptyState, string> = {
    'no-data': 'Cargando datos...',
    'rls-check': '⚠ Sin datos — Verificar políticas RLS en Supabase',
  };
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '24px 0',
        color: '#888',
        fontSize: 13,
      }}
    >
      {messages[reason]}
    </div>
  );
}

export default function TablaClasificacion({
  teams,
}: TablaClasificacionProps) {
  const data = teams.map((t, i) => ({ ...t, pos: i + 1, key: t.id }));
  const emptyReason: EmptyState = 'rls-check';

  return (
    <Table
      columns={columns}
      dataSource={data}
      size="small"
      pagination={false}
      locale={{ emptyText: <EmptyTable reason={emptyReason} /> }}
      style={{ width: '100%' }}
    />
  );
}
