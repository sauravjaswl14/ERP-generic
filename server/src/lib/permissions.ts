import { Role } from '@prisma/client';

const ALL: Role[] = ['ADMIN', 'MANAGER', 'HR', 'SALES', 'PURCHASING', 'INVENTORY', 'ACCOUNTANT', 'EMPLOYEE'];

export interface Access {
  read: Role[];
  write: Role[];
}

/** Module-level access matrix. ADMIN is implicitly allowed everywhere (see `authorize`). */
export const P = {
  hr: { read: ['HR', 'MANAGER', 'ACCOUNTANT'], write: ['HR'] },
  crm: { read: ['SALES', 'MANAGER'], write: ['SALES'] },
  sales: { read: ['SALES', 'MANAGER', 'ACCOUNTANT', 'INVENTORY'], write: ['SALES'] },
  purchasing: { read: ['PURCHASING', 'MANAGER', 'ACCOUNTANT', 'INVENTORY'], write: ['PURCHASING'] },
  inventory: { read: ['INVENTORY', 'SALES', 'PURCHASING', 'MANAGER', 'ACCOUNTANT'], write: ['INVENTORY'] },
  accounting: { read: ['ACCOUNTANT', 'MANAGER'], write: ['ACCOUNTANT'] },
  projects: { read: ALL, write: ['MANAGER'] },
} satisfies Record<string, Access>;

export const ALL_ROLES = ALL;
