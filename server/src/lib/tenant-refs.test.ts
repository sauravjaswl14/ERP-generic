import test from 'node:test';
import assert from 'node:assert/strict';
import { collectRefs, MissingReferenceError, verifyRefs } from './tenant-refs';

const ids = (m: Map<string, Set<string>>) => Object.fromEntries([...m].map(([k, v]) => [k, [...v].sort()]));

test('finds foreign keys at the top level and inside nested lines', () => {
  const refs = collectRefs('SalesOrder', {
    customerId: 'c1',
    warehouseId: 'w1',
    notes: 'free text',
    lines: [{ productId: 'p1', quantity: 2 }, { productId: 'p2' }, { productId: 'p1' }],
  });
  assert.deepEqual(ids(refs), { Customer: ['c1'], Warehouse: ['w1'], Product: ['p1', 'p2'] });
});

test('null, undefined and non-string values are ignored', () => {
  assert.deepEqual(ids(collectRefs('Lead', { ownerId: null, name: 'x', value: 5, due: new Date() })), {});
});

test('managerId points at Employee on employees but at User on projects', () => {
  assert.deepEqual(ids(collectRefs('Employee', { managerId: 'e1' })), { Employee: ['e1'] });
  assert.deepEqual(ids(collectRefs('Project', { managerId: 'u1' })), { User: ['u1'] });
});

test('transfer payload fields are recognised', () => {
  assert.deepEqual(ids(collectRefs('StockMovement', { productId: 'p', fromWarehouseId: 'a', toWarehouseId: 'b' })), { Product: ['p'], Warehouse: ['a', 'b'] });
});

test('relation writes that bypass scalar keys are refused', () => {
  for (const op of ['connect', 'connectOrCreate', 'disconnect', 'set']) {
    assert.throws(() => collectRefs('Task', { project: { [op]: { id: 'x' } } }), /not allowed/, op);
  }
});

test('verifyRefs passes when every id is owned and fails when any is missing', async () => {
  const refs = collectRefs('SalesOrder', { customerId: 'c1', lines: [{ productId: 'p1' }, { productId: 'p2' }] });
  await verifyRefs(refs, async (_t, list) => list.length);
  await assert.rejects(
    verifyRefs(refs, async (target, list) => (target === 'Product' ? list.length - 1 : list.length)),
    (e: unknown) => e instanceof MissingReferenceError && e.target === 'Product',
  );
});

test('verifyRefs does nothing for payloads without foreign keys', async () => {
  await verifyRefs(collectRefs('Customer', { name: 'x' }), async () => assert.fail('should not query'));
});
