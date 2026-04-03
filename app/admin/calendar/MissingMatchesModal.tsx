'use client';
import React, { useState, useMemo } from 'react';
import { Modal, Table, Button, Select, InputNumber, Space, DatePicker, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const COURTS = ['Cancha Bicentenario', 'Cancha Techada', 'Cancha III'];
const TIMES = ['06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM'];

interface Team { id: number; name: string; }
interface MatchData { home_team_id: number; away_team_id: number; phase: string; }
interface MissingMatch { key: string; home: Team; away: Team; }
interface RowState { jornada?: number; court?: string | null; time_str?: string | null; scheduled_date?: dayjs.Dayjs | null; }
interface MutationVars { home_team_id: number; away_team_id: number; jornada: number; court: string | null; time_str: string | null; scheduled_date: string | null; }

interface MissingMatchesModalProps {
  open: boolean;
  onClose: () => void;
  seasonId: number;
  teams: Team[];
  matches: MatchData[];
}

export default function MissingMatchesModal({ open, onClose, seasonId, teams, matches }: MissingMatchesModalProps) {
  const qc = useQueryClient();
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  // Calcular partidos faltantes
  const missingMatches = useMemo(() => {
    const faltantes: MissingMatch[] = [];
    teams.forEach((local) => {
      teams.forEach((visitante) => {
        if (local.id === visitante.id) return;
        
        const exist = matches.find(
          (m) =>
            m.home_team_id === local.id &&
            m.away_team_id === visitante.id &&
            m.phase === 'Fase Regular'
        );

        if (!exist) {
          faltantes.push({
            key: `${local.id}-${visitante.id}`,
            home: local,
            away: visitante,
          });
        }
      });
    });
    return faltantes;
  }, [teams, matches]);

  const createMissingMatch = useMutation({
    mutationFn: async (vars: MutationVars) => {
      const { error } = await supabase.from('matches').insert({
        season_id: seasonId,
        phase: 'Fase Regular',
        status: 'Programado',
        ...vars
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matches'] });
      message.success('Partido programado con éxito');
    },
    onError: (e: Error) => message.error(e.message),
  });

  const updateRowState = (key: string, field: keyof RowState, value: unknown) => {
    setRowStates((prev: Record<string, RowState>) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { jornada: 1 }), // default jornada
        [field]: value
      }
    }));
  };

  const attemptCreate = (record: MissingMatch) => {
    const s = rowStates[record.key] || { jornada: 1 }; // Default a J1
    if (!s.jornada) {
      message.error('Debes proporcionar una jornada.');
      return;
    }
    
    createMissingMatch.mutate({
      home_team_id: record.home.id,
      away_team_id: record.away.id,
      jornada: s.jornada,
      court: s.court || null,
      time_str: s.time_str || null,
      scheduled_date: s.scheduled_date ? s.scheduled_date.format('YYYY-MM-DD') : null,
    });
  };

  const columns = [
    {
      title: 'Enfrentamiento Faltante',
      key: 'matchup',
      render: (_: unknown, record: MissingMatch) => (
        <div>
          <b>{record.home.name}</b> <span style={{ color: '#666' }}>(Local)</span> 
          <br/>
          <span style={{ fontSize: 12, color: '#888' }}>vs</span>
          <br/>
          <b>{record.away.name}</b> <span style={{ color: '#666' }}>(Visita)</span>
        </div>
      ),
      width: 250,
    },
    {
      title: 'Jornada',
      key: 'jornada',
      render: (_: unknown, record: MissingMatch) => (
        <InputNumber 
          min={1} 
          value={rowStates[record.key]?.jornada || 1} 
          onChange={(val) => updateRowState(record.key, 'jornada', val)}
          style={{ width: 60 }}
        />
      ),
      width: 80,
    },
    {
      title: 'Fecha',
      key: 'date',
      render: (_: unknown, record: MissingMatch) => (
        <DatePicker 
          format="YYYY-MM-DD"
          value={rowStates[record.key]?.scheduled_date}
          onChange={(val) => updateRowState(record.key, 'scheduled_date', val)}
          style={{ width: 130 }}
        />
      ),
      width: 140,
    },
    {
      title: 'Cancha y Hora',
      key: 'court_time',
      render: (_: unknown, record: MissingMatch) => (
        <Space direction="vertical" size={2}>
          <Select 
            placeholder="Cancha"
            allowClear
            value={rowStates[record.key]?.court}
            onChange={(val) => updateRowState(record.key, 'court', val)}
            options={COURTS.map(c => ({ label: c, value: c }))}
            style={{ width: 160 }}
          />
          <Select 
            placeholder="Horario"
            allowClear
            value={rowStates[record.key]?.time_str}
            onChange={(val) => updateRowState(record.key, 'time_str', val)}
            options={TIMES.map(t => ({ label: t, value: t }))}
            style={{ width: 120 }}
          />
        </Space>
      ),
      width: 180,
    },
    {
      title: 'Acción',
      key: 'action',
      render: (_: unknown, record: MissingMatch) => (
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => attemptCreate(record)}
          loading={createMissingMatch.isPending && createMissingMatch.variables?.home_team_id === record.home.id}
        >
          Programar
        </Button>
      ),
      fixed: 'right' as const,
      width: 130,
    }
  ];

  return (
    <Modal
      title={<span style={{ color: '#FAAD14' }}>🔍 Revisión de Partidos Faltantes</span>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnClose
    >
      <div style={{ marginBottom: 16, color: '#ccc' }}>
        Se busca que cada equipo juegue de local contra todos los demás. 
        Tienes <b>{missingMatches.length}</b> partidos pendientes por programar en la primera fase.
      </div>
      <Table 
        dataSource={missingMatches} 
        columns={columns} 
        pagination={{ pageSize: 15 }} 
        scroll={{ x: 700, y: 500 }}
        size="small"
      />
    </Modal>
  );
}
