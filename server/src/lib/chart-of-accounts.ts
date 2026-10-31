import type { AccountType } from '@prisma/client';

/**
 * Starting chart of accounts created for every new tenant.
 * Codes 1000, 1100, 1200, 2000, 2100, 4000, 5000 and 5100 are used by automatic postings
 * (see ACC in accounting.ts) and must exist.
 */
export const DEFAULT_ACCOUNTS: [code: string, name: string, type: AccountType][] = [
  ['1000', 'Cash and Bank', 'ASSET'],
  ['1100', 'Accounts Receivable', 'ASSET'],
  ['1200', 'Inventory', 'ASSET'],
  ['1500', 'Fixed Assets', 'ASSET'],
  ['2000', 'Accounts Payable', 'LIABILITY'],
  ['2100', 'Sales Tax Payable', 'LIABILITY'],
  ['3000', "Owner's Equity", 'EQUITY'],
  ['3100', 'Retained Earnings', 'EQUITY'],
  ['4000', 'Sales Revenue', 'REVENUE'],
  ['4100', 'Other Income', 'REVENUE'],
  ['5000', 'Cost of Goods Sold', 'EXPENSE'],
  ['5100', 'Salaries Expense', 'EXPENSE'],
  ['5200', 'Operating Expenses', 'EXPENSE'],
  ['5300', 'Rent Expense', 'EXPENSE'],
];
