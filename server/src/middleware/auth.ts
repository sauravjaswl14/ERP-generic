import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';
import { prismaBase } from '../lib/prisma';
import { runWithTenant } from '../lib/tenant-context';
import { asyncHandler } from './error';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  /** Workspace slug and display name, for the UI. */
  tenant: { slug: string; name: string };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const signToken = (user: Pick<AuthUser, 'id' | 'tenantId'>) =>
  jwt.sign({ sub: user.id, tid: user.tenantId }, config.jwtSecret, { expiresIn: config.jwtExpires } as jwt.SignOptions);

/**
 * Verifies the bearer token, loads the current (active) user and their (active) tenant, and runs the
 * rest of the request inside that tenant's context so every database query is scoped to it.
 * Uses the unscoped client on purpose: the tenant is not known until the user is found.
 */
export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' });
  let userId: string;
  let tokenTenantId: unknown;
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as jwt.JwtPayload;
    userId = String(payload.sub);
    tokenTenantId = payload.tid;
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  const user = await prismaBase.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      tenantId: true,
      tenant: { select: { slug: true, name: true, isActive: true } },
    },
  });
  // The token must name the tenant the user actually belongs to (rejects tokens issued before multi-tenancy).
  if (!user || !user.isActive || !user.tenant.isActive || user.tenantId !== tokenTenantId) {
    return res.status(401).json({ message: 'Account disabled or not found' });
  }
  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenant: { slug: user.tenant.slug, name: user.tenant.name },
  };
  return runWithTenant(user.tenantId, () => next());
});

/** ADMIN always passes; otherwise the user's role must be listed. */
export const authorize =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (req.user.role === 'ADMIN' || roles.includes(req.user.role)) return next();
    return res.status(403).json({ message: 'You do not have permission to perform this action' });
  };
