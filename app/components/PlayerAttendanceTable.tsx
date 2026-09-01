'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Table, Checkbox, InputNumber, Typography, Button, Space, Tag } from 'antd';

import { formatPlayerNumber } from '@/lib/player-number';

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
  const scoringRows = rows
    .map((row) => ({
      ...row,
      points: Number(row.points) || 0,
      triples: Number(row.triples) || 0,
    }))
    .filter((row) => row.played && row.points > 0);
  const totalPoints = scoringRows.reduce((acc, row) => acc + row.points, 0);
  const scoringRowsWithRunning = scoringRows.reduce<Array<PlayerRow & { runningPoints: number }>>(
    (acc, row) => {
      const previous = acc.at(-1)?.runningPoints ?? 0;
      acc.push({ ...row, runningPoints: previous + row.points });
      return acc;
    },
    []
  );

  const cols = [
    {
      title: '',
      key: 'photo',
      width: 76,
      fixed: 'left' as const,
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
      width: 58,
      fixed: 'left' as const,
      align: 'center' as const,
      render: (v: number | null) => <Text strong style={{ color: '#f7d774', fontSize: 16 }}>{formatPlayerNumber(v)}</Text>,
    },
    {
      title: 'Jugador',
      dataIndex: 'name',
      key: 'name',
      width: 280,
      fixed: 'left' as const,
      ellipsis: true,
      render: (v: string, row: PlayerRow) => (
        <div>
          <Text strong style={{ fontSize: 15 }}>{v}</Text>
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
      width: 64,
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
      width: 96,
      align: 'center' as const,
      render: (_: unknown, row: PlayerRow) => (
        <Button
          size="middle"
          disabled={!row.verify_token || !onOpenVerify}
          onClick={() => onOpenVerify?.(row)}
        >
          Abrir
        </Button>
      ),
    },
    {
      title: 'Puntos',
      key: 'points',
      width: 118,
      align: 'center' as const,
      render: (_: unknown, row: PlayerRow, idx: number) => (
        <InputNumber
          min={0}
          max={99}
          value={row.points}
          disabled={disableStats || !row.played}
          onChange={(v) => update(idx, { points: v ?? 0 })}
          style={{ width: 88 }}
          size="middle"
        />
      ),
    },
    {
      title: '3PT',
      key: 'triples',
      width: 112,
      align: 'center' as const,
      render: (_: unknown, row: PlayerRow, idx: number) => (
        <InputNumber
          min={0}
          max={30}
          value={row.triples}
          disabled={disableStats || !row.played}
          onChange={(v) => update(idx, { triples: v ?? 0 })}
          style={{ width: 82 }}
          size="middle"
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
        className="capture-attendance-table"
        dataSource={rows}
        columns={cols}
        rowKey="player_id"
        size="middle"
        pagination={false}
        sticky
        scroll={{ x: 860 }}
        rowClassName={(row) =>
          !row.played
            ? ''
            : row.credential_status === 'active'
              ? 'row-leader'
              : ''
        }
      />
      <div className="capture-team-score-summary">
        <div className="capture-team-score-header">
          <Text strong>Registro de puntos</Text>
          <Text strong className="capture-team-score-total">
            Total: {totalPoints}
          </Text>
        </div>
        {scoringRows.length > 0 ? (
          <div className="capture-team-score-list">
            {scoringRowsWithRunning.map((row) => (
              <div className="capture-team-score-row" key={row.player_id}>
                <Text className="capture-team-score-player">
                  {formatPlayerNumber(row.number)} - {row.name}
                </Text>
                <Text className="capture-team-score-points">
                  {row.points} pts
                </Text>
                <Text className="capture-team-score-triples">
                  {row.triples} 3PT
                </Text>
                <Text className="capture-team-score-running">
                  Acum. {row.runningPoints}
                </Text>
              </div>
            ))}
          </div>
        ) : (
          <Text type="secondary" className="capture-team-score-empty">
            Aun no hay puntos capturados para este equipo.
          </Text>
        )}
      </div>
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
