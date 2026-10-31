import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { HttpError } from '../middleware/error';
import { DEFAULT_ACCOUNTS } from './chart-of-accounts';
import { prismaBase } from './prisma';

export interface NewTenant {
  slug: string;
  name: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

/**
 * Creates a workspace: the tenant, its first ADMIN user and the standard chart of accounts, in one
 * transaction so a half-created tenant can never exist. Uses the unscoped client and sets tenantId
 * explicitly because no tenant context exists yet.
 */
export async function provisionTenant(input: NewTenant) {
  const passwordHash = await bcrypt.hash(input.adminPassword, 12);
  try {
    return await prismaBase.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { slug: input.slug, name: input.name } });
      const admin = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.adminEmail.trim().toLowerCase(),
          name: input.adminName,
          role: 'ADMIN',
          passwordHash,
        },
      });
      await tx.account.createMany({
        data: DEFAULT_ACCOUNTS.map(([code, name, type]) => ({ tenantId: tenant.id, code, name, type })),
      });
      return { tenant, admin };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new HttpError(409, 'That workspace name is already taken');
    }
    throw e;
  }
}
