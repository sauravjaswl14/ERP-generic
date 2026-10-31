import test from 'node:test';
import assert from 'node:assert/strict';
import { scopeArgs, TENANT_MODELS } from './tenant-scope';
import { currentTenantId, maybeTenantId, runWithTenant } from './tenant-context';

const T = 'tenant-a';

test('read operations get tenantId and cannot be overridden by the caller', () => {
  for (const op of ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany', 'delete']) {
    assert.deepEqual(scopeArgs(op, { where: { id: '1' } }, T).where, { id: '1', tenantId: T }, op);
  }
  assert.deepEqual(scopeArgs('findMany', { where: { tenantId: 'tenant-b', name: 'x' } }, T).where, { name: 'x', tenantId: T });
});

test('missing args are handled (e.g. count())', () => {
  assert.deepEqual(scopeArgs('count', undefined, T), { where: { tenantId: T } });
  assert.deepEqual(scopeArgs('findMany', {}, T), { where: { tenantId: T } });
});

test('compound unique lookups keep their key and gain tenantId', () => {
  const a = scopeArgs('findUnique', { where: { productId_warehouseId: { productId: 'p', warehouseId: 'w' } } }, T);
  assert.deepEqual(a.where, { productId_warehouseId: { productId: 'p', warehouseId: 'w' }, tenantId: T });
});

test('create stamps tenantId and replaces a spoofed value', () => {
  assert.deepEqual(scopeArgs('create', { data: { name: 'x', tenantId: 'tenant-b' } }, T).data, { name: 'x', tenantId: T });
});

test('nested creates (order lines) are stamped too', () => {
  const d = scopeArgs(
    'create',
    { data: { number: 'SO-1', lines: { create: [{ productId: 'p1' }, { productId: 'p2', tenantId: 'tenant-b' }] } } },
    T,
  ).data;
  assert.equal(d.tenantId, T);
  assert.deepEqual(d.lines.create, [
    { productId: 'p1', tenantId: T },
    { productId: 'p2', tenantId: T },
  ]);
});

test('nested createMany and single nested create are stamped', () => {
  const d = scopeArgs('create', { data: { a: { create: { x: 1 } }, b: { createMany: { data: [{ y: 1 }], skipDuplicates: true } } } }, T).data;
  assert.deepEqual(d.a.create, { x: 1, tenantId: T });
  assert.deepEqual(d.b.createMany, { data: [{ y: 1, tenantId: T }], skipDuplicates: true });
});

test('createMany stamps every row', () => {
  assert.deepEqual(scopeArgs('createMany', { data: [{ a: 1 }, { a: 2 }] }, T).data, [
    { a: 1, tenantId: T },
    { a: 2, tenantId: T },
  ]);
});

test('update scopes the where and cannot move a row to another tenant', () => {
  const a = scopeArgs('update', { where: { id: '1' }, data: { name: 'n', tenantId: 'tenant-b' } }, T);
  assert.deepEqual(a.where, { id: '1', tenantId: T });
  assert.deepEqual(a.data, { name: 'n' });
});

test('upsert scopes where, stamps create and sanitizes update', () => {
  const a = scopeArgs('upsert', { where: { key: 'k' }, create: { key: 'k' }, update: { v: 1, tenantId: 'tenant-b' } }, T);
  assert.deepEqual(a.where, { key: 'k', tenantId: T });
  assert.deepEqual(a.create, { key: 'k', tenantId: T });
  assert.deepEqual(a.update, { v: 1 });
});

test('the caller arguments are not mutated', () => {
  const where = { id: '1' };
  scopeArgs('findMany', { where }, T);
  assert.deepEqual(where, { id: '1' });
});

test('unknown operations are rejected rather than run unscoped', () => {
  assert.throws(() => scopeArgs('somethingNew', {}, T), /not supported/);
});

test('every tenant-owned model is listed and Tenant is not', () => {
  assert.equal(TENANT_MODELS.has('Tenant'), false);
  for (const m of ['User', 'Invoice', 'JournalLine', 'Sequence', 'AuditLog']) assert.equal(TENANT_MODELS.has(m), true, m);
});

test('tenant context is available across awaits and fails closed outside', async () => {
  assert.equal(maybeTenantId(), undefined);
  assert.throws(() => currentTenantId(), /No tenant in context/);
  await runWithTenant('t1', async () => {
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(currentTenantId(), 't1');
    await Promise.all([runWithTenant('t2', async () => assert.equal(currentTenantId(), 't2')), (async () => assert.equal(currentTenantId(), 't1'))()]);
  });
  assert.equal(maybeTenantId(), undefined);
});
