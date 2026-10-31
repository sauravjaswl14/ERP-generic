import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The tenant a request (or script) is acting for. It is set once per request by `authenticate`
 * and read by the tenant-scoped Prisma client, so route code never has to pass it around.
 */
const storage = new AsyncLocalStorage<{ tenantId: string }>();

export const runWithTenant = <T>(tenantId: string, fn: () => T): T => storage.run({ tenantId }, fn);

export const maybeTenantId = (): string | undefined => storage.getStore()?.tenantId;

/** Fails closed: a query on a tenant-owned table outside a tenant context is a bug, not an empty result. */
export function currentTenantId(): string {
  const id = maybeTenantId();
  if (!id) throw new Error('No tenant in context: tenant-owned data can only be accessed inside runWithTenant()');
  return id;
}
