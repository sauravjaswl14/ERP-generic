import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { authenticate, signToken } from '../middleware/auth';
import { audit } from '../lib/crud';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' },
});

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    const ok = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !ok) throw new HttpError(401, 'Invalid email or password');
    const safe = { id: user.id, email: user.email, name: user.name, role: user.role };
    req.user = safe;
    await audit(req, 'LOGIN', 'user', user.id);
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
