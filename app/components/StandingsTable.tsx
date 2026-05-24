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

function NumberCell({ value, color }: { value: number | string; color?: string }) {
  return (
    <span
      className="table-number"
      style={{ color: color ?? 'inherit' }}
    >
      {value}
    </span>
  );
}

export default function StandingsTable({ data, onTeamClick }: Props) {
  const rows: TeamRow[] = data.map((t, i) => ({ ...t, pos: i + 1, key: t.id }));

  const columns: ColumnsType<TeamRow> = [
    {
      title: '#',
      dataIndex: 'pos',
      key: 'pos',
      width: 54,
      align: 'center',
      render: (pos: number) => {
        const medal: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
        return (
          <span className={`position-badge${pos <= 3 ? ` position-badge--top-${pos}` : ''}${pos >= 10 ? ' position-badge--double' : ''}`}>
            <Text style={{ fontSize: 13, color: 'inherit' }}>{medal[pos] ?? `${pos}°`}</Text>
          </span>
        );
      },
    },
    {
      title: 'Equipo',
      dataIndex: 'equipo',
      key: 'equipo',
      ellipsis: true,
      width: 260,
      render: (v: string, row: TeamRow) =>
        onTeamClick ? (
          <button
            className="team-name-button"
            onClick={() => onTeamClick(row)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left',
              color: '#f7d774', fontWeight: 700, fontSize: 13, textDecoration: 'none',
            }}
          >
            {v}
          </button>
        ) : (
          <Text strong style={{ fontSize: 13 }}>{v}</Text>
        ),
    },
    { title: 'PJ', dataIndex: 'PJ', key: 'PJ', width: 44, align: 'center', render: (v: number) => <NumberCell value={v} /> },
    {
      title: 'PG', dataIndex: 'PG', key: 'PG', width: 44, align: 'center',
      render: (v: number) => <NumberCell value={v} color="#52c41a" />,
    },
    {
      title: 'PP', dataIndex: 'PP', key: 'PP', width: 44, align: 'center',
      render: (v: number) => <NumberCell value={v} color="#ff4d4f" />,
    },
    {
      title: 'WO', dataIndex: 'WO', key: 'WO', width: 44, align: 'center',
      render: (v: number) => v > 0
        ? <NumberCell value={v} color="#faad14" />
        : <NumberCell value="0" color="#666" />,
    },
    { title: 'PF', dataIndex: 'PF', key: 'PF', width: 50, align: 'center', render: (v: number) => <NumberCell value={v} /> },
    { title: 'PC', dataIndex: 'PC', key: 'PC', width: 50, align: 'center', render: (v: number) => <NumberCell value={v} /> },
    {
      title: 'DP', dataIndex: 'DP', key: 'DP', width: 55, align: 'center',
      render: (v: number) => (
        <NumberCell value={v > 0 ? `+${v}` : v} color={v > 0 ? '#52c41a' : v < 0 ? '#ff4d4f' : '#666'} />
      ),
    },
    {
      title: 'Pts', dataIndex: 'Pts', key: 'Pts', width: 55, align: 'center',
      render: (v: number) => (
        <Tag
          style={{
            color: '#131313',
            fontWeight: 800,
            fontSize: 13,
            border: '1px solid rgba(255,215,112,0.24)',
            minWidth: 42,
            textAlign: 'center',
            borderRadius: 999,
            background: 'linear-gradient(180deg, #f7d774, #d9a83d)',
            boxShadow: '0 10px 24px rgba(239,159,39,0.22)',
          }}
        >
          {v}
        </Tag>
      ),
    },
  ];

  return (
    <Table
      className="standings-table"
      dataSource={rows}
      columns={columns}
      rowKey="key"
      size="small"
      pagination={false}
      scroll={{ x: 560 }}
      tableLayout="fixed"
      rowClassName={(_, i) => `standings-row${i === 0 ? ' row-leader' : ''}`}
      locale={{ emptyText: <Text style={{ color: '#555' }}>Sin partidos registrados</Text> }}
    />
  );
}
