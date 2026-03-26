'use client';

import React, { useState } from 'react';
import { Table, Checkbox, InputNumber, Typography } from 'antd';

const { Text } = Typography;

export interface PlayerRow {
  player_id: number;
  team_id: number;
  name: string;
  number: number | null;
  played: boolean;
  points: number;
  triples: number;
}

interface Props {
  title: string;
  players: PlayerRow[];
  disableStats: boolean;
  showWOScorer: boolean;
  woScorerId?: number;
  onChange: (rows: PlayerRow[]) => void;
  onWOScorerChange?: (playerId: number | undefined) => void;
}

export default function PlayerAttendanceTable({
  title,
  players,
  disableStats,
  showWOScorer,
  woScorerId,
  onChange,
  onWOScorerChange,
}: Props) {
  const [rows, setRows] = useState<PlayerRow[]>(players);

  const update = (idx: number, patch: Partial<PlayerRow>) => {
    const updated = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setRows(updated);
    onChange(updated);
  };

  const cols = [
    {
      title: '#',
      dataIndex: 'number',
      key: 'number',
      width: 40,
      align: 'center' as const,
      render: (v: number | null) => <Text style={{ color: '#888', fontSize: 12 }}>{v ?? '-'}</Text>,
    },
    {
      title: 'Jugador',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: '✓',
      key: 'played',
      width: 44,
      align: 'center' as const,
      render: (_: unknown, row: PlayerRow, idx: number) => (
        <Checkbox
          checked={row.played}
          onChange={(e) => {
            update(idx, { played: e.target.checked });
            // If unselecting the WO scorer, clear it
            if (!e.target.checked && row.player_id === woScorerId) {
              onWOScorerChange?.(undefined);
            }
          }}
        />
      ),
    },
    {
      title: 'Pts',
      key: 'points',
      width: 70,
      align: 'center' as const,
      render: (_: unknown, row: PlayerRow, idx: number) => (
        <InputNumber
          min={0}
          max={99}
          value={row.points}
          disabled={disableStats || !row.played}
          onChange={(v) => update(idx, { points: v ?? 0 })}
          style={{ width: 60 }}
          size="small"
        />
      ),
    },
    {
      title: 'Tri',
      key: 'triples',
      width: 60,
      align: 'center' as const,
      render: (_: unknown, row: PlayerRow, idx: number) => (
        <InputNumber
          min={0}
          max={30}
          value={row.triples}
          disabled={disableStats || !row.played}
          onChange={(v) => update(idx, { triples: v ?? 0 })}
          style={{ width: 52 }}
          size="small"
        />
      ),
    },
    ...(showWOScorer
      ? [
          {
            title: '20pts',
            key: 'wo_scorer',
            width: 65,
            align: 'center' as const,
            render: (_: unknown, row: PlayerRow) => (
              <Checkbox
                checked={row.player_id === woScorerId}
                disabled={!row.played}
                onChange={(e) =>
                  onWOScorerChange?.(e.target.checked ? row.player_id : undefined)
                }
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <Text
        strong
        style={{ display: 'block', marginBottom: 8, color: '#FAAD14', fontSize: 14 }}
      >
        {title}
      </Text>
      <Table
        dataSource={rows}
        columns={cols}
        rowKey="player_id"
        size="small"
        pagination={false}
        scroll={{ x: 320 }}
      />
    </div>
  );
}
