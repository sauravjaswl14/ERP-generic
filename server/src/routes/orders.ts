import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { crud, audit } from '../lib/crud';
import { P } from '../lib/permissions';
import { authorize } from '../middleware/auth';
import { asyncHandler, HttpError } from '../middleware/error';
import { ACC, addDays, nextNumber, num, postJournal, round2 } from '../lib/accounting';
import { assertRefs } from '../lib/refs';

export const ordersRouter = Router();

const salesInclude = { customer: true, warehouse: true, invoice: true, lines: { include: { product: true } } };
const purchaseInclude = { supplier: true, warehouse: true, lines: { include: { product: true } } };

// ───────────────────────── Sales orders ─────────────────────────
ordersRouter.use(
  '/sales-orders',
  crud({
    model: 'salesOrder',
    searchFields: ['number'],
    filterFields: ['status', 'customerId'],
    include: salesInclude,
    methods: ['list', 'get'],
    ...P.sales,
  }),
);

const salesLine = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).max(100).default(0),
});
const salesOrderSchema = z.object({
  customerId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  orderDate: z.coerce.date().optional(),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().trim().min(1).optional().nullable(),
  lines: z.array(salesLine).min(1, 'Add at least one line'),
});

ordersRouter.post(
  '/sales-orders',
  authorize(...P.sales.write),
  asyncHandler(async (req, res) => {
    const d = salesOrderSchema.parse(req.body);
    await assertRefs('SalesOrder', d);
    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: d.lines.map((l) => l.productId) } } });
      const byId = new Map(products.map((p) => [p.id, p]));
      const lines = d.lines.map((l) => {
        const p = byId.get(l.productId);
        if (!p) throw new HttpError(400, 'Unknown product on order line');
        const unitPrice = l.unitPrice ?? num(p.unitPrice);
        return {
          productId: l.productId,
          quantity: l.quantity,
          unitPrice,
          discount: l.discount,
          lineTotal: round2(l.quantity * unitPrice * (1 - l.discount / 100)),
        };
      });
      const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
      const tax = round2((subtotal * d.taxRate) / 100);
      return tx.salesOrder.create({
        data: {
          number: await nextNumber(tx, 'SO', 'SO'),
          customerId: d.customerId,
          warehouseId: d.warehouseId,
          orderDate: d.orderDate,
          taxRate: d.taxRate,
          subtotal,
          tax,
          total: round2(subtotal + tax),
          notes: d.notes,
          createdById: req.user!.id,
          lines: { create: lines },
        },
        include: salesInclude,
      });
    });
    await audit(req, 'CREATE', 'salesOrder', order.id);
    res.status(201).json(order);
  }),
);

/** Confirm: reserve+issue stock, raise invoice, post revenue and COGS to the ledger. */
ordersRouter.post(
  '/sales-orders/:id/confirm',
  authorize(...P.sales.write),
  asyncHandler(async (req, res) => {
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.salesOrder.findUnique({
        where: { id: req.params.id },
        include: { lines: { include: { product: true } } },
      });
      if (!o) throw new HttpError(404, 'Sales order not found');
      if (o.status !== 'DRAFT') throw new HttpError(409, `Order is already ${o.status.toLowerCase()}`);

      let cogs = 0;
      for (const l of o.lines) {
        // Guarded atomic decrement: fails (count 0) if stock is insufficient, even under concurrency.
        const upd = await tx.stockLevel.updateMany({
          where: { productId: l.productId, warehouseId: o.warehouseId, quantity: { gte: l.quantity } },
          data: { quantity: { decrement: l.quantity } },
        });
        if (upd.count === 0) throw new HttpError(409, `Insufficient stock for ${l.product.name} (${l.product.sku})`);
        await tx.stockMovement.create({
          data: {
            productId: l.productId,
            warehouseId: o.warehouseId,
            type: 'OUT',
            quantity: l.quantity,
            reference: o.number,
            createdById: req.user!.id,
          },
        });
        cogs += l.quantity * num(l.product.costPrice);
      }

      const now = new Date();
      const invoice = await tx.invoice.create({
        data: {
          number: await nextNumber(tx, 'INV', 'INV'),
          customerId: o.customerId,
          salesOrderId: o.id,
          issueDate: now,
          dueDate: addDays(now, 30),
          total: o.total,
        },
      });
      await postJournal(tx, {
        description: `Sale ${o.number} / ${invoice.number}`,
        reference: invoice.number,
        createdById: req.user!.id,
        lines: [
          { code: ACC.AR, debit: num(o.total) },
          { code: ACC.REVENUE, credit: num(o.subtotal) },
          { code: ACC.SALES_TAX, credit: num(o.tax) },
          { code: ACC.COGS, debit: round2(cogs) },
          { code: ACC.INVENTORY, credit: round2(cogs) },
        ],
      });
      return tx.salesOrder.update({ where: { id: o.id }, data: { status: 'CONFIRMED' }, include: salesInclude });
    });
    await audit(req, 'CONFIRM', 'salesOrder', order.id);
    res.json(order);
  }),
);

