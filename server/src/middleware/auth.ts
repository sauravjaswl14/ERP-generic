import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { asyncHandler } from './error';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const signToken = (user: AuthUser) =>
  jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpires } as jwt.SignOptions);

/** Verifies the bearer token and loads the current (active) user from the database. */
export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' });
  let userId: string;
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as jwt.JwtPayload;
    userId = String(payload.sub);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return res.status(401).json({ message: 'Account disabled or not found' });
  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  next();
});

/** ADMIN always passes; otherwise the user's role must be listed. */
export const authorize =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (req.user.role === 'ADMIN' || roles.includes(req.user.role)) return next();
    return res.status(403).json({ message: 'You do not have permission to perform this action' });
  };
