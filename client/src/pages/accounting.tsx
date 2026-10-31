import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ResourcePage from '../components/ResourcePage';
import { Badge, Button, Card, Empty, ErrorBox, Modal, PageHeader, Spinner, Stat, Table } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWrite } from '../lib/access';
import { enumOptions, fmtDate, fmtMoney, today } from '../lib/format';
import { L, useLookup } from '../lib/lookups';

const ACCOUNT_TYPES = enumOptions(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']);

export function Accounts() {
  const { user } = useAuth();
  return (
    <ResourcePage
      title="Chart of accounts"
      subtitle="Accounts 1000, 1100, 1200, 2000, 2100, 4000, 5000 and 5100 are used by automatic postings — do not remove them."
      singular="account"
      endpoint="/accounts"
      searchable
      canWrite={canWrite(user?.role, 'accounting')}
      canDelete
      filters={[{ name: 'type', label: 'Type', options: ACCOUNT_TYPES }]}
      columns={[
        { header: 'Code', cell: (r) => <span className="font-mono text-xs">{r.code}</span> },
        { header: 'Name', cell: (r) => r.name },
        { header: 'Type', cell: (r) => <Badge value={r.type} /> },
        { header: 'Active', cell: (r) => (r.isActive ? 'Yes' : 'No') },
      ]}
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'type', label: 'Type', type: 'select', required: true, options: ACCOUNT_TYPES },
        { name: 'isActive', label: 'Active', type: 'checkbox', help: 'Available for new journal entries' },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

export function Journal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const write = canWrite(user?.role, 'accounting');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Row | null>(null);
  return (
    <>
      <ResourcePage
        title="Journal"
        subtitle="Every posting in the ledger. Sales, purchases, payments and payroll post here automatically."
        singular="journal entry"
        endpoint="/accounting/journal-entries"
        searchable
        headerActions={write && <Button onClick={() => setCreating(true)}>+ New journal entry</Button>}
        columns={[
          { header: 'Number', cell: (r) => <span className="font-mono text-xs font-medium">{r.number}</span> },
          { header: 'Date', cell: (r) => fmtDate(r.date) },
          { header: 'Description', cell: (r) => r.description },
          { header: 'Reference', cell: (r) => r.reference ?? '—' },
          { header: 'Amount', cell: (r) => <span className="tabular-nums">{fmtMoney(r.lines.reduce((s: number, l: Row) => s + Number(l.debit), 0))}</span> },
        ]}
        rowActions={(r) => (
          <Button size="sm" variant="secondary" onClick={() => setViewing(r)}>
            View
          </Button>
        )}
      />
      {viewing && (
        <Modal title={`${viewing.number} · ${viewing.description}`} onClose={() => setViewing(null)}>
          <Table head={['Account', 'Debit', 'Credit']}>
            {viewing.lines.map((l: Row) => (
              <tr key={l.id}>
                <td className="td">
                  {l.account.code} · {l.account.name}
                </td>
                <td className="td tabular-nums">{Number(l.debit) ? fmtMoney(l.debit) : ''}</td>
                <td className="td tabular-nums">{Number(l.credit) ? fmtMoney(l.credit) : ''}</td>
              </tr>
            ))}
          </Table>
        </Modal>
      )}
      {creating && (
        <EntryForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            qc.invalidateQueries({ queryKey: ['resource', '/accounting/journal-entries'] });
            qc.invalidateQueries({ queryKey: ['trial-balance'] });
          }}
        />
      )}
    </>
  );
}

interface EntryLine {
  accountId: string;
  debit: string;
  credit: string;
}

function EntryForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const accounts = useLookup(L.accounts);
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<EntryLine[]>([
    { accountId: '', debit: '', credit: '' },
    { accountId: '', debit: '', credit: '' },
  ]);
  const set = (i: number, patch: Partial<EntryLine>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const debit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const credit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = Math.round(debit * 100) === Math.round(credit * 100) && debit > 0;

  const save = useMutation({
    mutationFn: () =>
      api('/accounting/journal-entries', {
        method: 'POST',
        body: {
          date,
          description,
          reference: reference || null,
          lines: lines.map((l) => ({ accountId: l.accountId, debit: Number(l.debit || 0), credit: Number(l.credit || 0) })),
        },
      }),
    onSuccess: onSaved,
  });

  return (
    <Modal title="New journal entry" onClose={onClose} wide>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <ErrorBox error={save.error} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description *</label>
            <input className="input" required value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <label className="label">Reference</label>
            <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <select className="input col-span-12 sm:col-span-6" required aria-label="Account" value={l.accountId} onChange={(e) => set(i, { accountId: e.target.value })}>
                <option value="">Select account…</option>
                {(accounts.data ?? []).map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              <input className="input col-span-5 sm:col-span-3" type="number" min={0} step="0.01" placeholder="Debit" aria-label="Debit" value={l.debit} onChange={(e) => set(i, { debit: e.target.value, credit: e.target.value ? '' : l.credit })} />
              <input className="input col-span-5 sm:col-span-2" type="number" min={0} step="0.01" placeholder="Credit" aria-label="Credit" value={l.credit} onChange={(e) => set(i, { credit: e.target.value, debit: e.target.value ? '' : l.debit })} />
              <button type="button" className="col-span-2 text-slate-400 hover:text-red-600 sm:col-span-1" disabled={lines.length <= 2} aria-label="Remove line" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}>
                ✕
              </button>
            </div>
          ))}
          <Button type="button" size="sm" variant="secondary" onClick={() => setLines((ls) => [...ls, { accountId: '', debit: '', credit: '' }])}>
            + Add line
          </Button>
        </div>
        <div className={`flex justify-between rounded-lg px-3 py-2 text-sm ${balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          <span>
            Debits {fmtMoney(debit)} · Credits {fmtMoney(credit)}
          </span>
          <span>{balanced ? 'Balanced' : `Out of balance by ${fmtMoney(Math.abs(debit - credit))}`}</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending || !balanced}>
            {save.isPending ? 'Posting…' : 'Post entry'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface TrialBalance {
  rows: { id: string; code: string; name: string; type: string; debit: number; credit: number; balance: number }[];
  totals: { debit: number; credit: number };
  summary: { assets: number; liabilities: number; equity: number; revenue: number; expenses: number; netIncome: number };
}

export function TrialBalanceReport() {
  const [to, setTo] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['trial-balance', to],
    queryFn: () => api<TrialBalance>(`/accounting/reports/trial-balance${to ? `?to=${to}` : ''}`),
  });
  return (
    <div>
      <PageHeader
        title="Trial balance"
        subtitle="Debit and credit totals per account, with a summary of the main statements."
        actions={
          <label className="flex items-center gap-2 text-sm text-slate-600">
            As of
            <input className="input w-auto" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            {to && (
              <Button variant="ghost" size="sm" onClick={() => setTo('')}>
                Clear
              </Button>
            )}
          </label>
        }
      />
      {isLoading ? (
        <Spinner />
      ) : error || !data ? (
        <ErrorBox error={error} />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <Stat label="Assets" value={fmtMoney(data.summary.assets)} />
            <Stat label="Liabilities" value={fmtMoney(data.summary.liabilities)} />
            <Stat label="Equity" value={fmtMoney(data.summary.equity)} />
            <Stat label="Revenue" value={fmtMoney(data.summary.revenue)} />
            <Stat label="Expenses" value={fmtMoney(data.summary.expenses)} />
            <Stat label="Net income" value={fmtMoney(data.summary.netIncome)} tone={data.summary.netIncome >= 0 ? 'good' : 'warn'} />
          </div>
          <Card>
            {data.rows.length === 0 ? (
              <Empty>No postings yet.</Empty>
            ) : (
              <Table head={['Code', 'Account', 'Type', 'Debit', 'Credit']}>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="td font-mono text-xs">{r.code}</td>
                    <td className="td">{r.name}</td>
                    <td className="td">
                      <Badge value={r.type} />
                    </td>
                    <td className="td tabular-nums">{fmtMoney(r.debit)}</td>
                    <td className="td tabular-nums">{fmtMoney(r.credit)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="td" colSpan={3}>
                    Totals {data.totals.debit === data.totals.credit ? '(balanced)' : '(OUT OF BALANCE)'}
                  </td>
                  <td className="td tabular-nums">{fmtMoney(data.totals.debit)}</td>
                  <td className="td tabular-nums">{fmtMoney(data.totals.credit)}</td>
                </tr>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
