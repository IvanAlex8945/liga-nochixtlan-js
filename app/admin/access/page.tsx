import AccessControlPage from '@/app/components/AccessControlPage';
import { getLocalRoleAssignments, getRoleDefinitions, type AdminRole } from '@/lib/access-control';

export default function AdminAccessPage() {
  const roleDefinitions = getRoleDefinitions();
  const roles = (Object.entries(roleDefinitions) as [AdminRole, (typeof roleDefinitions)[AdminRole]][]).map(
    ([role, definition]) => ({
      role,
      label: definition.label,
      description: definition.description,
      permissions: definition.permissions,
    })
  );

  const assignments = Object.entries(getLocalRoleAssignments()).map(([email, role]) => ({
    email,
    role,
    roleLabel: roleDefinitions[role].label,
  }));

  return <AccessControlPage roles={roles} assignments={assignments} />;
}
