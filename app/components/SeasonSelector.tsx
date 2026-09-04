'use client';

import { useEffect } from 'react';
import { Select, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAdminStore } from '@/lib/admin-store';

const { Text } = Typography;

interface Props {
  value?: number | null;
  onChange?: (id: number) => void;
  includeInactive?: boolean;
  style?: React.CSSProperties;
}

export interface SeasonOption {
  id: number;
  name: string;
  category: string;
  is_active: boolean;
}

export default function SeasonSelector({
  value: propValue,
  onChange: propOnChange,
  includeInactive = false,
  style,
}: Props) {
  const storeSeasonId = useAdminStore((s) => s.selectedSeasonId);
  const setStoreSeasonId = useAdminStore((s) => s.setSelectedSeasonId);
  const initializeSeason = useAdminStore((s) => s.initializeSeason);

  const value = propValue !== undefined ? propValue : storeSeasonId;

  const { data: seasons = [] } = useQuery<SeasonOption[]>({
    queryKey: ['seasons-selector', includeInactive ? 'all' : 'active'],
    queryFn: async () => {
      let query = supabase
        .from('seasons')
        .select('id, name, category, is_active')
        .order('id', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  // Automatically initialize season store when active seasons load
  useEffect(() => {
    if (seasons.length > 0) {
      const activeOnly = seasons.filter((s) => s.is_active);
      initializeSeason(activeOnly.length > 0 ? activeOnly : seasons);
    }
  }, [seasons, initializeSeason]);

  const handleChange = (id: number) => {
    if (propOnChange) {
      propOnChange(id);
    }
    setStoreSeasonId(id);
  };

  const options = seasons.map((s) => ({
    label: `${s.name} (${s.category})${s.is_active ? ' ✓' : ''}`,
    value: s.id,
  }));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      <Text style={{ color: '#888', whiteSpace: 'nowrap', fontSize: 13 }}>Temporada:</Text>
      <Select
        value={value}
        onChange={handleChange}
        options={options}
        style={{ minWidth: 240 }}
        placeholder="Seleccionar temporada"
        getPopupContainer={() => document.body}
        dropdownStyle={{ zIndex: 9999, background: '#1a1a1a', border: '1px solid #333' }}
      />
    </div>
  );
}
