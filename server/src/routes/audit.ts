import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';

export const auditRouter = Router();

// Admin only: who did what, newest first.
auditRouter.get(
  '/',
  authorize(),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 25));
    const where: Record<string, unknown> = {};
    if (typeof req.query.entity === 'string' && req.query.entity) where.entity = req.query.entity;
    const [data, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ data, total, page, pageSize });
  }),
);
