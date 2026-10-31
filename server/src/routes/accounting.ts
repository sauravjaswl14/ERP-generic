import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { crud, audit } from '../lib/crud';
import { P } from '../lib/permissions';
import { authorize } from '../middleware/auth';
import { asyncHandler, HttpError } from '../middleware/error';
import { nextNumber, num, round2 } from '../lib/accounting';

export const accountingRouter = Router();

const entryInclude = { lines: { include: { account: true } } };

accountingRouter.use(
  '/journal-entries',
  crud({
    model: 'journalEntry',
    searchFields: ['number', 'description', 'reference'],
    include: entryInclude,
    orderBy: { date: 'desc' },
    methods: ['list', 'get'],
    ...P.accounting,
  }),
);

const entrySchema = z.object({
  date: z.coerce.date().optional(),
  description: z.string().trim().min(1),
  reference: z.string().trim().min(1).optional().nullable(),
  lines: z
    .array(
      z.object({
        accountId: z.string().uuid(),
        debit: z.coerce.number().min(0).default(0),
        credit: z.coerce.number().min(0).default(0),
        memo: z.string().trim().min(1).optional().nullable(),
      }),
    )
    .min(2, 'A journal entry needs at least two lines'),
});

accountingRouter.post(
  '/journal-entries',
  authorize(...P.accounting.write),
  asyncHandler(async (req, res) => {
    const d = entrySchema.parse(req.body);
    for (const l of d.lines) {
      if ((l.debit > 0) === (l.credit > 0)) {
        throw new HttpError(400, 'Each line must have either a debit or a credit amount (not both, not neither)');
      }
    }
    const debit = round2(d.lines.reduce((s, l) => s + l.debit, 0));
    const credit = round2(d.lines.reduce((s, l) => s + l.credit, 0));
    if (debit !== credit) throw new HttpError(400, `Entry is not balanced: debits ${debit.toFixed(2)} ≠ credits ${credit.toFixed(2)}`);

    const entry = await prisma.$transaction(async (tx) =>
      tx.journalEntry.create({
        data: {
          number: await nextNumber(tx, 'JE', 'JE'),
          date: d.date,
          description: d.description,
          reference: d.reference,
          createdById: req.user!.id,
          lines: { create: d.lines },
        },
        include: entryInclude,
      }),
    );
    await audit(req, 'CREATE', 'journalEntry', entry.id);
    res.status(201).json(entry);
  }),
);

/** Trial balance and a summary of the main statements, optionally up to a date (?to=YYYY-MM-DD). */
accountingRouter.get(
  '/reports/trial-balance',
  authorize(...P.accounting.read),
  asyncHandler(async (req, res) => {
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    if (to && Number.isNaN(to.getTime())) throw new HttpError(400, 'Invalid "to" date');

    const grouped = await prisma.journalLine.groupBy({
      by: ['accountId'],
      where: to ? { entry: { date: { lte: to } } } : {},
      _sum: { debit: true, credit: true },
    });
    const sums = new Map(grouped.map((g) => [g.accountId, g._sum]));
    const accounts = await prisma.account.findMany({ orderBy: { code: 'asc' } });

    const rows = accounts.map((a) => {
      const debit = num(sums.get(a.id)?.debit);
      const credit = num(sums.get(a.id)?.credit);
      const net = round2(debit - credit);
      return { id: a.id, code: a.code, name: a.name, type: a.type, debit: round2(debit), credit: round2(credit), balance: net };
    });

    const byType = (t: string) => rows.filter((r) => r.type === t).reduce((s, r) => s + r.balance, 0);
    const revenue = round2(-byType('REVENUE'));
    const expenses = round2(byType('EXPENSE'));
    const summary = {
      assets: round2(byType('ASSET')),
      liabilities: round2(-byType('LIABILITY')),
      equity: round2(-byType('EQUITY')),
      revenue,
      expenses,
      netIncome: round2(revenue - expenses),
    };
    res.json({
      rows: rows.filter((r) => r.debit || r.credit),
      totals: {
        debit: round2(rows.reduce((s, r) => s + r.debit, 0)),
        credit: round2(rows.reduce((s, r) => s + r.credit, 0)),
      },
      summary,
    });
  }),
);
