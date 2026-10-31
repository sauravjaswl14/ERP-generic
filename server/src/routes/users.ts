import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { authorize } from '../middleware/auth';
import { audit } from '../lib/crud';

export const usersRouter = Router();

const publicSelect = { id: true, email: true, name: true, role: true, isActive: true, createdAt: true } as const;

// Lightweight list for dropdowns (assignees, project managers, lead owners) — any signed-in user.
usersRouter.get(
  '/options',
  asyncHandler(async (_req, res) => {
    const data = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data });
  }),
);

// Everything below is admin only.
usersRouter.use(authorize());

usersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 20));
    const q = String(req.query.q ?? '').trim();
    const where = q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] }
      : {};
    const [data, total] = await Promise.all([
      prisma.user.findMany({ where, select: publicSelect, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.user.count({ where }),
    ]);
    res.json({ data, total, page, pageSize });
  }),
);

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(Role).default('EMPLOYEE'),
  isActive: z.coerce.boolean().default(true),
});

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { password, ...rest } = createSchema.parse(req.body);
    const user = await prisma.user.create({
      data: { ...rest, passwordHash: await bcrypt.hash(password, 12) },
      select: publicSelect,
    });
    await audit(req, 'CREATE', 'user', user.id);
    res.status(201).json(user);
  }),
);

const updateSchema = createSchema.partial().extend({
  password: z.string().min(8, 'Password must be at least 8 characters').optional().nullable().or(z.literal('')),
});

const update = asyncHandler(async (req, res) => {
  const { password, ...rest } = updateSchema.parse(req.body);
  if (req.params.id === req.user!.id && (rest.role && rest.role !== 'ADMIN' || rest.isActive === false)) {
    throw new HttpError(400, 'You cannot demote or deactivate your own account');
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) },
    select: publicSelect,
  });
  await audit(req, 'UPDATE', 'user', user.id);
  res.json(user);
});
usersRouter.put('/:id', update);
usersRouter.patch('/:id', update);

// Users are referenced by audit logs, projects and tasks, so deletion deactivates instead.
usersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) throw new HttpError(400, 'You cannot deactivate your own account');
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    await audit(req, 'DEACTIVATE', 'user', req.params.id);
    res.status(204).end();
  }),
);
