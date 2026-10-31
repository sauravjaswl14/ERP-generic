import { PrismaClient } from '@prisma/client';
import { currentTenantId } from './tenant-context';
import { scopeArgs, TENANT_MODELS } from './tenant-scope';

/**
 * UNSCOPED client. Only for things that exist before a tenant is known or span tenants:
 * looking up a workspace at login, provisioning a new tenant, and CLI scripts.
 * Never use it to read or write a tenant's business data.
 */
export const prismaBase = new PrismaClient();

/**
 * The client route handlers use. Every operation on a tenant-owned model is restricted to the
 * tenant in the current async context (see authenticate), and creates are stamped with it.
 * Calling it outside a tenant context throws instead of returning data.
 *
 * Note: raw SQL ($queryRaw / $executeRaw) bypasses this and must filter by tenant_id by hand.
 */
export const prisma = prismaBase.$extends({
  name: 'tenant-scope',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_MODELS.has(model)) return query(args);
        return query(scopeArgs(operation, args, currentTenantId()) as typeof args);
      },
    },
  },
});
