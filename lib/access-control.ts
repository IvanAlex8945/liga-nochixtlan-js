export type AdminRole =
  | 'super_admin'
  | 'registro_equipos'
  | 'programacion'
  | 'captura_resultados';

export type AdminPermission =
  | 'view_admin_dashboard'
  | 'manage_seasons'
  | 'manage_teams'
  | 'manage_calendar'
  | 'manage_capture'
  | 'view_eligibility'
  | 'manage_access';

export type AdminModuleKey =
  | 'dashboard'
  | 'seasons'
  | 'teams'
  | 'calendar'
  | 'capture'
  | 'eligibility'
  | 'access';

export interface AdminRoleDefinition {
  label: string;
  description: string;
  permissions: AdminPermission[];
}

export interface AdminModuleDefinition {
  key: AdminModuleKey;
  path: string;
  title: string;
  navLabel: string;
  desc: string;
  step: number;
  requiredPermission: AdminPermission | null;
}

export interface AdminAccessSnapshot {
  email: string | null;
  role: AdminRole | null;
  roleLabel: string | null;
  permissions: AdminPermission[];
}

const roleDefinitions: Record<AdminRole, AdminRoleDefinition> = {
  super_admin: {
    label: 'Administrador General',
    description: 'Acceso total a todos los modulos administrativos.',
    permissions: [
      'view_admin_dashboard',
      'manage_seasons',
      'manage_teams',
      'manage_calendar',
      'manage_capture',
      'view_eligibility',
      'manage_access',
    ],
  },
  registro_equipos: {
    label: 'Encargado de Equipos',
    description: 'Gestiona equipos, jugadores y cedulas de registro.',
    permissions: ['view_admin_dashboard', 'manage_teams'],
  },
  programacion: {
    label: 'Encargado de Calendario',
    description: 'Programa partidos, jornadas, canchas y horarios.',
    permissions: ['view_admin_dashboard', 'manage_calendar'],
  },
  captura_resultados: {
    label: 'Capturista de Resultados',
    description: 'Registra puntajes, asistencia y estados de juego.',
    permissions: ['view_admin_dashboard', 'manage_capture', 'view_eligibility'],
  },
};

export const adminModules: AdminModuleDefinition[] = [
  {
    key: 'dashboard',
    path: '/admin',
    title: 'Dashboard',
    navLabel: 'Dashboard',
    desc: 'Resumen del panel administrativo',
    step: 0,
    requiredPermission: null,
  },
  {
    key: 'seasons',
    path: '/admin/seasons',
    title: 'Temporadas',
    navLabel: 'Temporadas',
    desc: 'Crear y gestionar torneos',
    step: 1,
    requiredPermission: 'manage_seasons',
  },
  {
    key: 'teams',
    path: '/admin/teams',
    title: 'Equipos',
    navLabel: 'Equipos',
    desc: 'Registrar equipos y cedulas',
    step: 2,
    requiredPermission: 'manage_teams',
  },
  {
    key: 'calendar',
    path: '/admin/calendar',
    title: 'Calendario',
    navLabel: 'Calendario',
    desc: 'Programar y editar partidos',
    step: 3,
    requiredPermission: 'manage_calendar',
  },
  {
    key: 'capture',
    path: '/admin/capture',
    title: 'Captura',
    navLabel: 'Captura',
    desc: 'Registrar resultados y W.O.',
    step: 4,
    requiredPermission: 'manage_capture',
  },
  {
    key: 'eligibility',
    path: '/admin/eligibility',
    title: 'Elegibilidad',
    navLabel: 'Elegibilidad',
    desc: 'Reportes y validacion de liguilla',
    step: 5,
    requiredPermission: 'view_eligibility',
  },
  {
    key: 'access',
    path: '/admin/access',
    title: 'Accesos',
    navLabel: 'Accesos',
    desc: 'Ver roles, permisos y asignaciones',
    step: 6,
    requiredPermission: 'manage_access',
  },
];

const localRoleAssignments: Record<string, AdminRole> = {
  'admin1@liganochixtlan.com': 'super_admin',
  'admin2@liganochixtlan.com': 'registro_equipos',
  'admin3@liganochixtlan.com': 'programacion',
  'captura@liganochixtlan.com': 'captura_resultados',
};

function parseRoleOverridesFromEnv(): Record<string, AdminRole> {
  const raw = process.env.ADMIN_ROLE_OVERRIDES_JSON;

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const overrides: Record<string, AdminRole> = {};

    for (const [email, role] of Object.entries(parsed)) {
      if (isAdminRole(role)) {
        overrides[email.trim().toLowerCase()] = role;
      }
    }

    return overrides;
  } catch {
    return {};
  }
}

function getRoleAssignments(): Record<string, AdminRole> {
  return {
    ...localRoleAssignments,
    ...parseRoleOverridesFromEnv(),
  };
}

export function isAdminRole(value: string): value is AdminRole {
  return value in roleDefinitions;
}

export function getRoleDefinitions() {
  return roleDefinitions;
}

export function getLocalRoleAssignments() {
  return getRoleAssignments();
}

export function getRoleForEmail(email: string | null | undefined): AdminRole | null {
  if (!email) {
    return null;
  }

  return getRoleAssignments()[email.trim().toLowerCase()] ?? null;
}

export function getPermissionsForRole(role: AdminRole | null): AdminPermission[] {
  if (!role) {
    return [];
  }

  return roleDefinitions[role].permissions;
}

export function hasPermission(
  roleOrPermissions: AdminRole | AdminPermission[] | null,
  permission: AdminPermission
): boolean {
  const permissions = Array.isArray(roleOrPermissions)
    ? roleOrPermissions
    : getPermissionsForRole(roleOrPermissions);

  return permissions.includes(permission);
}

export function getRequiredPermissionForPath(pathname: string): AdminPermission | null {
  const matchedModule = adminModules.find((module) => {
    if (module.path === '/admin') {
      return pathname === '/admin';
    }

    return pathname === module.path || pathname.startsWith(`${module.path}/`);
  });

  return matchedModule?.requiredPermission ?? null;
}

export function canAccessPath(pathname: string, role: AdminRole | null): boolean {
  if (!role) {
    return false;
  }

  const requiredPermission = getRequiredPermissionForPath(pathname);

  if (!requiredPermission) {
    return pathname === '/admin';
  }

  return hasPermission(role, requiredPermission);
}

export function getVisibleAdminModules(permissions: AdminPermission[]) {
  return adminModules.filter((module) => {
    if (!module.requiredPermission) {
      return true;
    }

    return permissions.includes(module.requiredPermission);
  });
}

export function buildAccessSnapshot(email: string | null | undefined): AdminAccessSnapshot {
  const role = getRoleForEmail(email);
  const permissions = getPermissionsForRole(role);

  return {
    email: email ?? null,
    role,
    roleLabel: role ? roleDefinitions[role].label : null,
    permissions,
  };
}
