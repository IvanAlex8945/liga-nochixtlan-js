import { describe, expect, it } from 'vitest';
import { useAdminStore } from '../lib/admin-store';

describe('Operational Dashboard & App Shell Contracts', () => {
  // -------------------------------------------------------------
  // 1. KPI Metric Calculations
  // -------------------------------------------------------------
  describe('KPI Metric Calculations', () => {
    interface MatchRecord {
      id: number;
      jornada: number | null;
      status: string;
    }

    function calculateKpis(matches: MatchRecord[], teamsCount: number, playersCount: number) {
      const totalTeams = teamsCount;
      const totalPlayers = playersCount;
      const totalMatches = matches.length;
      const playedMatches = matches.filter((m) => m.status === 'Jugado').length;
      const pendingMatches = matches.filter(
        (m) => m.status !== 'Jugado' && m.status !== 'Cancelado' && m.status !== 'No Necesario'
      );
      const progressPercent = totalMatches > 0 ? Math.round((playedMatches / totalMatches) * 100) : 0;

      return {
        totalTeams,
        totalPlayers,
        totalMatches,
        playedMatches,
        pendingCount: pendingMatches.length,
        progressPercent,
        topPending: pendingMatches.sort((a, b) => (a.jornada ?? 0) - (b.jornada ?? 0)).slice(0, 5),
      };
    }

    it('calculates progress percentage and pending matches accurately with mixed statuses', () => {
      const matches: MatchRecord[] = [
        { id: 1, jornada: 1, status: 'Jugado' },
        { id: 2, jornada: 1, status: 'Jugado' },
        { id: 3, jornada: 2, status: 'Programado' },
        { id: 4, jornada: 2, status: 'Pendiente' },
        { id: 5, jornada: 3, status: 'Cancelado' },
        { id: 6, jornada: 3, status: 'No Necesario' },
      ];

      const result = calculateKpis(matches, 8, 85);
      expect(result.totalTeams).toBe(8);
      expect(result.totalPlayers).toBe(85);
      expect(result.totalMatches).toBe(6);
      expect(result.playedMatches).toBe(2);
      expect(result.pendingCount).toBe(2); // Only Programado & Pendiente (excluding Cancelado and No Necesario)
      expect(result.progressPercent).toBe(33); // 2/6 = 33.33% -> 33%
    });

    it('handles empty season safely without division by zero NaN', () => {
      const result = calculateKpis([], 0, 0);
      expect(result.totalTeams).toBe(0);
      expect(result.totalMatches).toBe(0);
      expect(result.playedMatches).toBe(0);
      expect(result.pendingCount).toBe(0);
      expect(result.progressPercent).toBe(0);
      expect(Number.isNaN(result.progressPercent)).toBe(false);
    });

    it('computes 100% progress when all matches are played', () => {
      const matches: MatchRecord[] = [
        { id: 1, jornada: 1, status: 'Jugado' },
        { id: 2, jornada: 1, status: 'Jugado' },
        { id: 3, jornada: 2, status: 'Jugado' },
        { id: 4, jornada: 2, status: 'Jugado' },
      ];

      const result = calculateKpis(matches, 4, 40);
      expect(result.progressPercent).toBe(100);
      expect(result.pendingCount).toBe(0);
      expect(result.topPending).toHaveLength(0);
    });

    it('sorts pending matches by jornada ascending so earliest pending match appears first', () => {
      const matches: MatchRecord[] = [
        { id: 10, jornada: 5, status: 'Programado' },
        { id: 11, jornada: 2, status: 'Pendiente' },
        { id: 12, jornada: 3, status: 'Programado' },
        { id: 13, jornada: 1, status: 'Pendiente' },
      ];

      const result = calculateKpis(matches, 6, 60);
      expect(result.pendingCount).toBe(4);
      expect(result.topPending[0].jornada).toBe(1);
      expect(result.topPending[1].jornada).toBe(2);
      expect(result.topPending[2].jornada).toBe(3);
      expect(result.topPending[3].jornada).toBe(5);
    });

    it('caps topPending matches at 5 maximum for compact dashboard rendering', () => {
      const matches: MatchRecord[] = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        jornada: i + 1,
        status: 'Pendiente',
      }));

      const result = calculateKpis(matches, 10, 100);
      expect(result.pendingCount).toBe(12);
      expect(result.topPending).toHaveLength(5);
    });
  });

  // -------------------------------------------------------------
  // 2. Breadcrumbs Formatting
  // -------------------------------------------------------------
  describe('Admin Breadcrumb Hierarchy', () => {
    function getBreadcrumbLabels(path: string): string[] {
      const segments = path.split('/').filter(Boolean);
      const labels = ['Admin'];

      if (segments.length <= 1) {
        labels.push('Inicio');
      } else if (segments[1] === 'teams') {
        labels.push('Equipos');
        if (segments.includes('cedula')) {
          labels.push('Cédula de Juego');
        }
      } else if (segments[1] === 'calendar') {
        labels.push('Calendario');
      } else if (segments[1] === 'capture') {
        labels.push('Captura');
      } else if (segments[1] === 'eligibility') {
        labels.push('Elegibilidad');
      } else if (segments[1] === 'seasons') {
        labels.push('Temporadas');
      } else if (segments[1] === 'access') {
        labels.push('Roles y Permisos');
      } else {
        labels.push(segments[1]);
      }
      return labels;
    }

    it('resolves breadcrumbs for all primary admin routes', () => {
      expect(getBreadcrumbLabels('/admin')).toEqual(['Admin', 'Inicio']);
      expect(getBreadcrumbLabels('/admin/teams')).toEqual(['Admin', 'Equipos']);
      expect(getBreadcrumbLabels('/admin/calendar')).toEqual(['Admin', 'Calendario']);
      expect(getBreadcrumbLabels('/admin/capture')).toEqual(['Admin', 'Captura']);
      expect(getBreadcrumbLabels('/admin/eligibility')).toEqual(['Admin', 'Elegibilidad']);
      expect(getBreadcrumbLabels('/admin/seasons')).toEqual(['Admin', 'Temporadas']);
      expect(getBreadcrumbLabels('/admin/access')).toEqual(['Admin', 'Roles y Permisos']);
    });

    it('resolves nested player cedula route correctly', () => {
      expect(getBreadcrumbLabels('/admin/teams/42/cedula')).toEqual([
        'Admin',
        'Equipos',
        'Cédula de Juego',
      ]);
    });
  });

  // -------------------------------------------------------------
  // 3. App Shell Season Synchronization
  // -------------------------------------------------------------
  describe('App Shell Season Store Synchronization', () => {
    it('allows changing season globally through useAdminStore', () => {
      useAdminStore.getState().clearSeason();
      expect(useAdminStore.getState().selectedSeasonId).toBeNull();

      useAdminStore.getState().setSelectedSeasonId(7);
      expect(useAdminStore.getState().selectedSeasonId).toBe(7);

      useAdminStore.getState().setSelectedSeasonId(12);
      expect(useAdminStore.getState().selectedSeasonId).toBe(12);
    });
  });
});
