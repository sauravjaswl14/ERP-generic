export type Role = 'ADMIN' | 'MANAGER' | 'HR' | 'SALES' | 'PURCHASING' | 'INVENTORY' | 'ACCOUNTANT' | 'EMPLOYEE';

const ALL: Role[] = ['ADMIN', 'MANAGER', 'HR', 'SALES', 'PURCHASING', 'INVENTORY', 'ACCOUNTANT', 'EMPLOYEE'];

interface Rule {
  read: Role[];
  write: Role[];
}

/**
 * UI-side mirror of server/src/lib/permissions.ts (and the per-route overrides).
 * It only decides what to show; the API enforces the real rules. ADMIN is always allowed.
 */
export const ACCESS = {
  hr: { read: ['HR', 'MANAGER', 'ACCOUNTANT'], write: ['HR'] },
  payroll: { read: ['HR', 'ACCOUNTANT', 'MANAGER'], write: ['HR'] },
  crm: { read: ['SALES', 'MANAGER'], write: ['SALES'] },
  customers: { read: ['SALES', 'MANAGER', 'ACCOUNTANT'], write: ['SALES'] },
  sales: { read: ['SALES', 'MANAGER', 'ACCOUNTANT', 'INVENTORY'], write: ['SALES'] },
  invoices: { read: ['SALES', 'MANAGER', 'ACCOUNTANT'], write: ['ACCOUNTANT', 'SALES'] },
  purchasing: { read: ['PURCHASING', 'MANAGER', 'ACCOUNTANT', 'INVENTORY'], write: ['PURCHASING'] },
  inventory: { read: ['INVENTORY', 'SALES', 'PURCHASING', 'MANAGER', 'ACCOUNTANT'], write: ['INVENTORY'] },
  accounting: { read: ['ACCOUNTANT', 'MANAGER'], write: ['ACCOUNTANT'] },
  projects: { read: ALL, write: ['MANAGER'] },
  admin: { read: [] as Role[], write: [] as Role[] }, // admin-only pages; ADMIN always passes
} satisfies Record<string, Rule>;

export type Module = keyof typeof ACCESS;

const rule = (m: Module): Rule => ACCESS[m];

export const canRead = (role: Role | undefined, m: Module) =>
  !!role && (role === 'ADMIN' || rule(m).read.includes(role) || rule(m).write.includes(role));

export const canWrite = (role: Role | undefined, m: Module) => !!role && (role === 'ADMIN' || rule(m).write.includes(role));
