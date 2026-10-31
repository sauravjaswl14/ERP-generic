import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/error';
import { num, round2 } from '../lib/accounting';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const role = req.user!.role;
    const can = (...roles: string[]) => role === 'ADMIN' || role === 'MANAGER' || roles.includes(role);

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const out: Record<string, unknown> = {};

    if (can('SALES', 'ACCOUNTANT')) {
      const [invoices, openOrders, customers] = await Promise.all([
        prisma.invoice.findMany({ where: { issueDate: { gte: sixMonthsAgo }, status: { not: 'VOID' } }, select: { issueDate: true, total: true } }),
        prisma.salesOrder.count({ where: { status: 'DRAFT' } }),
        prisma.customer.count(),
      ]);
      const months: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ month: d.toLocaleString('en', { month: 'short' }), revenue: 0 });
      }
      for (const inv of invoices) {
        const idx = 5 - ((now.getFullYear() - inv.issueDate.getFullYear()) * 12 + now.getMonth() - inv.issueDate.getMonth());
        if (idx >= 0 && idx < 6) months[idx].revenue = round2(months[idx].revenue + num(inv.total));
      }
      const open = await prisma.invoice.findMany({ where: { status: { in: ['UNPAID', 'PARTIAL'] } }, select: { total: true, paid: true, dueDate: true } });
      out.sales = {
        revenueThisMonth: round2(invoices.filter((i) => i.issueDate >= monthStart).reduce((s, i) => s + num(i.total), 0)),
        receivables: round2(open.reduce((s, i) => s + num(i.total) - num(i.paid), 0)),
        overdueInvoices: open.filter((i) => i.dueDate < now).length,
        draftOrders: openOrders,
        customers,
        monthly: months,
      };
      out.recentOrders = await prisma.salesOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { customer: { select: { name: true } } },
      });
    }

    if (can('INVENTORY', 'PURCHASING', 'SALES')) {
      const products = await prisma.product.findMany({ where: { isActive: true }, select: { id: true, sku: true, name: true, reorderLevel: true, costPrice: true } });
      const totals = await prisma.stockLevel.groupBy({ by: ['productId'], _sum: { quantity: true } });
      const totalBy = new Map(totals.map((t) => [t.productId, t._sum.quantity ?? 0]));
      const low = products
        .map((p) => ({ ...p, onHand: totalBy.get(p.id) ?? 0 }))
        .filter((p) => p.onHand <= p.reorderLevel)
        .slice(0, 8);
      out.inventory = {
        products: products.length,
        stockValue: round2(products.reduce((s, p) => s + (totalBy.get(p.id) ?? 0) * num(p.costPrice), 0)),
        lowStock: low,
      };
    }

    if (can('PURCHASING', 'ACCOUNTANT')) {
      out.purchasing = {
        openOrders: await prisma.purchaseOrder.count({ where: { status: { in: ['DRAFT', 'ORDERED'] } } }),
        unpaid: await prisma.purchaseOrder.count({ where: { status: 'RECEIVED', paidAt: null } }),
      };
    }

    if (can('HR')) {
      out.hr = {
        activeEmployees: await prisma.employee.count({ where: { status: 'ACTIVE' } }),
        pendingLeave: await prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      };
    }

    out.projects = {
      active: await prisma.project.count({ where: { status: 'ACTIVE' } }),
      myOpenTasks: await prisma.task.count({ where: { assigneeId: req.user!.id, status: { not: 'DONE' } } }),
    };

    res.json(out);
  }),
);
