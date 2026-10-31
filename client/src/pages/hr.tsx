import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ResourcePage from '../components/ResourcePage';
import { Badge, Button, Card, Empty, ErrorBox, Modal, PageHeader, Spinner, Table } from '../components/ui';
import { api, Page, qs } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWrite } from '../lib/access';
import { enumOptions, fmtDate, fmtDateTime, fmtMoney, today } from '../lib/format';
import { L } from '../lib/lookups';

const EMP_STATUS = enumOptions(['ACTIVE', 'ON_LEAVE', 'TERMINATED']);
const LEAVE_TYPES = enumOptions(['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'OTHER']);
const REQ_STATUS = enumOptions(['PENDING', 'APPROVED', 'REJECTED']);
const ATT_STATUS = enumOptions(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY']);

export function Departments() {
  const { user } = useAuth();
  return (
    <ResourcePage
      title="Departments"
      singular="department"
      endpoint="/departments"
      searchable
      canWrite={canWrite(user?.role, 'hr')}
      canDelete
      columns={[
        { header: 'Code', cell: (r) => <span className="font-mono text-xs">{r.code}</span> },
        { header: 'Name', cell: (r) => r.name },
        { header: 'Description', cell: (r) => r.description ?? '—' },
      ]}
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}

export function Employees() {
  const { user } = useAuth();
  return (
    <ResourcePage
      title="Employees"
      singular="employee"
      endpoint="/employees"
      searchable
      canWrite={canWrite(user?.role, 'hr')}
      canDelete
      filters={[{ name: 'status', label: 'Status', options: EMP_STATUS }]}
      columns={[
        { header: 'Code', cell: (r) => <span className="font-mono text-xs">{r.code}</span> },
        {
          header: 'Name',
          cell: (r) => (
            <div>
              <div className="font-medium text-slate-900">
                {r.firstName} {r.lastName}
              </div>
              <div className="text-xs text-slate-500">{r.email}</div>
            </div>
          ),
        },
        { header: 'Position', cell: (r) => r.position },
        { header: 'Department', cell: (r) => r.department?.name ?? '—' },
        { header: 'Hired', cell: (r) => fmtDate(r.hireDate) },
        { header: 'Annual salary', cell: (r) => <span className="tabular-nums">{fmtMoney(r.salary)}</span> },
        { header: 'Status', cell: (r) => <Badge value={r.status} /> },
      ]}
      fields={[
        { name: 'code', label: 'Employee code', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'firstName', label: 'First name', required: true },
        { name: 'lastName', label: 'Last name', required: true },
        { name: 'phone', label: 'Phone' },
        { name: 'position', label: 'Position', required: true },
        { name: 'departmentId', label: 'Department', type: 'select', lookup: L.departments },
        { name: 'managerId', label: 'Manager', type: 'select', lookup: L.employees },
        { name: 'hireDate', label: 'Hire date', type: 'date', required: true, defaultValue: today() },
        { name: 'salary', label: 'Annual salary', type: 'number', required: true, min: 0 },
        { name: 'status', label: 'Status', type: 'select', required: true, options: EMP_STATUS },
      ]}
    />
  );
}

export function Leave() {
  const { user } = useAuth();
  const write = canWrite(user?.role, 'hr');
  return (
    <ResourcePage
      title="Leave requests"
      singular="leave request"
      endpoint="/leave-requests"
      canWrite={write}
      canDelete
      filters={[{ name: 'status', label: 'Status', options: REQ_STATUS }]}
      columns={[
        { header: 'Employee', cell: (r) => `${r.employee.firstName} ${r.employee.lastName}` },
        { header: 'Type', cell: (r) => <Badge value={r.type} /> },
        { header: 'From', cell: (r) => fmtDate(r.startDate) },
        { header: 'To', cell: (r) => fmtDate(r.endDate) },
        { header: 'Reason', cell: (r) => r.reason ?? '—' },
        { header: 'Status', cell: (r) => <Badge value={r.status} /> },
      ]}
      fields={[
        { name: 'employeeId', label: 'Employee', type: 'select', lookup: L.employees, required: true },
        { name: 'type', label: 'Type', type: 'select', required: true, options: LEAVE_TYPES },
        { name: 'startDate', label: 'Start date', type: 'date', required: true, defaultValue: today() },
        { name: 'endDate', label: 'End date', type: 'date', required: true, defaultValue: today() },
        { name: 'status', label: 'Status', type: 'select', required: true, options: REQ_STATUS },
        { name: 'reason', label: 'Reason', type: 'textarea' },
      ]}
      rowActions={(row, refresh) =>
        write && row.status === 'PENDING' ? <LeaveDecision id={row.id} onDone={refresh} /> : null
      }
    />
  );
}

function LeaveDecision({ id, onDone }: { id: string; onDone: () => void }) {
  const decide = useMutation({
    mutationFn: (status: 'APPROVED' | 'REJECTED') => api(`/leave-requests/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: onDone,
    onError: (e) => window.alert(e instanceof Error ? e.message : 'Failed'),
  });
  return (
    <>
      <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate('APPROVED')}>
        Approve
      </Button>
      <Button size="sm" variant="secondary" disabled={decide.isPending} onClick={() => decide.mutate('REJECTED')}>
        Reject
      </Button>
    </>
  );
}

export function Attendance() {
  const { user } = useAuth();
  return (
    <ResourcePage
      title="Attendance"
      singular="attendance record"
      endpoint="/attendance"
      canWrite={canWrite(user?.role, 'hr')}
      canDelete
      filters={[{ name: 'status', label: 'Status', options: ATT_STATUS }]}
      columns={[
        { header: 'Employee', cell: (r) => `${r.employee.firstName} ${r.employee.lastName}` },
        { header: 'Date', cell: (r) => fmtDate(r.date) },
        { header: 'Check in', cell: (r) => fmtDateTime(r.checkIn) },
        { header: 'Check out', cell: (r) => fmtDateTime(r.checkOut) },
        { header: 'Status', cell: (r) => <Badge value={r.status} /> },
      ]}
      fields={[
        { name: 'employeeId', label: 'Employee', type: 'select', lookup: L.employees, required: true },
        { name: 'date', label: 'Date', type: 'date', required: true, defaultValue: today() },
        { name: 'status', label: 'Status', type: 'select', required: true, options: ATT_STATUS },
      ]}
    />
  );
}

// ───────────── Payroll ─────────────
interface PayrollRow {
  id: string;
  period: string;
  basic: string;
  allowances: string;
  deductions: string;
  net: string;
  status: string;
  paidAt: string | null;
  employee: { firstName: string; lastName: string; code: string };
}

export function Payroll() {
  const { user } = useAuth();
  const write = canWrite(user?.role, 'payroll');
  const qc = useQueryClient();
  const [period, setPeriod] = useState(today().slice(0, 7));
  const [showGenerate, setShowGenerate] = useState(false);

  const list = useQuery({
    queryKey: ['payroll', period],
    queryFn: () => api<Page<PayrollRow>>(`/payroll${qs({ period, pageSize: 200 })}`),
  });
  const pay = useMutation({
    mutationFn: (id: string) => api(`/payroll/${id}/pay`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  });

  const rows = list.data?.data ?? [];
  const total = rows.reduce((s, r) => s + Number(r.net), 0);

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Monthly salary runs. Paying a line posts salaries expense against cash in the ledger."
        actions={write && <Button onClick={() => setShowGenerate(true)}>Generate payroll</Button>}
      />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <input type="month" className="input w-auto" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period" />
          <div className="text-sm text-slate-500">
            Net total: <span className="font-semibold text-slate-900">{fmtMoney(total)}</span>
          </div>
        </div>
        <div className="px-4 pt-4 empty:hidden">
          <ErrorBox error={pay.error ?? list.error} />
        </div>
        {list.isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <Empty>No payroll for {period}. {write ? 'Use “Generate payroll” to create it.' : ''}</Empty>
        ) : (
          <Table head={['Employee', 'Basic', 'Allowances', 'Deductions', 'Net pay', 'Status', '']}>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td">
                  {r.employee.firstName} {r.employee.lastName} <span className="text-xs text-slate-400">{r.employee.code}</span>
                </td>
                <td className="td tabular-nums">{fmtMoney(r.basic)}</td>
                <td className="td tabular-nums">{fmtMoney(r.allowances)}</td>
                <td className="td tabular-nums">{fmtMoney(r.deductions)}</td>
                <td className="td font-medium tabular-nums">{fmtMoney(r.net)}</td>
                <td className="td">
                  <Badge value={r.status} />
                </td>
                <td className="td text-right">
                  {write && r.status === 'DRAFT' && (
                    <Button size="sm" disabled={pay.isPending} onClick={() => pay.mutate(r.id)}>
                      Mark paid
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {showGenerate && (
        <GenerateForm
          period={period}
          onClose={() => setShowGenerate(false)}
          onDone={(p) => {
            setShowGenerate(false);
            setPeriod(p);
            qc.invalidateQueries({ queryKey: ['payroll'] });
          }}
        />
      )}
    </div>
  );
}

function GenerateForm({ period: initial, onClose, onDone }: { period: string; onClose: () => void; onDone: (period: string) => void }) {
  const [period, setPeriod] = useState(initial);
  const [allowances, setAllowances] = useState('0');
  const [rate, setRate] = useState('0');
  const gen = useMutation({
    mutationFn: () => api<{ created: number; skipped: number }>('/payroll/generate', { method: 'POST', body: { period, allowances: Number(allowances), deductionRate: Number(rate) } }),
    onSuccess: () => onDone(period),
  });
  return (
    <Modal title="Generate payroll" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          gen.mutate();
        }}
        className="space-y-4"
      >
        <ErrorBox error={gen.error} />
        <p className="text-sm text-slate-500">Creates a draft line for every active employee that does not have one yet (monthly basic = annual salary ÷ 12).</p>
        <div>
          <label className="label">Period</label>
          <input type="month" required className="input" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Allowances (per employee)</label>
            <input type="number" min={0} step="any" className="input" value={allowances} onChange={(e) => setAllowances(e.target.value)} />
          </div>
          <div>
            <label className="label">Deduction rate (% of basic)</label>
            <input type="number" min={0} max={100} step="any" className="input" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={gen.isPending}>
            {gen.isPending ? 'Generating…' : 'Generate'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
