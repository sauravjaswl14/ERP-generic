import { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { canRead, Module } from './lib/access';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import { Attendance, Departments, Employees, Leave, Payroll } from './pages/hr';
import { Customers, Leads } from './pages/crm';
import { Invoices, PurchaseOrders, SalesOrders } from './pages/orders';
import { Suppliers } from './pages/purchasing';
import { Movements, Products, Stock, Warehouses } from './pages/inventory';
import { Accounts, Journal, TrialBalanceReport } from './pages/accounting';
import { Projects, Tasks } from './pages/projects';
import { AuditLog, Users } from './pages/admin';

function Guard({ module, children }: { module: Module; children: ReactElement }) {
  const { user } = useAuth();
  const allowed = module === 'admin' ? user?.role === 'ADMIN' : canRead(user?.role, module);
  if (!allowed) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h1 className="text-lg font-semibold text-slate-900">No access</h1>
        <p className="mt-1 text-sm text-slate-500">Your role does not include this module. Ask an administrator if you need it.</p>
      </div>
    );
  }
  return children;
}

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

const g = (module: Module, el: ReactElement) => <Guard module={module}>{el}</Guard>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<RequireAuth />}>
        <Route index element={<Dashboard />} />

        <Route path="hr/employees" element={g('hr', <Employees />)} />
        <Route path="hr/departments" element={g('hr', <Departments />)} />
        <Route path="hr/leave" element={g('hr', <Leave />)} />
        <Route path="hr/attendance" element={g('hr', <Attendance />)} />
        <Route path="hr/payroll" element={g('payroll', <Payroll />)} />

        <Route path="crm/leads" element={g('crm', <Leads />)} />
        <Route path="crm/customers" element={g('customers', <Customers />)} />
        <Route path="sales/orders" element={g('sales', <SalesOrders />)} />
        <Route path="sales/invoices" element={g('invoices', <Invoices />)} />

        <Route path="purchasing/suppliers" element={g('purchasing', <Suppliers />)} />
        <Route path="purchasing/orders" element={g('purchasing', <PurchaseOrders />)} />

        <Route path="inventory/products" element={g('inventory', <Products />)} />
        <Route path="inventory/warehouses" element={g('inventory', <Warehouses />)} />
        <Route path="inventory/stock" element={g('inventory', <Stock />)} />
        <Route path="inventory/movements" element={g('inventory', <Movements />)} />

        <Route path="accounting/accounts" element={g('accounting', <Accounts />)} />
        <Route path="accounting/journal" element={g('accounting', <Journal />)} />
        <Route path="accounting/trial-balance" element={g('accounting', <TrialBalanceReport />)} />

        <Route path="projects/list" element={g('projects', <Projects />)} />
        <Route path="projects/tasks" element={g('projects', <Tasks />)} />

        <Route path="admin/users" element={g('admin', <Users />)} />
        <Route path="admin/audit" element={g('admin', <AuditLog />)} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
