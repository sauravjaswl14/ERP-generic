/**
 * Tenant isolation against a REAL database. Run with:  npm run test:integration -w server
 * Needs DATABASE_URL pointing at a disposable database whose schema is current (npm run db:push).
 * It creates two throw-away workspaces with random names and does not clean them up.
 */
import 'dotenv/config';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma, prismaBase } from '../lib/prisma';
import { provisionTenant } from '../lib/tenants';
import { runWithTenant } from '../lib/tenant-context';
import { assertRefs } from '../lib/refs';
import { nextNumber } from '../lib/accounting';

let A = '';
let B = '';
const as = <T>(tenantId: string, fn: () => Promise<T>) => runWithTenant(tenantId, fn);

before(async () => {
  const run = randomUUID().slice(0, 8);
  const make = async (label: string) =>
    (
      await provisionTenant({
        slug: `it-${label}-${run}`,
        name: `Integration ${label}`,
        adminName: 'Admin',
        adminEmail: 'admin@same.example', // identical in both tenants on purpose
        adminPassword: 'Password123!',
      })
    ).tenant.id;
  A = await make('a');
  B = await make('b');
});

after(async () => {
  await prismaBase.$disconnect();
});

test('provisioning creates the chart of accounts per tenant and allows the same admin email in two tenants', async () => {
  const [a, b] = await Promise.all([as(A, () => prisma.account.count()), as(B, () => prisma.account.count())]);
  assert.equal(a, 14);
  assert.equal(b, 14);
  assert.equal(await prismaBase.user.count({ where: { email: 'admin@same.example', tenantId: { in: [A, B] } } }), 2);
});

test('one tenant cannot list, read, update or delete another tenant\'s rows', async () => {
  const customer = await as(A, () => prisma.customer.create({ data: { name: 'Only in A' } }));
  assert.equal(customer.tenantId, A);

  assert.equal(await as(B, () => prisma.customer.count()), 0);
  assert.deepEqual(await as(B, () => prisma.customer.findMany()), []);
  assert.equal(await as(B, () => prisma.customer.findUnique({ where: { id: customer.id } })), null);
  await assert.rejects(as(B, () => prisma.customer.update({ where: { id: customer.id }, data: { name: 'hijacked' } })));
  await assert.rejects(as(B, () => prisma.customer.delete({ where: { id: customer.id } })));
  assert.equal((await as(B, () => prisma.customer.updateMany({ where: { id: customer.id }, data: { name: 'x' } }))).count, 0);
  assert.equal((await as(B, () => prisma.customer.deleteMany({ where: {} }))).count, 0);

  const still = await as(A, () => prisma.customer.findUniqueOrThrow({ where: { id: customer.id } }));
  assert.equal(still.name, 'Only in A');
});

test('a caller-supplied tenantId is ignored on create and cannot be changed on update', async () => {
  const row = await as(A, () => prisma.customer.create({ data: { name: 'spoof', tenantId: B } }));
  assert.equal(row.tenantId, A);
  const updated = await as(A, () => prisma.customer.update({ where: { id: row.id }, data: { name: 'spoof 2', tenantId: B } }));
  assert.equal(updated.tenantId, A);
});

test('the same business code can exist in two tenants but not twice in one', async () => {
  const mk = (tenantId: string) =>
    as(tenantId, () => prisma.warehouse.create({ data: { code: 'MAIN', name: 'Main' } }));
  await mk(A);
  await mk(B);
  await assert.rejects(mk(A), (e: unknown) => (e as { code?: string }).code === 'P2002');
});

test('document numbers are sequenced independently per tenant', async () => {
  const next = (tenantId: string) => as(tenantId, () => prisma.$transaction((tx) => nextNumber(tx, 'SO', 'SO')));
  assert.equal(await next(A), 'SO-00001');
  assert.equal(await next(A), 'SO-00002');
  assert.equal(await next(B), 'SO-00001');
});

test('scoping and stamping also hold inside interactive transactions', async () => {
  await as(A, () => prisma.supplier.create({ data: { name: 'Supplier of A' } }));
  const seenInB = await as(B, () =>
    prisma.$transaction(async (tx) => {
      const created = await tx.supplier.create({ data: { name: 'Supplier of B' } });
      assert.equal(created.tenantId, B);
      return tx.supplier.findMany();
    }),
  );
  assert.deepEqual(seenInB.map((s) => s.name), ['Supplier of B']);
});

test('nested order lines are stamped with the tenant', async () => {
  const order = await as(A, async () => {
    const customer = await prisma.customer.create({ data: { name: 'Buyer' } });
    const warehouse = await prisma.warehouse.create({ data: { code: 'W2', name: 'Second' } });
    const product = await prisma.product.create({ data: { sku: 'SKU-1', name: 'Thing' } });
    return prisma.salesOrder.create({
      data: {
        number: 'SO-X',
        customerId: customer.id,
        warehouseId: warehouse.id,
        subtotal: 10,
        total: 10,
        lines: { create: [{ productId: product.id, quantity: 1, unitPrice: 10, lineTotal: 10 }] },
      },
    });
  });
  const lines = await prismaBase.salesOrderLine.findMany({ where: { salesOrderId: order.id } });
  assert.equal(lines.length, 1);
  assert.equal(lines[0].tenantId, A);
});

test('references to another tenant\'s records are rejected before writing', async () => {
  const foreign = await as(A, () => prisma.customer.create({ data: { name: 'A customer' } }));
  await assert.rejects(as(B, () => assertRefs('SalesOrder', { customerId: foreign.id, lines: [] })), /customer was not found/);
  await as(A, () => assertRefs('SalesOrder', { customerId: foreign.id, lines: [] })); // own record is fine
});

test('using the scoped client outside a tenant context fails instead of returning data', async () => {
  await assert.rejects(Promise.resolve().then(() => prisma.customer.findMany()), /No tenant in context/);
});
