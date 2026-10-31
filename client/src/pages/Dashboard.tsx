import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDate, fmtMoney, fmtNum } from '../lib/format';
import { Badge, Card, ErrorBox, PageHeader, Spinner, Stat } from '../components/ui';

interface DashboardData {
  sales?: {
    revenueThisMonth: number;
    receivables: number;
    overdueInvoices: number;
    draftOrders: number;
    customers: number;
    monthly: { month: string; revenue: number }[];
  };
  recentOrders?: { id: string; number: string; total: string; status: string; orderDate: string; customer: { name: string } }[];
  inventory?: { products: number; stockValue: number; lowStock: { id: string; sku: string; name: string; reorderLevel: number; onHand: number }[] };
  purchasing?: { openOrders: number; unpaid: number };
  hr?: { activeEmployees: number; pendingLeave: number };
  projects: { active: number; myOpenTasks: number };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: () => api<DashboardData>('/dashboard') });

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox error={error} />;

  const max = Math.max(1, ...(data.sales?.monthly.map((m) => m.revenue) ?? [1]));

  return (
    <div>
      <PageHeader title={`Welcome back, ${user?.name.split(' ')[0]}`} subtitle="Here is what is happening across the business." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.sales && (
          <>
            <Stat label="Revenue this month" value={fmtMoney(data.sales.revenueThisMonth)} />
            <Stat label="Receivables" value={fmtMoney(data.sales.receivables)} hint={`${data.sales.overdueInvoices} overdue invoice(s)`} tone={data.sales.overdueInvoices ? 'warn' : 'default'} />
            <Stat label="Draft sales orders" value={fmtNum(data.sales.draftOrders)} hint="Awaiting confirmation" />
            <Stat label="Customers" value={fmtNum(data.sales.customers)} />
          </>
        )}
        {data.inventory && (
          <>
            <Stat label="Active products" value={fmtNum(data.inventory.products)} />
            <Stat label="Stock value (at cost)" value={fmtMoney(data.inventory.stockValue)} />
          </>
        )}
        {data.purchasing && (
          <>
            <Stat label="Open purchase orders" value={fmtNum(data.purchasing.openOrders)} />
            <Stat label="Received, unpaid" value={fmtNum(data.purchasing.unpaid)} tone={data.purchasing.unpaid ? 'warn' : 'default'} />
          </>
        )}
        {data.hr && (
          <>
            <Stat label="Active employees" value={fmtNum(data.hr.activeEmployees)} />
            <Stat label="Pending leave requests" value={fmtNum(data.hr.pendingLeave)} tone={data.hr.pendingLeave ? 'warn' : 'default'} />
          </>
        )}
        <Stat label="Active projects" value={fmtNum(data.projects.active)} />
        <Stat label="My open tasks" value={fmtNum(data.projects.myOpenTasks)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {data.sales && (
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Invoiced revenue, last 6 months</h2>
            <div className="flex h-48 items-end gap-3">
              {data.sales.monthly.map((m) => (
                <div key={m.month} className="flex h-full flex-1 flex-col items-center gap-1">
                  <span className="h-4 text-[10px] text-slate-500">{m.revenue ? fmtNum(Math.round(m.revenue)) : ''}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div className="w-full rounded-t bg-brand-500" style={{ height: `${Math.max(2, (m.revenue / max) * 100)}%` }} title={`${m.month}: ${fmtMoney(m.revenue)}`} />
                  </div>
                  <span className="text-xs text-slate-500">{m.month}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {data.recentOrders && (
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Recent sales orders</h2>
              <Link to="/sales/orders" className="text-xs text-brand-600 hover:underline">
                View all
              </Link>
            </div>
            {data.recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <div className="font-medium text-slate-800">{o.number}</div>
                      <div className="text-xs text-slate-500">
                        {o.customer.name} · {fmtDate(o.orderDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums">{fmtMoney(o.total)}</span>
                      <Badge value={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {data.inventory && (
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Low stock</h2>
              <Link to="/inventory/stock" className="text-xs text-brand-600 hover:underline">
                Stock levels
              </Link>
            </div>
            {data.inventory.lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Everything is above its reorder level.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.inventory.lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <div className="font-medium text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.sku}</div>
                    </div>
                    <span className="text-amber-600">
                      {p.onHand} on hand <span className="text-slate-400">/ reorder at {p.reorderLevel}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
