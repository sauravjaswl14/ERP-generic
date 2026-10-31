import ResourcePage from '../components/ResourcePage';
import { Badge } from '../components/ui';
import { useAuth } from '../lib/auth';
import { canWrite } from '../lib/access';
import { enumOptions, fmtDate, fmtMoney } from '../lib/format';
import { L } from '../lib/lookups';

const PROJECT_STATUS = enumOptions(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']);
const TASK_STATUS = enumOptions(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']);
const PRIORITY = enumOptions(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export function Projects() {
  const { user } = useAuth();
  return (
    <ResourcePage
      title="Projects"
      singular="project"
      endpoint="/projects"
      searchable
      canWrite={canWrite(user?.role, 'projects')}
      canDelete
      filters={[{ name: 'status', label: 'Status', options: PROJECT_STATUS }]}
      columns={[
        { header: 'Code', cell: (r) => <span className="font-mono text-xs">{r.code}</span> },
        { header: 'Name', cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
        { header: 'Manager', cell: (r) => r.manager?.name ?? '—' },
        { header: 'Timeline', cell: (r) => `${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}` },
        { header: 'Budget', cell: (r) => <span className="tabular-nums">{fmtMoney(r.budget)}</span> },
        { header: 'Tasks', cell: (r) => r._count?.tasks ?? 0 },
        { header: 'Status', cell: (r) => <Badge value={r.status} /> },
      ]}
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'status', label: 'Status', type: 'select', required: true, options: PROJECT_STATUS },
        { name: 'managerId', label: 'Manager', type: 'select', lookup: L.users },
        { name: 'startDate', label: 'Start date', type: 'date' },
        { name: 'endDate', label: 'End date', type: 'date' },
        { name: 'budget', label: 'Budget', type: 'number', min: 0 },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}

export function Tasks() {
  const { user } = useAuth();
  return (
    <ResourcePage
      title="Tasks"
      singular="task"
      endpoint="/tasks"
      searchable
      canWrite={canWrite(user?.role, 'projects')}
      canDelete
      filters={[
        { name: 'status', label: 'Status', options: TASK_STATUS },
      ]}
      columns={[
        { header: 'Task', cell: (r) => <span className="font-medium text-slate-900">{r.title}</span> },
        { header: 'Project', cell: (r) => r.project.name },
        { header: 'Assignee', cell: (r) => r.assignee?.name ?? '—' },
        { header: 'Due', cell: (r) => fmtDate(r.dueDate) },
        { header: 'Priority', cell: (r) => <Badge value={r.priority} /> },
        { header: 'Status', cell: (r) => <Badge value={r.status} /> },
      ]}
      fields={[
        { name: 'title', label: 'Title', required: true, wide: true },
        { name: 'projectId', label: 'Project', type: 'select', required: true, lookup: L.projects },
        { name: 'assigneeId', label: 'Assignee', type: 'select', lookup: L.users },
        { name: 'status', label: 'Status', type: 'select', required: true, options: TASK_STATUS },
        { name: 'priority', label: 'Priority', type: 'select', required: true, options: PRIORITY, defaultValue: 'MEDIUM' },
        { name: 'dueDate', label: 'Due date', type: 'date' },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}
