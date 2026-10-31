import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { crud, audit } from '../lib/crud';
import { P } from '../lib/permissions';
import { authorize } from '../middleware/auth';
import { asyncHandler, HttpError } from '../middleware/error';

export const inventoryRouter = Router();

inventoryRouter.get(
  '/stock',
  authorize(...P.inventory.read),
  asyncHandler(async (req, res) => {
    const where: Record<string, unknown> = {};
    if (typeof req.query.warehouseId === 'string' && req.query.warehouseId) where.warehouseId = req.query.warehouseId;
    const q = String(req.query.q ?? '').trim();
    if (q) {
      where.product = { OR: [{ name: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }] };
    }
    const rows = await prisma.stockLevel.findMany({
      where,
      include: { product: true, warehouse: true },
      orderBy: [{ product: { name: 'asc' } }],
    });
    // Reorder level is evaluated against the product's total on-hand across all warehouses.
    const totals = await prisma.stockLevel.groupBy({ by: ['productId'], _sum: { quantity: true } });
    const totalBy = new Map(totals.map((t) => [t.productId, t._sum.quantity ?? 0]));
    const data = rows.map((r) => ({
      ...r,
      totalOnHand: totalBy.get(r.productId) ?? 0,
      low: (totalBy.get(r.productId) ?? 0) <= r.product.reorderLevel,
    }));
    res.json({ data, total: data.length });
  }),
);

inventoryRouter.use(
  '/movements',
  crud({
    model: 'stockMovement',
    filterFields: ['productId', 'warehouseId', 'type'],
    include: { product: true, warehouse: true },
    methods: ['list'],
    ...P.inventory,
  }),
);

const adjustSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  delta: z.coerce.number().int().refine((n) => n !== 0, 'Adjustment cannot be zero'),
  note: z.string().trim().min(1, 'A reason is required'),
});

inventoryRouter.post(
  '/adjust',
  authorize(...P.inventory.write),
  asyncHandler(async (req, res) => {
    const d = adjustSchema.parse(req.body);
    await prisma.$transaction(async (tx) => {
      if (d.delta < 0) {
        const upd = await tx.stockLevel.updateMany({
          where: { productId: d.productId, warehouseId: d.warehouseId, quantity: { gte: -d.delta } },
          data: { quantity: { decrement: -d.delta } },
        });
        if (upd.count === 0) throw new HttpError(409, 'Adjustment would make stock negative');
      } else {
        await tx.stockLevel.upsert({
          where: { productId_warehouseId: { productId: d.productId, warehouseId: d.warehouseId } },
          update: { quantity: { increment: d.delta } },
          create: { productId: d.productId, warehouseId: d.warehouseId, quantity: d.delta },
        });
      }
      await tx.stockMovement.create({
        data: {
          productId: d.productId,
          warehouseId: d.warehouseId,
          type: 'ADJUST',
          quantity: d.delta,
          note: d.note,
          createdById: req.user!.id,
        },
      });
    });
    await audit(req, 'ADJUST', 'stock', d.productId);
    res.status(201).json({ ok: true });
  }),
);

const transferSchema = z
  .object({
    productId: z.string().uuid(),
    fromWarehouseId: z.string().uuid(),
    toWarehouseId: z.string().uuid(),
    quantity: z.coerce.number().int().positive(),
    note: z.string().trim().min(1).optional().nullable(),
  })
  .refine((d) => d.fromWarehouseId !== d.toWarehouseId, { message: 'Source and destination must differ', path: ['toWarehouseId'] });

inventoryRouter.post(
  '/transfer',
  authorize(...P.inventory.write),
  asyncHandler(async (req, res) => {
    const d = transferSchema.parse(req.body);
    await prisma.$transaction(async (tx) => {
      const upd = await tx.stockLevel.updateMany({
        where: { productId: d.productId, warehouseId: d.fromWarehouseId, quantity: { gte: d.quantity } },
        data: { quantity: { decrement: d.quantity } },
      });
      if (upd.count === 0) throw new HttpError(409, 'Insufficient stock in the source warehouse');
      await tx.stockLevel.upsert({
        where: { productId_warehouseId: { productId: d.productId, warehouseId: d.toWarehouseId } },
        update: { quantity: { increment: d.quantity } },
        create: { productId: d.productId, warehouseId: d.toWarehouseId, quantity: d.quantity },
      });
      await tx.stockMovement.createMany({
        data: [
          { productId: d.productId, warehouseId: d.fromWarehouseId, type: 'TRANSFER_OUT', quantity: d.quantity, note: d.note, createdById: req.user!.id },
          { productId: d.productId, warehouseId: d.toWarehouseId, type: 'TRANSFER_IN', quantity: d.quantity, note: d.note, createdById: req.user!.id },
        ],
      });
    });
    await audit(req, 'TRANSFER', 'stock', d.productId);
    res.status(201).json({ ok: true });
  }),
);
