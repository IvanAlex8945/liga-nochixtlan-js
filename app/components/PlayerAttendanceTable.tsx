'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Table, Checkbox, InputNumber, Typography, Button, Space, Tag } from 'antd';

const { Text } = Typography;

export interface PlayerRow {
  player_id: number;
  team_id: number;
  name: string;
  number: number | null;
  photo_thumb_url?: string | null;
  photo_url?: string | null;
  credential_code?: string | null;
  credential_status?: string | null;
  verify_token?: string | null;
  eligibility_label?: string | null;
  is_eligible?: boolean | null;
  played: boolean;
  points: number;
  triples: number;
}

interface Props {
  title: string;
  players: PlayerRow[];
  disableStats: boolean;
  onChange: (rows: PlayerRow[]) => void;
  onOpenVerify?: (player: PlayerRow) => void;
}

export default function PlayerAttendanceTable({
  title,
  players,
  disableStats,
  onChange,
  onOpenVerify,
}: Props) {
  const [rows, setRows] = useState<PlayerRow[]>(players);

  const update = (idx: number, patch: Partial<PlayerRow>) => {
    const updated = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setRows(updated);
    onChange(updated);
  };

  const markAll = (played: boolean) => {
    const updated = rows.map((row) => ({ ...row, played }));
    setRows(updated);
    onChange(updated);
  };

  const presentes = rows.filter((row) => row.played).length;
  const vigentes = rows.filter((row) => row.credential_status === 'active').length;

  const cols = [
    {
      title: '',
      key: 'photo',
      width: 68,
      align: 'center' as const,
      render: (_: unknown, row: PlayerRow) => (
        <div
          style={{
            position: 'relative',
            width: 42,
            height: 42,
            margin: '0 auto',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid rgba(255,215,112,0.14)',
            background: 'rgba(255,255,255,0.05)',
          }}
        >
          {row.photo_thumb_url || row.photo_url ? (
            <Image
              src={row.photo_thumb_url ?? row.photo_url ?? ''}
              alt={`Foto de ${row.name}`}
              fill
              unoptimized
              sizes="42px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f7d774',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {getInitials(row.name)}
            </div>
          )}
        </div>
      ),
    },
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
      render: (v: string, row: PlayerRow) => (
        <div>
          <Text style={{ fontSize: 13 }}>{v}</Text>
          <Space size={[4, 4]} wrap style={{ display: 'flex', marginTop: 4 }}>
            {row.credential_status === 'active' ? (
              <Tag color="green" style={{ marginInlineEnd: 0 }}>Vigente</Tag>
            ) : (
              <Tag color="red" style={{ marginInlineEnd: 0 }}>Sin validar</Tag>
            )}
            {row.eligibility_label && (
              <Tag color={row.is_eligible ? 'blue' : 'orange'} style={{ marginInlineEnd: 0 }}>
                {row.eligibility_label}
              </Tag>
            )}
          </Space>
        </div>
      ),
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
          }}
        />
      ),
    },
    {
      title: 'Verif',
      key: 'verify',
      width: 82,
      align: 'center' as const,
      render: (_: unknown, row: PlayerRow) => (
        <Button
          size="small"
          disabled={!row.verify_token || !onOpenVerify}
          onClick={() => onOpenVerify?.(row)}
        >
          Abrir
        </Button>
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
    }
  ];

  return (
    <div>
      <Text
        strong
        style={{ display: 'block', marginBottom: 8, color: '#FAAD14', fontSize: 14 }}
      >
        {title}
      </Text>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Space wrap size={[6, 6]}>
          <Tag color="gold" style={{ marginInlineEnd: 0 }}>
            Presentes: {presentes}/{rows.length}
          </Tag>
          <Tag color="green" style={{ marginInlineEnd: 0 }}>
            Credenciales vigentes: {vigentes}/{rows.length}
          </Tag>
        </Space>
        <Space wrap size={[6, 6]}>
          <Button size="small" onClick={() => markAll(true)}>
            Todos presentes
          </Button>
          <Button size="small" onClick={() => markAll(false)}>
            Limpiar
          </Button>
        </Space>
      </div>
      <Table
        dataSource={rows}
        columns={cols}
        rowKey="player_id"
        size="small"
        pagination={false}
        scroll={{ x: 540 }}
        rowClassName={(row) =>
          !row.played
            ? ''
            : row.credential_status === 'active'
              ? 'row-leader'
              : ''
        }
      />
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('');
}
