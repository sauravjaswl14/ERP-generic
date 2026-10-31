import ResourcePage from '../components/ResourcePage';
import { Badge } from '../components/ui';
import { enumOptions, fmtDateTime } from '../lib/format';

const ROLES = enumOptions(['ADMIN', 'MANAGER', 'HR', 'SALES', 'PURCHASING', 'INVENTORY', 'ACCOUNTANT', 'EMPLOYEE']);

export function Users() {
  return (
    <ResourcePage
      title="Users"
      subtitle="Roles control which modules a person can see and change. Removing a user deactivates the account."
      singular="user"
      endpoint="/users"
      searchable
      canWrite
      canDelete
      deleteLabel="Deactivate"
      columns={[
        {
          header: 'Name',
          cell: (r) => (
            <div>
              <div className="font-medium text-slate-900">{r.name}</div>
              <div className="text-xs text-slate-500">{r.email}</div>
            </div>
          ),
        },
        { header: 'Role', cell: (r) => <Badge value={r.role} /> },
        { header: 'Active', cell: (r) => <Badge value={r.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
        { header: 'Created', cell: (r) => fmtDateTime(r.createdAt) },
      ]}
      fields={[
        { name: 'name', label: 'Full name', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'role', label: 'Role', type: 'select', required: true, options: ROLES, defaultValue: 'EMPLOYEE' },
        { name: 'password', label: 'Password', type: 'password', required: 'create', help: 'At least 8 characters. Leave blank to keep the current password.' },
        { name: 'isActive', label: 'Active', type: 'checkbox', help: 'Can sign in' },
      ]}
    />
  );
}

export function AuditLog() {
  return (
    <ResourcePage
      title="Audit log"
      subtitle="Who changed what, newest first."
      singular="entry"
      endpoint="/audit-logs"
      columns={[
        { header: 'When', cell: (r) => fmtDateTime(r.createdAt) },
        { header: 'User', cell: (r) => r.user?.name ?? 'System' },
        { header: 'Action', cell: (r) => <Badge value={r.action} /> },
        { header: 'Entity', cell: (r) => r.entity },
        { header: 'Record', cell: (r) => <span className="font-mono text-xs text-slate-500">{r.entityId ?? '—'}</span> },
      ]}
    />
  );
}
