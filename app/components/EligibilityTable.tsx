'use client';

import { Table, Tag, Typography } from 'antd';
import type { EligibilityResult } from '@/lib/eligibility';

const { Text } = Typography;

interface Props {
  data: EligibilityResult[];
  totalPartidos: number;
}

export default function EligibilityTable({ data, totalPartidos }: Props) {
  const minReq = Math.floor(totalPartidos / 2) + 1;

  const cols = [
    {
      title: 'Jugador',
      dataIndex: 'nombre',
      key: 'nombre',
      ellipsis: true,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Asistencias',
      dataIndex: 'asistencias',
      key: 'asistencias',
      width: 110,
      align: 'center' as const,
      render: (v: number) => <Text>{v}</Text>,
    },
    {
      title: `Mín. (${minReq})`,
      dataIndex: 'min_requerido',
      key: 'min_requerido',
      width: 90,
      align: 'center' as const,
      render: () => <Text style={{ color: '#888' }}>{minReq}</Text>,
    },
    {
      title: 'Estatus',
      dataIndex: 'elegible',
      key: 'elegible',
      width: 140,
      align: 'center' as const,
      render: (v: boolean) =>
        v
          ? <Tag color="success">✅ Elegible</Tag>
          : <Tag color="error">❌ No elegible</Tag>,
    },
  ];

  return (
    <Table
      dataSource={data}
      columns={cols}
      rowKey="jugador_id"
      size="small"
      pagination={false}
      scroll={{ x: 460 }}
      caption={
        totalPartidos > 0
          ? `Partidos del equipo: ${totalPartidos} | Mínimo requerido: ${minReq}`
          : 'Sin partidos registrados'
      }
      locale={{
        emptyText: (
          <Text style={{ color: '#555' }}>
            Selecciona un equipo para ver la elegibilidad
          </Text>
        ),
      }}
    />
  );
}
