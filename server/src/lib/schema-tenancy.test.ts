import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TENANT_MODELS } from './tenant-scope';

const schema = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');
const blocks = [...schema.matchAll(/^model (\w+) \{\n([\s\S]*?)^\}/gm)].map((m) => ({ name: m[1], body: m[2] }));

test('every model except Tenant has a tenantId column and is registered for scoping', () => {
  assert.ok(blocks.length > 10, 'schema should have been parsed');
  const owned = blocks.filter((b) => b.name !== 'Tenant');
  for (const b of owned) {
    assert.match(b.body, /^\s*tenantId\s+String/m, `${b.name} is missing tenantId`);
    assert.ok(TENANT_MODELS.has(b.name), `${b.name} is not listed in TENANT_MODELS (src/lib/tenant-scope.ts)`);
  }
  // and nothing is registered that no longer exists
  const names = new Set(blocks.map((b) => b.name));
  for (const m of TENANT_MODELS) assert.ok(names.has(m), `TENANT_MODELS lists unknown model ${m}`);
});

test('human-entered identifiers are unique per tenant, not globally', () => {
  for (const [model, field] of [
    ['User', 'email'],
    ['Employee', 'code'],
    ['Product', 'sku'],
    ['Account', 'code'],
    ['Invoice', 'number'],
  ] as const) {
    const body = blocks.find((b) => b.name === model)!.body;
    assert.match(body, new RegExp(`@@unique\\(\\[tenantId, ${field}\\]\\)`), `${model}.${field} should be unique per tenant`);
    assert.doesNotMatch(body, new RegExp(`^\\s*${field}\\s+String\\s+@unique`, 'm'), `${model}.${field} must not be globally unique`);
  }
});
