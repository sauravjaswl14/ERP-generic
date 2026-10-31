/**
 * Foreign-key ownership checks. Row filtering stops a tenant reading another tenant's rows, but a
 * request body can still *name* another tenant's id (e.g. customerId) and the database would accept
 * it, after which joined data (order -> customer) would expose that row. These helpers find every
 * foreign key in a payload so the caller can verify each one belongs to the current tenant.
 * Pure on purpose (no Prisma import) so it can be unit tested.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = Record<string, any>;
const isObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Foreign-key field name -> the model it points to. */
const FK_TARGETS: Record<string, string> = {
  customerId: 'Customer',
  supplierId: 'Supplier',
  warehouseId: 'Warehouse',
  fromWarehouseId: 'Warehouse',
  toWarehouseId: 'Warehouse',
  productId: 'Product',
  accountId: 'Account',
  departmentId: 'Department',
  employeeId: 'Employee',
  projectId: 'Project',
  ownerId: 'User',
  assigneeId: 'User',
  salesOrderId: 'SalesOrder',
  purchaseOrderId: 'PurchaseOrder',
  invoiceId: 'Invoice',
  entryId: 'JournalEntry',
};

/** Prisma's relation writes link rows by id without going through the fields above, so refuse them. */
const RELATION_OPS = new Set(['connect', 'connectOrCreate', 'disconnect', 'set']);

/** `managerId` points at an Employee on Employee but at a User on Project. */
const targetFor = (model: string, field: string) => (field === 'managerId' ? (model === 'Project' ? 'User' : 'Employee') : FK_TARGETS[field]);

/** Every foreign-key id in `data` (including nested order/journal lines), grouped by target model. */
export function collectRefs(model: string, data: unknown): Map<string, Set<string>> {
  const refs = new Map<string, Set<string>>();
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!isObject(value)) return;
    for (const [key, v] of Object.entries(value)) {
      if (RELATION_OPS.has(key)) throw new Error(`Relation operation "${key}" is not allowed; use scalar foreign keys so ownership can be verified`);
      if (typeof v === 'string') {
        const target = targetFor(model, key);
        if (target) refs.set(target, (refs.get(target) ?? new Set()).add(v));
      } else walk(v);
    }
  };
  walk(data);
  return refs;
}

export class MissingReferenceError extends Error {
  constructor(public target: string) {
    super(`Referenced ${target} does not exist`);
  }
}

/** `countOwned` returns how many of `ids` exist in the current tenant. Throws if any are missing. */
export async function verifyRefs(refs: Map<string, Set<string>>, countOwned: (target: string, ids: string[]) => Promise<number>): Promise<void> {
  await Promise.all(
    [...refs].map(async ([target, ids]) => {
      if ((await countOwned(target, [...ids])) !== ids.size) throw new MissingReferenceError(target);
    }),
  );
}
