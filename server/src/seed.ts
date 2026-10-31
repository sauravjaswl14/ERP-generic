import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma, prismaBase } from './lib/prisma';
import { runWithTenant } from './lib/tenant-context';
import { DEFAULT_ACCOUNTS } from './lib/chart-of-accounts';

const SLUG = (process.env.SEED_TENANT_SLUG ?? 'demo').toLowerCase();
const NAME = process.env.SEED_TENANT_NAME ?? 'Demo Company';

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
  const hash = await bcrypt.hash(adminPassword, 12);

  const tenant = await prismaBase.tenant.upsert({ where: { slug: SLUG }, update: {}, create: { slug: SLUG, name: NAME } });
  const tenantId = tenant.id;

  // Everything below runs in the tenant's context, so the scoped client stamps tenantId on each row.
  await runWithTenant(tenantId, async () => {
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
      await prisma.user.upsert({
        where: { tenantId_email: { tenantId, email: u.email } },
        update: {},
        create: { ...u, passwordHash: hash },
      });
    }

    // Chart of accounts (codes referenced by automatic postings in src/lib/accounting.ts)
    for (const [code, name, type] of DEFAULT_ACCOUNTS) {
      await prisma.account.upsert({ where: { tenantId_code: { tenantId, code } }, update: {}, create: { code, name, type } });
    }

    // Master data
    const dept = (code: string, name: string) =>
      prisma.department.upsert({ where: { tenantId_code: { tenantId, code } }, update: {}, create: { code, name } });
    const eng = await dept('ENG', 'Engineering');
    const ops = await dept('OPS', 'Operations');
    await dept('FIN', 'Finance');

    const employees = [
      { code: 'E001', firstName: 'Anil', lastName: 'Sharma', email: 'anil@example.com', position: 'Software Engineer', salary: 960000, departmentId: eng.id },
      { code: 'E002', firstName: 'Bina', lastName: 'Thapa', email: 'bina@example.com', position: 'Operations Lead', salary: 840000, departmentId: ops.id },
    ];
    for (const e of employees) {
      await prisma.employee.upsert({
        where: { tenantId_code: { tenantId, code: e.code } },
        update: {},
        create: { ...e, hireDate: new Date('2024-01-15') },
      });
    }

    const wh = await prisma.warehouse.upsert({
      where: { tenantId_code: { tenantId, code: 'MAIN' } },
      update: {},
      create: { code: 'MAIN', name: 'Main Warehouse', location: 'Head office' },
    });
    await prisma.warehouse.upsert({ where: { tenantId_code: { tenantId, code: 'SEC' } }, update: {}, create: { code: 'SEC', name: 'Secondary Warehouse' } });

    const products = [
      { sku: 'LAP-001', name: 'Business Laptop 14"', category: 'Electronics', unitPrice: 1200, costPrice: 900, reorderLevel: 5, qty: 25 },
      { sku: 'MON-024', name: '24" Monitor', category: 'Electronics', unitPrice: 220, costPrice: 150, reorderLevel: 10, qty: 40 },
      { sku: 'DSK-010', name: 'Standing Desk', category: 'Furniture', unitPrice: 480, costPrice: 310, reorderLevel: 5, qty: 3 },
    ];
    for (const { qty, ...p } of products) {
      const product = await prisma.product.upsert({ where: { tenantId_sku: { tenantId, sku: p.sku } }, update: {}, create: p });
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
    if (!(await prisma.journalEntry.count())) {
      const cash = await prisma.account.findUniqueOrThrow({ where: { tenantId_code: { tenantId, code: '1000' } } });
      const equity = await prisma.account.findUniqueOrThrow({ where: { tenantId_code: { tenantId, code: '3000' } } });
      await prisma.sequence.upsert({
        where: { tenantId_key: { tenantId, key: 'JE' } },
        update: { value: 1 },
        create: { tenantId, key: 'JE', value: 1 },
      });
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
  });

  console.log('Seed complete.');
  console.log(`Sign in with workspace "${SLUG}", admin@erp.local / ${adminPassword} (all demo users share this password).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prismaBase.$disconnect());
