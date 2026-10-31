import { Prisma } from '@prisma/client';
import { HttpError } from '../middleware/error';

export type Tx = Prisma.TransactionClient;

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const num = (d: Prisma.Decimal | number | string | null | undefined) => (d == null ? 0 : Number(d));
export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

/** Atomic, gap-tolerant document numbering (e.g. SO-00001). */
export async function nextNumber(tx: Tx, key: string, prefix: string, pad = 5) {
  const seq = await tx.sequence.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  return `${prefix}-${String(seq.value).padStart(pad, '0')}`;
}

export interface PostLine {
  code: string;
  debit?: number;
  credit?: number;
  memo?: string;
}

/**
 * Posts a balanced journal entry using account codes. Zero-value lines are dropped.
 * Called inside the business transaction so documents and ledger always commit together.
 */
export async function postJournal(
  tx: Tx,
  p: { date?: Date; description: string; reference?: string; createdById?: string; lines: PostLine[] },
) {
  const lines = p.lines.filter((l) => (l.debit ?? 0) > 0 || (l.credit ?? 0) > 0);
  if (!lines.length) return null;
  const debit = round2(lines.reduce((s, l) => s + (l.debit ?? 0), 0));
  const credit = round2(lines.reduce((s, l) => s + (l.credit ?? 0), 0));
  if (debit !== credit) throw new HttpError(500, `Unbalanced journal entry (${debit} vs ${credit})`);

  const codes = [...new Set(lines.map((l) => l.code))];
  const accounts = await tx.account.findMany({ where: { code: { in: codes } } });
  const byCode = new Map(accounts.map((a) => [a.code, a.id]));
  for (const c of codes) {
    if (!byCode.has(c)) throw new HttpError(409, `Chart of accounts is missing required account ${c}`);
  }
  const number = await nextNumber(tx, 'JE', 'JE');
  return tx.journalEntry.create({
    data: {
      number,
      date: p.date ?? new Date(),
      description: p.description,
      reference: p.reference,
      createdById: p.createdById,
      lines: {
        create: lines.map((l) => ({
          accountId: byCode.get(l.code)!,
          debit: l.debit ?? 0,
          credit: l.credit ?? 0,
          memo: l.memo,
        })),
      },
    },
  });
}

/** Account codes used by automatic postings. Keep in sync with the seeded chart of accounts. */
export const ACC = {
  CASH: '1000',
  AR: '1100',
  INVENTORY: '1200',
  AP: '2000',
  SALES_TAX: '2100',
  REVENUE: '4000',
  COGS: '5000',
  SALARIES: '5100',
} as const;
