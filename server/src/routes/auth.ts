import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma, prismaBase } from '../lib/prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { authenticate, signToken } from '../middleware/auth';
import { audit } from '../lib/crud';
import { runWithTenant } from '../lib/tenant-context';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' },
});

const loginSchema = z.object({
  workspace: z.string().trim().toLowerCase().min(1, 'Workspace is required'),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { workspace, email, password } = loginSchema.parse(req.body);
    // Unscoped lookups: the workspace slug is what tells us which tenant to look in.
    const tenant = await prismaBase.tenant.findUnique({ where: { slug: workspace } });
    const user = tenant?.isActive
      ? await prismaBase.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } })
      : null;
    const ok = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
    // One message for every failure so the endpoint cannot be used to discover workspaces or accounts.
    if (!tenant || !user || !ok) throw new HttpError(401, 'Invalid workspace, email or password');
    const safe = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: tenant.id,
      tenant: { slug: tenant.slug, name: tenant.name },
    };
    req.user = safe;
    await runWithTenant(tenant.id, () => audit(req, 'LOGIN', 'user', user.id));
    res.json({ token: signToken(safe), user: safe });
  }),
);

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

authRouter.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new HttpError(400, 'Current password is incorrect');
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
    await audit(req, 'CHANGE_PASSWORD', 'user', user.id);
    res.json({ ok: true });
  }),
);
