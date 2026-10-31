import { Router } from 'express';
import { crud } from '../lib/crud';
import { P } from '../lib/permissions';
import * as s from '../lib/schemas';

/** Straightforward master-data resources, all served by the generic CRUD factory. */
export const resourcesRouter = Router();

// ── HR
resourcesRouter.use(
  '/departments',
  crud({ model: 'department', schema: s.departmentSchema, searchFields: ['name', 'code'], orderBy: { name: 'asc' }, ...P.hr }),
);
resourcesRouter.use(
  '/employees',
  crud({
    model: 'employee',
    schema: s.employeeSchema,
    searchFields: ['firstName', 'lastName', 'email', 'code', 'position'],
    filterFields: ['departmentId', 'status'],
    include: { department: true },
    orderBy: { code: 'asc' },
    ...P.hr,
  }),
);
resourcesRouter.use(
  '/leave-requests',
  crud({
    model: 'leaveRequest',
    schema: s.leaveSchema,
    filterFields: ['employeeId', 'status'],
    include: { employee: true },
    ...P.hr,
  }),
);
resourcesRouter.use(
  '/attendance',
  crud({
    model: 'attendance',
    schema: s.attendanceSchema,
    filterFields: ['employeeId', 'status'],
    include: { employee: true },
    orderBy: { date: 'desc' },
    ...P.hr,
  }),
);

// ── CRM
resourcesRouter.use(
  '/customers',
  crud({ model: 'customer', schema: s.customerSchema, searchFields: ['name', 'email', 'phone'], ...P.crm, read: [...P.crm.read, 'ACCOUNTANT'] }),
);
resourcesRouter.use(
  '/leads',
  crud({
    model: 'lead',
    schema: s.leadSchema,
    searchFields: ['name', 'company', 'email'],
    filterFields: ['status', 'ownerId'],
    include: { owner: { select: { id: true, name: true } } },
    ...P.crm,
  }),
);

// ── Purchasing master data
resourcesRouter.use(
  '/suppliers',
  crud({ model: 'supplier', schema: s.supplierSchema, searchFields: ['name', 'email', 'phone'], ...P.purchasing }),
);

// ── Inventory master data
resourcesRouter.use(
  '/products',
  crud({
    model: 'product',
    schema: s.productSchema,
    searchFields: ['name', 'sku', 'category'],
    filterFields: ['category'],
    orderBy: { name: 'asc' },
    ...P.inventory,
  }),
);
resourcesRouter.use(
  '/warehouses',
  crud({ model: 'warehouse', schema: s.warehouseSchema, searchFields: ['name', 'code'], orderBy: { name: 'asc' }, ...P.inventory }),
);

// ── Accounting master data
resourcesRouter.use(
  '/accounts',
  crud({
    model: 'account',
    schema: s.accountSchema,
    searchFields: ['name', 'code'],
    filterFields: ['type'],
    orderBy: { code: 'asc' },
    ...P.accounting,
  }),
);

// ── Projects
resourcesRouter.use(
  '/projects',
  crud({
    model: 'project',
    schema: s.projectSchema,
    searchFields: ['name', 'code'],
    filterFields: ['status'],
    include: { manager: { select: { id: true, name: true } }, _count: { select: { tasks: true } } },
    ...P.projects,
  }),
);
resourcesRouter.use(
  '/tasks',
  crud({
    model: 'task',
    schema: s.taskSchema,
    searchFields: ['title'],
    filterFields: ['projectId', 'status', 'assigneeId'],
    include: { project: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
    ...P.projects,
  }),
);