ordersRouter.post(
  '/sales-orders/:id/cancel',
  authorize(...P.sales.write),
  asyncHandler(async (req, res) => {
    const upd = await prisma.salesOrder.updateMany({
      where: { id: req.params.id, status: 'DRAFT' },
      data: { status: 'CANCELLED' },
    });
    if (upd.count === 0) throw new HttpError(409, 'Only draft orders can be cancelled');
    await audit(req, 'CANCEL', 'salesOrder', req.params.id);
    res.json(await prisma.salesOrder.findUnique({ where: { id: req.params.id }, include: salesInclude }));
  }),
);

// ───────────────────────── Invoices & payments ─────────────────────────
ordersRouter.use(
  '/invoices',
  crud({
    model: 'invoice',
    searchFields: ['number'],
    filterFields: ['status', 'customerId'],
    include: { customer: true, salesOrder: { select: { number: true } }, payments: true },
    methods: ['list', 'get'],
    read: ['SALES', 'MANAGER', 'ACCOUNTANT'],
    write: ['ACCOUNTANT'],
  }),
);

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.string().trim().min(1).default('BANK'),
  reference: z.string().trim().min(1).optional().nullable(),
  date: z.coerce.date().optional(),
});

ordersRouter.post(
  '/invoices/:id/payments',
  authorize('ACCOUNTANT', 'SALES'),
  asyncHandler(async (req, res) => {
    const d = paymentSchema.parse(req.body);
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({ where: { id: req.params.id } });
      if (!inv) throw new HttpError(404, 'Invoice not found');
      if (inv.status === 'VOID') throw new HttpError(409, 'Invoice is void');
      const balance = round2(num(inv.total) - num(inv.paid));
      if (d.amount > balance) throw new HttpError(400, `Payment exceeds outstanding balance (${balance.toFixed(2)})`);
      await tx.payment.create({
        data: { invoiceId: inv.id, amount: d.amount, method: d.method, reference: d.reference, date: d.date ?? new Date() },
      });
      const paid = round2(num(inv.paid) + d.amount);
      await postJournal(tx, {
        date: d.date,
        description: `Payment on ${inv.number}`,
        reference: inv.number,
        createdById: req.user!.id,
        lines: [
          { code: ACC.CASH, debit: d.amount },
          { code: ACC.AR, credit: d.amount },
        ],
      });
      return tx.invoice.update({
        where: { id: inv.id },
        data: { paid, status: paid >= num(inv.total) ? 'PAID' : 'PARTIAL' },
        include: { customer: true, salesOrder: { select: { number: true } }, payments: true },
      });
    });
    await audit(req, 'PAYMENT', 'invoice', invoice.id);
    res.status(201).json(invoice);
  }),
);

// ───────────────────────── Purchase orders ─────────────────────────
ordersRouter.use(
  '/purchase-orders',
  crud({
    model: 'purchaseOrder',
    searchFields: ['number'],
    filterFields: ['status', 'supplierId'],
    include: purchaseInclude,
    methods: ['list', 'get'],
    ...P.purchasing,
  }),
);

const poLine = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().min(0).optional(),
});
const poSchema = z.object({
  supplierId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  orderDate: z.coerce.date().optional(),
  expectedDate: z.coerce.date().optional().nullable(),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().trim().min(1).optional().nullable(),
  lines: z.array(poLine).min(1, 'Add at least one line'),
});

ordersRouter.post(
  '/purchase-orders',
  authorize(...P.purchasing.write),
  asyncHandler(async (req, res) => {
    const d = poSchema.parse(req.body);
    await assertRefs('PurchaseOrder', d);
    const po = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: d.lines.map((l) => l.productId) } } });
      const byId = new Map(products.map((p) => [p.id, p]));
      const lines = d.lines.map((l) => {
        const p = byId.get(l.productId);
        if (!p) throw new HttpError(400, 'Unknown product on order line');
        const unitCost = l.unitCost ?? num(p.costPrice);
        return { productId: l.productId, quantity: l.quantity, unitCost, lineTotal: round2(l.quantity * unitCost) };
      });
      const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
      const tax = round2((subtotal * d.taxRate) / 100);
      return tx.purchaseOrder.create({
        data: {
          number: await nextNumber(tx, 'PO', 'PO'),
          supplierId: d.supplierId,
          warehouseId: d.warehouseId,
          orderDate: d.orderDate,
          expectedDate: d.expectedDate,
          taxRate: d.taxRate,
          subtotal,
          tax,
          total: round2(subtotal + tax),
          notes: d.notes,
          createdById: req.user!.id,
          lines: { create: lines },
        },
        include: purchaseInclude,
      });
    });
    await audit(req, 'CREATE', 'purchaseOrder', po.id);
    res.status(201).json(po);
  }),
);

