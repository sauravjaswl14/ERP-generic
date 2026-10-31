/**
 * Pure helpers that rewrite Prisma query arguments so they can only touch one tenant's rows.
 * Kept free of Prisma imports so the rules can be unit tested without a database.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Args = Record<string, any>;

const isObject = (v: unknown): v is Args => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Models that belong to a tenant (every model except Tenant itself). */
export const TENANT_MODELS = new Set([
  'User',
  'AuditLog',
  'Sequence',
  'Department',
  'Employee',
  'LeaveRequest',
  'Attendance',
  'Payroll',
  'Customer',
  'Lead',
  'Product',
  'Warehouse',
  'StockLevel',
  'StockMovement',
  'Supplier',
  'PurchaseOrder',
  'PurchaseOrderLine',
  'SalesOrder',
  'SalesOrderLine',
  'Invoice',
  'Payment',
  'Account',
  'JournalEntry',
  'JournalLine',
  'Project',
  'Task',
]);

/**
 * Stamps tenantId onto a create payload and onto every nested `create` / `createMany`
 * (e.g. order lines), replacing any value the caller supplied.
 */
export function stampCreate(data: unknown, tenantId: string): Args {
  const out: Args = { ...(isObject(data) ? data : {}), tenantId };
  stampNested(out, tenantId);
  return out;
}

/** Update payloads may not move a row to another tenant, but may create nested rows. */
export function sanitizeUpdate(data: unknown, tenantId: string): Args {
  const out: Args = { ...(isObject(data) ? data : {}) };
  delete out.tenantId;
  stampNested(out, tenantId);
  return out;
}

function stampNested(data: Args, tenantId: string) {
  for (const [key, value] of Object.entries(data)) {
    if (key === 'tenantId' || !isObject(value)) continue;
    if (value.create !== undefined) {
      data[key] = { ...value, create: Array.isArray(value.create) ? value.create.map((c: unknown) => stampCreate(c, tenantId)) : stampCreate(value.create, tenantId) };
    }
    if (isObject(value.createMany)) {
      const many = value.createMany;
      data[key] = {
        ...(data[key] as Args),
        createMany: { ...many, data: Array.isArray(many.data) ? many.data.map((c: unknown) => stampCreate(c, tenantId)) : stampCreate(many.data, tenantId) },
      };
    }
  }
}

const FILTERED = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
  'delete',
]);

/** Returns the arguments to actually run for `operation`, restricted to `tenantId`. */
export function scopeArgs(operation: string, args: unknown, tenantId: string): Args {
  const a: Args = { ...(isObject(args) ? args : {}) };

  if (FILTERED.has(operation)) {
    a.where = { ...(isObject(a.where) ? a.where : {}), tenantId };
    return a;
  }
  switch (operation) {
    case 'update':
      a.where = { ...(isObject(a.where) ? a.where : {}), tenantId };
      a.data = sanitizeUpdate(a.data, tenantId);
      return a;
    case 'create':
      a.data = stampCreate(a.data, tenantId);
      return a;
    case 'createMany':
    case 'createManyAndReturn':
      a.data = Array.isArray(a.data) ? a.data.map((d: unknown) => stampCreate(d, tenantId)) : stampCreate(a.data, tenantId);
      return a;
    case 'upsert':
      a.where = { ...(isObject(a.where) ? a.where : {}), tenantId };
      a.create = stampCreate(a.create, tenantId);
      a.update = sanitizeUpdate(a.update, tenantId);
      return a;
    default:
      // Unknown operations (e.g. raw queries are separate, but future Prisma additions) must not slip through unscoped.
      throw new Error(`Operation "${operation}" is not supported on tenant-scoped models`);
  }
}
