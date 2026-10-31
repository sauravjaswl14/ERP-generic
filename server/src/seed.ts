import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { AccountType, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
  const hash = await bcrypt.hash(adminPassword, 12);

  // Users: one per role so every permission set can be tried out.
  const users: { email: string; name: string; role: Role }[] = [
    { email: 'admin@erp.local', name: 'System Admin', role: 'ADMIN' },
    { email: 'manager@erp.local', name: 'Maya Manager', role: 'MANAGER' },
    { email: 'hr@erp.local', name: 'Hari HR', role: 'HR' },
    { email: 'sales@erp.local', name: 'Sita Sales', role: 'SALES' },
    { email: 'purchasing@erp.local', name: 'Pema Purchasing', role: 'PURCHASING' },
    { email: 'inventory@erp.local', name: 'Indra Inventory', role: 'INVENTORY' },
    { email: 'accountant@erp.local', name: 'Anita Accountant', role: 'ACCOUNTANT' },
    { email: 'employee@erp.local', name: 'Eka Employee', role: 'EMPLOYEE' },
  ];
  for (const u of users) {
    await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, passwordHash: hash } });
  }

  // Chart of accounts (codes referenced by automatic postings in src/lib/accounting.ts)
  const accounts: [string, string, AccountType][] = [
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
  for (const [code, name, type] of accounts) {
    await prisma.account.upsert({ where: { code }, update: {}, create: { code, name, type } });
  }

  // Master data
  const eng = await prisma.department.upsert({ where: { code: 'ENG' }, update: {}, create: { code: 'ENG', name: 'Engineering' } });
  const ops = await prisma.department.upsert({ where: { code: 'OPS' }, update: {}, create: { code: 'OPS', name: 'Operations' } });
  await prisma.department.upsert({ where: { code: 'FIN' }, update: {}, create: { code: 'FIN', name: 'Finance' } });

  const employees = [
    { code: 'E001', firstName: 'Anil', lastName: 'Sharma', email: 'anil@example.com', position: 'Software Engineer', salary: 960000, departmentId: eng.id },
    { code: 'E002', firstName: 'Bina', lastName: 'Thapa', email: 'bina@example.com', position: 'Operations Lead', salary: 840000, departmentId: ops.id },
  ];
  for (const e of employees) {
    await prisma.employee.upsert({ where: { code: e.code }, update: {}, create: { ...e, hireDate: new Date('2024-01-15') } });
  }

  const wh = await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: { code: 'MAIN', name: 'Main Warehouse', location: 'Head office' },
  });
  await prisma.warehouse.upsert({ where: { code: 'SEC' }, update: {}, create: { code: 'SEC', name: 'Secondary Warehouse' } });

  const products = [
    { sku: 'LAP-001', name: 'Business Laptop 14"', category: 'Electronics', unitPrice: 1200, costPrice: 900, reorderLevel: 5, qty: 25 },
    { sku: 'MON-024', name: '24" Monitor', category: 'Electronics', unitPrice: 220, costPrice: 150, reorderLevel: 10, qty: 40 },
    { sku: 'DSK-010', name: 'Standing Desk', category: 'Furniture', unitPrice: 480, costPrice: 310, reorderLevel: 5, qty: 3 },
  ];
  for (const { qty, ...p } of products) {
    const product = await prisma.product.upsert({ where: { sku: p.sku }, update: {}, create: p });
    await prisma.stockLevel.upsert({
      where: { productId_warehouseId: { productId: product.id, warehouseId: wh.id } },
      update: {},
      create: { productId: product.id, warehouseId: wh.id, quantity: qty },
    });
  }

  if ((await prisma.customer.count()) === 0) {
    await prisma.customer.createMany({
      data: [
        { name: 'Acme Trading Pvt. Ltd.', email: 'buy@acme.example', phone: '+977-1-5550101', creditLimit: 50000 },
        { name: 'Himalayan Retail Co.', email: 'orders@himretail.example', creditLimit: 20000 },
      ],
    });
  }
  if ((await prisma.supplier.count()) === 0) {
    await prisma.supplier.createMany({
      data: [
        { name: 'Global Tech Distributors', email: 'sales@gtd.example' },
        { name: 'Office Furnishings Ltd.', email: 'hello@officefurn.example' },
      ],
    });
  }

  // Opening capital so the ledger starts balanced and cash is available.
  const hasJournal = await prisma.journalEntry.count();
  if (!hasJournal) {
    const cash = await prisma.account.findUniqueOrThrow({ where: { code: '1000' } });
    const equity = await prisma.account.findUniqueOrThrow({ where: { code: '3000' } });
    await prisma.sequence.upsert({ where: { key: 'JE' }, update: { value: 1 }, create: { key: 'JE', value: 1 } });
    await prisma.journalEntry.create({
      data: {
        number: 'JE-00001',
        description: 'Opening capital',
        lines: {
          create: [
            { accountId: cash.id, debit: 100000, credit: 0 },
            { accountId: equity.id, debit: 0, credit: 100000 },
          ],
        },
      },
    });
  }

  console.log('Seed complete.');
  console.log(`Sign in with admin@erp.local / ${adminPassword} (all demo users share this password).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
