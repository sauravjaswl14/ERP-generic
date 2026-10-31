import { HttpError } from '../middleware/error';
import { prisma } from './prisma';
import { collectRefs, MissingReferenceError, verifyRefs } from './tenant-refs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const delegate = (target: string) => (prisma as any)[target[0].toLowerCase() + target.slice(1)];
const words = (target: string) => target.replace(/([A-Z])/g, ' $1').trim().toLowerCase();

/**
 * Verifies that every foreign key in a request payload points at a row owned by the current tenant.
 * Call it after validating the body and BEFORE opening a transaction: it runs through the tenant-scoped
 * client, so ids from other tenants simply are not found. `model` is the Prisma model or delegate name.
 */
export async function assertRefs(model: string, data: unknown): Promise<void> {
  try {
    await verifyRefs(collectRefs(model[0].toUpperCase() + model.slice(1), data), (target, ids) => delegate(target).count({ where: { id: { in: ids } } }));
  } catch (e) {
    if (e instanceof MissingReferenceError) throw new HttpError(400, `The selected ${words(e.target)} was not found`);
    throw e;
  }
}
