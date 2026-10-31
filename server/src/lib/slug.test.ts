import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceSlug } from './slug';

test('accepts well-formed slugs and normalises case and whitespace', () => {
  assert.equal(workspaceSlug.parse('acme'), 'acme');
  assert.equal(workspaceSlug.parse('  Acme-Corp-2  '), 'acme-corp-2');
  assert.equal(workspaceSlug.parse('a1b'), 'a1b');
});

test('rejects bad shapes', () => {
  for (const bad of ['', 'ab', '-acme', 'acme-', 'ac me', 'acme_corp', 'acme.io', 'a'.repeat(41), 'ünï']) {
    assert.equal(workspaceSlug.safeParse(bad).success, false, JSON.stringify(bad));
  }
});

test('rejects reserved names', () => {
  for (const r of ['admin', 'api', 'WWW']) assert.equal(workspaceSlug.safeParse(r).success, false, r);
});
