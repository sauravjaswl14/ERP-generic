import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { crud, audit } from '../lib/crud';
import { P } from '../lib/permissions';
import { authorize } from '../middleware/auth';
import { asyncHandler, HttpError } from '../middleware/error';
import { ACC, num, postJournal, round2 } from '../lib/accounting';

export const payrollRouter = Router();

payrollRouter.use(
  '/payroll',
  crud({
    model: 'payroll',
    filterFields: ['period', 'status', 'employeeId'],
    include: { employee: { include: { department: true } } },
    methods: ['list', 'get'],
    read: ['HR', 'ACCOUNTANT', 'MANAGER'],
    write: ['HR'],
  }),
);

const generateSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Period must be YYYY-MM'),
  allowances: z.coerce.number().min(0).default(0),
  deductionRate: z.coerce.number().min(0).max(100).default(0),
});

/** Creates a DRAFT payroll line per active employee for the period (monthly = annual salary / 12). Skips existing. */
payrollRouter.post(
  '/payroll/generate',
  authorize(...P.hr.write),
  asyncHandler(async (req, res) => {
    const d = generateSchema.parse(req.body);
    const employees = await prisma.employee.findMany({ where: { status: 'ACTIVE' } });
    const existing = await prisma.payroll.findMany({ where: { period: d.period }, select: { employeeId: true } });
    const skip = new Set(existing.map((e) => e.employeeId));
    const data = employees
      .filter((e) => !skip.has(e.id))
      .map((e) => {
        const basic = round2(num(e.salary) / 12);
        const deductions = round2((basic * d.deductionRate) / 100);
        return {
          employeeId: e.id,
          period: d.period,
          basic,
          allowances: d.allowances,
          deductions,
          net: round2(basic + d.allowances - deductions),
        };
      });
    if (data.length) await prisma.payroll.createMany({ data });
    await audit(req, 'GENERATE', 'payroll', d.period);
    res.status(201).json({ created: data.length, skipped: employees.length - data.length });
  }),
);

/** Pays a payroll line and posts salaries expense against cash. */
payrollRouter.post(
  '/payroll/:id/pay',
  authorize('HR', 'ACCOUNTANT'),
  asyncHandler(async (req, res) => {
    const row = await prisma.$transaction(async (tx) => {
      const p = await tx.payroll.findUnique({ where: { id: req.params.id } });
      if (!p) throw new HttpError(404, 'Payroll record not found');
      if (p.status === 'PAID') throw new HttpError(409, 'Already paid');
      await postJournal(tx, {
        description: `Payroll ${p.period}`,
        reference: p.id,
        createdById: req.user!.id,
        lines: [
          { code: ACC.SALARIES, debit: num(p.net) },
          { code: ACC.CASH, credit: num(p.net) },
        ],
      });
      return tx.payroll.update({
        where: { id: p.id },
        data: { status: 'PAID', paidAt: new Date() },
        include: { employee: { include: { department: true } } },
      });
    });
    await audit(req, 'PAY', 'payroll', row.id);
    res.json(row);
  }),
);
