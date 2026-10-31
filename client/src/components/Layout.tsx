import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { canRead, Module } from '../lib/access';
import { titleCase } from '../lib/format';

interface Item {
  to: string;
  label: string;
  module: Module | null; // null = everyone
}
interface Group {
  title: string;
  items: Item[];
}

export const NAV: Group[] = [
  { title: 'Overview', items: [{ to: '/', label: 'Dashboard', module: null }] },
  {
    title: 'Human Resources',
    items: [
      { to: '/hr/employees', label: 'Employees', module: 'hr' },
      { to: '/hr/departments', label: 'Departments', module: 'hr' },
      { to: '/hr/leave', label: 'Leave requests', module: 'hr' },
      { to: '/hr/attendance', label: 'Attendance', module: 'hr' },
      { to: '/hr/payroll', label: 'Payroll', module: 'payroll' },
    ],
  },
  {
    title: 'Sales & CRM',
    items: [
      { to: '/crm/leads', label: 'Leads', module: 'crm' },
      { to: '/crm/customers', label: 'Customers', module: 'customers' },
      { to: '/sales/orders', label: 'Sales orders', module: 'sales' },
      { to: '/sales/invoices', label: 'Invoices', module: 'invoices' },
    ],
  },
  {
    title: 'Purchasing',
    items: [
      { to: '/purchasing/suppliers', label: 'Suppliers', module: 'purchasing' },
      { to: '/purchasing/orders', label: 'Purchase orders', module: 'purchasing' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { to: '/inventory/products', label: 'Products', module: 'inventory' },
      { to: '/inventory/warehouses', label: 'Warehouses', module: 'inventory' },
      { to: '/inventory/stock', label: 'Stock levels', module: 'inventory' },
      { to: '/inventory/movements', label: 'Movements', module: 'inventory' },
    ],
  },
  {
    title: 'Accounting',
    items: [
      { to: '/accounting/accounts', label: 'Chart of accounts', module: 'accounting' },
      { to: '/accounting/journal', label: 'Journal', module: 'accounting' },
      { to: '/accounting/trial-balance', label: 'Trial balance', module: 'accounting' },
    ],
  },
  {
    title: 'Projects',
    items: [
      { to: '/projects/list', label: 'Projects', module: 'projects' },
      { to: '/projects/tasks', label: 'Tasks', module: 'projects' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/admin/users', label: 'Users', module: 'admin' },
      { to: '/admin/audit', label: 'Audit log', module: 'admin' },
    ],
  },
];

const isVisible = (role: Parameters<typeof canRead>[0], i: Item) =>
  i.module === null || (i.module === 'admin' ? role === 'ADMIN' : canRead(role, i.module));

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => isVisible(user.role, i)) })).filter((g) => g.items.length);

  return (
    <div className="min-h-screen lg:pl-64">
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 px-5 text-lg font-semibold text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm">E</span>
          ERP Suite
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {groups.map((g) => (
            <div key={g.title} className="mt-4">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.title}</div>
              {g.items.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-md px-2 py-1.5 text-sm ${isActive ? 'bg-brand-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`
                  }
                >
                  {i.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
        <button className="rounded p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          ☰
        </button>
        <div className="hidden lg:block" />
        <div className="flex items-center gap-4">
          <div className="text-right leading-tight">
            <div className="text-sm font-medium text-slate-900">{user.name}</div>
            <div className="text-xs text-slate-500">
              {titleCase(user.role)} · {user.tenant.name}
            </div>
          </div>
          <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
