'use client';

import { Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TeamStats } from '@/lib/standings';

const { Text } = Typography;

type TeamRow = TeamStats & { pos: number; key: number };

interface Props {
  data: TeamStats[];
  onTeamClick?: (team: TeamStats) => void;
}

export default function StandingsTable({ data, onTeamClick }: Props) {
  const rows: TeamRow[] = data.map((t, i) => ({ ...t, pos: i + 1, key: t.id }));

  const columns: ColumnsType<TeamRow> = [
    {
      title: '#',
      dataIndex: 'pos',
      key: 'pos',
      width: 36,
      align: 'center',
      render: (pos: number) => {
        const medal: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
        return <Text style={{ fontSize: 13 }}>{medal[pos] ?? `${pos}°`}</Text>;
      },
    },
    {
      title: 'Equipo',
      dataIndex: 'equipo',
      key: 'equipo',
      ellipsis: true,
      render: (v: string, row: TeamRow) =>
        onTeamClick ? (
          <button
            onClick={() => onTeamClick(row)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: '#FAAD14', fontWeight: 600, fontSize: 13, textDecoration: 'underline',
              textDecorationColor: 'rgba(250,173,20,0.4)', textUnderlineOffset: 3,
            }}
          >
            {v}
          </button>
        ) : (
          <Text strong style={{ fontSize: 13 }}>{v}</Text>
        ),
    },
    { title: 'PJ', dataIndex: 'PJ', key: 'PJ', width: 44, align: 'center' },
    {
      title: 'PG', dataIndex: 'PG', key: 'PG', width: 44, align: 'center',
      render: (v: number) => <Text style={{ color: '#52c41a' }}>{v}</Text>,
    },
    {
      title: 'PP', dataIndex: 'PP', key: 'PP', width: 44, align: 'center',
      render: (v: number) => <Text style={{ color: '#ff4d4f' }}>{v}</Text>,
    },
    {
      title: 'WO', dataIndex: 'WO', key: 'WO', width: 44, align: 'center',
      render: (v: number) => v > 0
        ? <Text style={{ color: '#faad14' }}>{v}</Text>
        : <Text style={{ color: '#444' }}>0</Text>,
    },
    { title: 'PF', dataIndex: 'PF', key: 'PF', width: 50, align: 'center' },
    { title: 'PC', dataIndex: 'PC', key: 'PC', width: 50, align: 'center' },
    {
      title: 'DP', dataIndex: 'DP', key: 'DP', width: 55, align: 'center',
      render: (v: number) => (
        <Text style={{ color: v > 0 ? '#52c41a' : v < 0 ? '#ff4d4f' : '#666' }}>
          {v > 0 ? `+${v}` : v}
        </Text>
      ),
    },
    {
      title: 'Pts', dataIndex: 'Pts', key: 'Pts', width: 55, align: 'center',
      render: (v: number) => (
        <Tag color="#FAAD14" style={{ color: '#000', fontWeight: 700, fontSize: 13, border: 'none', minWidth: 34, textAlign: 'center' }}>
          {v}
        </Tag>
      ),
    },
  ];

  return (
    <Table
      dataSource={rows}
      columns={columns}
      rowKey="key"
      size="small"
      pagination={false}
      scroll={{ x: 560 }}
      rowClassName={(_, i) => (i === 0 ? 'row-leader' : '')}
      locale={{ emptyText: <Text style={{ color: '#555' }}>Sin partidos registrados</Text> }}
    />
  );
}
