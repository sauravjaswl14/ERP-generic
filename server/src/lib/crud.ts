import { Request, Router } from 'express';
import { AnyZodObject } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from './prisma';
import { authorize } from '../middleware/auth';
import { asyncHandler, HttpError } from '../middleware/error';

export async function audit(req: Request, action: string, entity: string, entityId?: string) {
  try {
    await prisma.auditLog.create({ data: { userId: req.user?.id, action, entity, entityId } });
  } catch (e) {
    console.error('audit log failed', e);
  }
}

type Method = 'list' | 'get' | 'create' | 'update' | 'delete';

export interface CrudOptions {
  /** Prisma delegate name, e.g. "customer" */
  model: string;
  schema?: AnyZodObject;
  searchFields?: string[];
  filterFields?: string[];
  include?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[];
  read: Role[];
  write: Role[];
  /** Restrict which operations are exposed (default: all). */
  methods?: Method[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function crud(o: CrudOptions): Router {
  const r = Router();
  const delegate = () => (prisma as any)[o.model];
  const enabled = (m: Method) => !o.methods || o.methods.includes(m);

  if (enabled('list')) {
    r.get(
      '/',
      authorize(...o.read),
      asyncHandler(async (req, res) => {
        const page = Math.max(1, Number(req.query.page) || 1);
        const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 20));
        const where: any = {};
        const q = String(req.query.q ?? '').trim();
        if (q && o.searchFields?.length) {
          where.OR = o.searchFields.map((f) => ({ [f]: { contains: q, mode: 'insensitive' } }));
        }
        for (const f of o.filterFields ?? []) {
          const v = req.query[f];
          if (typeof v === 'string' && v) where[f] = v;
        }
        const [data, total] = await Promise.all([
          delegate().findMany({
            where,
            include: o.include,
            orderBy: o.orderBy ?? { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          delegate().count({ where }),
        ]);
        res.json({ data, total, page, pageSize });
      }),
    );
  }

  if (enabled('get')) {
    r.get(
      '/:id',
      authorize(...o.read),
      asyncHandler(async (req, res) => {
        const row = await delegate().findUnique({ where: { id: req.params.id }, include: o.include });
        if (!row) throw new HttpError(404, 'Record not found');
        res.json(row);
      }),
    );
  }

  if (enabled('create') && o.schema) {
    const schema = o.schema;
    r.post(
      '/',
      authorize(...o.write),
      asyncHandler(async (req, res) => {
        const data = schema.parse(req.body);
        const row = await delegate().create({ data, include: o.include });
        await audit(req, 'CREATE', o.model, row.id);
        res.status(201).json(row);
      }),
    );
  }

  if (enabled('update') && o.schema) {
    const schema = o.schema;
    const handler = asyncHandler(async (req, res) => {
      const data = schema.partial().parse(req.body);
      const row = await delegate().update({ where: { id: req.params.id }, data, include: o.include });
      await audit(req, 'UPDATE', o.model, row.id);
      res.json(row);
    });
    r.put('/:id', authorize(...o.write), handler);
    r.patch('/:id', authorize(...o.write), handler);
  }

  if (enabled('delete')) {
    r.delete(
      '/:id',
      authorize(...o.write),
      asyncHandler(async (req, res) => {
        await delegate().delete({ where: { id: req.params.id } });
        await audit(req, 'DELETE', o.model, req.params.id);
        res.status(204).end();
      }),
    );
  }

  return r;
}
