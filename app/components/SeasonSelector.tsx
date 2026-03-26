'use client';

import { Select, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const { Text } = Typography;

interface Props {
  value: number | null;
  onChange: (id: number) => void;
  style?: React.CSSProperties;
}

export interface SeasonOption {
  id: number;
  name: string;
  category: string;
  is_active: boolean;
}

export default function SeasonSelector({ value, onChange, style }: Props) {
  const { data: seasons = [] } = useQuery<SeasonOption[]>({
    queryKey: ['all-seasons'],
    queryFn: async () => {
      const { data } = await supabase
        .from('seasons')
        .select('id, name, category, is_active')
        .order('id', { ascending: false });
      return data ?? [];
    },
  });

  const options = seasons.map((s) => ({
    label: `${s.name} (${s.category})${s.is_active ? ' ✓' : ''}`,
    value: s.id,
  }));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      <Text style={{ color: '#888', whiteSpace: 'nowrap', fontSize: 13 }}>Temporada:</Text>
      <Select
        value={value}
        onChange={onChange}
        options={options}
        style={{ minWidth: 240 }}
        placeholder="Seleccionar temporada"
        dropdownStyle={{ background: '#1a1a1a', borderColor: '#333' }}
        showSearch
        filterOption={(input, opt) =>
          (opt?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
        }
      />
    </div>
  );
}
