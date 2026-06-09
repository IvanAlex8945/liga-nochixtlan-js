import { describe, expect, it } from 'vitest';

import {
  canAccessPath,
  getPermissionsForRole,
  getRoleForEmail,
  getVisibleAdminModules,
  hasPermission,
} from '../lib/access-control';

describe('access control', () => {
  it('resuelve rol por correo sin importar mayusculas', () => {
    expect(getRoleForEmail('ADMIN1@liganochixtlan.com')).toBe('super_admin');
    expect(getRoleForEmail('admin2@liganochixtlan.com')).toBe('registro_equipos');
  });

  it('expone permisos correctos por rol', () => {
    const permissions = getPermissionsForRole('programacion');

    expect(permissions).toContain('manage_calendar');
    expect(permissions).not.toContain('manage_capture');
  });

  it('valida acceso por ruta segun el rol', () => {
    expect(canAccessPath('/admin/calendar', 'programacion')).toBe(true);
    expect(canAccessPath('/admin/capture', 'programacion')).toBe(false);
    expect(canAccessPath('/admin', null)).toBe(false);
  });

  it('filtra modulos visibles por permisos', () => {
    const modules = getVisibleAdminModules(['view_admin_dashboard', 'manage_teams']);

    expect(modules.map((module) => module.key)).toEqual(['dashboard', 'teams']);
  });

  it('permite consultar permisos sobre un rol o una lista directa', () => {
    expect(hasPermission('super_admin', 'manage_access')).toBe(true);
    expect(hasPermission(['manage_capture'], 'manage_capture')).toBe(true);
    expect(hasPermission(['manage_capture'], 'manage_calendar')).toBe(false);
  });
});
