import { describe, expect, it } from 'vitest';
import { checkSchedulingConflicts } from '../lib/scheduling';

const teams = [
  { id: 1, name: 'ALACRANES' },
  { id: 2, name: 'MIXTECOS' },
  { id: 3, name: 'SKA-YAA' },
  { id: 4, name: 'OLIMPICOS' },
];

describe('checkSchedulingConflicts', () => {
  it('bloquea cancha y hora duplicadas en la misma jornada aunque no haya fecha', () => {
    const result = checkSchedulingConflicts({
      matches: [
        {
          id: 10,
          jornada: 14,
          home_team_id: 1,
          away_team_id: 2,
          scheduled_date: null,
          time_str: '06:00 PM',
          court: 'Cancha Bicentenario',
        },
      ],
      teams,
      homeTeamId: 3,
      awayTeamId: 4,
      jornada: 14,
      scheduledDate: null,
      timeStr: '06:00 PM',
      court: 'Cancha Bicentenario',
    });

    expect(result.blocking).toContain('Cancha Bicentenario ya está ocupada en la J14 a las 06:00 PM.');
  });

  it('permite la misma jornada, hora y cancha cuando las fechas son diferentes', () => {
    const result = checkSchedulingConflicts({
      matches: [
        {
          id: 10,
          jornada: 14,
          home_team_id: 1,
          away_team_id: 2,
          scheduled_date: '2026-05-30',
          time_str: '06:00 PM',
          court: 'Cancha Bicentenario',
        },
      ],
      teams,
      homeTeamId: 3,
      awayTeamId: 4,
      jornada: 14,
      scheduledDate: '2026-06-06',
      timeStr: '06:00 PM',
      court: 'Cancha Bicentenario',
    });

    expect(result.blocking).toEqual([]);
  });
});