async function transition(
  req: import('express').Request,
  from: 'DRAFT' | 'ORDERED',
  to: 'ORDERED' | 'CANCELLED',
) {
  const upd = await prisma.purchaseOrder.updateMany({ where: { id: req.params.id, status: from }, data: { status: to } });
  if (upd.count === 0) throw new HttpError(409, `Order must be ${from.toLowerCase()} to move to ${to.toLowerCase()}`);
  await audit(req, to, 'purchaseOrder', req.params.id);
  return prisma.purchaseOrder.findUnique({ where: { id: req.params.id }, include: purchaseInclude });
}

ordersRouter.post(
  '/purchase-orders/:id/order',
  authorize(...P.purchasing.write),
  asyncHandler(async (req, res) => res.json(await transition(req, 'DRAFT', 'ORDERED'))),
);
ordersRouter.post(
  '/purchase-orders/:id/cancel',
  authorize(...P.purchasing.write),
  asyncHandler(async (req, res) => {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!po) throw new HttpError(404, 'Purchase order not found');
    res.json(await transition(req, po.status === 'ORDERED' ? 'ORDERED' : 'DRAFT', 'CANCELLED'));
  }),
);

/** Receive: stock in, moving-average cost update, post inventory / accounts payable. */
ordersRouter.post(
  '/purchase-orders/:id/receive',
  authorize('PURCHASING', 'INVENTORY'),
  asyncHandler(async (req, res) => {
    const po = await prisma.$transaction(async (tx) => {
      const o = await tx.purchaseOrder.findUnique({ where: { id: req.params.id }, include: { lines: true } });
      if (!o) throw new HttpError(404, 'Purchase order not found');
      if (o.status !== 'ORDERED') throw new HttpError(409, 'Only ordered purchase orders can be received');

      for (const l of o.lines) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: l.productId } });
        const agg = await tx.stockLevel.aggregate({ where: { productId: l.productId }, _sum: { quantity: true } });
        const onHand = Math.max(0, agg._sum.quantity ?? 0);
        const newCost = onHand + l.quantity > 0
          ? round2((onHand * num(product.costPrice) + l.quantity * num(l.unitCost)) / (onHand + l.quantity))
          : num(l.unitCost);
        await tx.product.update({ where: { id: product.id }, data: { costPrice: newCost } });
        await tx.stockLevel.upsert({
          where: { productId_warehouseId: { productId: l.productId, warehouseId: o.warehouseId } },
          update: { quantity: { increment: l.quantity } },
          create: { productId: l.productId, warehouseId: o.warehouseId, quantity: l.quantity },
        });
        await tx.stockMovement.create({
          data: {
            productId: l.productId,
            warehouseId: o.warehouseId,
            type: 'IN',
            quantity: l.quantity,
            reference: o.number,
            createdById: req.user!.id,
          },
        });
      }
      await postJournal(tx, {
        description: `Goods received ${o.number}`,
        reference: o.number,
        createdById: req.user!.id,
        lines: [
          { code: ACC.INVENTORY, debit: num(o.total) },
          { code: ACC.AP, credit: num(o.total) },
        ],
      });
      return tx.purchaseOrder.update({ where: { id: o.id }, data: { status: 'RECEIVED' }, include: purchaseInclude });
    });
    await audit(req, 'RECEIVE', 'purchaseOrder', po.id);
    res.json(po);
  }),
);

/** Settle the supplier bill in full: clears accounts payable against cash. */
ordersRouter.post(
  '/purchase-orders/:id/pay',
  authorize('PURCHASING', 'ACCOUNTANT'),
  asyncHandler(async (req, res) => {
    const po = await prisma.$transaction(async (tx) => {
      const o = await tx.purchaseOrder.findUnique({ where: { id: req.params.id } });
      if (!o) throw new HttpError(404, 'Purchase order not found');
      if (o.status !== 'RECEIVED') throw new HttpError(409, 'Goods must be received before paying');
      if (o.paidAt) throw new HttpError(409, 'Purchase order is already paid');
      await postJournal(tx, {
        description: `Supplier payment ${o.number}`,
        reference: o.number,
        createdById: req.user!.id,
        lines: [
          { code: ACC.AP, debit: num(o.total) },
          { code: ACC.CASH, credit: num(o.total) },
        ],
      });
      return tx.purchaseOrder.update({ where: { id: o.id }, data: { paidAt: new Date() }, include: purchaseInclude });
    });
    await audit(req, 'PAY', 'purchaseOrder', po.id);
    res.json(po);
  }),
);
