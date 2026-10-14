import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validateResponse, validateChain } from './index.js';

const root = new URL('../../examples/', import.meta.url);
const load = (rel) => JSON.parse(readFileSync(new URL(rel, root), 'utf8'));
const jsonIn = (rel) => readdirSync(new URL(rel, root)).filter((name) => name.endsWith('.json')).sort();
const loadChain = (dir) => jsonIn(`${dir}/`).map((name) => load(`${dir}/${name}`));
const expected = load('invalid/expected.json');

for (const name of jsonIn('.')) {
  test(`valid example ${name}`, () => assert.deepEqual(validateResponse(load(name)), []));
}

for (const dir of readdirSync(new URL('chains/', root))) {
  test(`valid chain ${dir}`, () => assert.deepEqual(validateChain(loadChain(`chains/${dir}`)), []));
}

for (const name of jsonIn('invalid').filter((name) => name !== 'expected.json')) {
  test(`invalid example ${name} fails on ${expected[name]}`, () => {
    const rules = validateResponse(load(`invalid/${name}`)).map((error) => error.rule);
    assert.ok(rules.includes(expected[name]), `expected ${expected[name]}, got ${JSON.stringify(rules)}`);
  });
}

for (const dir of readdirSync(new URL('invalid-chains/', root))) {
  const rule = expected[`invalid-chains/${dir}`];
  test(`invalid chain ${dir} fails on ${rule}`, () => {
    const rules = validateChain(loadChain(`invalid-chains/${dir}`)).map((error) => error.rule);
    assert.ok(rules.includes(rule), `expected ${rule}, got ${JSON.stringify(rules)}`);
  });
}

test('a regressed finding must have been carried as closed', () => {
  const [first, second] = loadChain('chains/code-review');
  const reopened = structuredClone(second);
  reopened.carried = ['code-review/stale-doc/docs/sync.md#Repair'];
  reopened.findings[0].status = 'regressed';
  const rules = validateChain([first, reopened]).map((error) => `${error.rule} ${error.message}`);
  assert.ok(rules.some((rule) => rule.includes('is regressed but no earlier round carried it')));
});

test('a carried finding cannot be reported in the same round', () => {
  const [first, second] = loadChain('chains/code-review');
  const both = structuredClone(second);
  both.carried.push(both.findings[0].id);
  const rules = validateChain([first, both]).map((error) => error.message);
  assert.ok(rules.some((message) => message.includes('both carried and reported')));
});

test('a response without id and related is valid as 0.1 and as 0.2', () => {
  const response = load('allow.json');
  assert.deepEqual(validateResponse({ ...response, agc: '0.1' }), []);
  assert.deepEqual(validateResponse({ ...response, agc: '0.2' }), []);
});

test('a response id needs version 0.2', () => {
  const rules = validateResponse({ ...load('allow.json'), agc: '0.1', id: 'no-push-to-main/1' }).map((error) => error.rule);
  assert.ok(rules.includes('schema'));
});

test('a chain with a new response id in each round passes', () => {
  const rounds = loadChain('invalid-chains/duplicate-response-id');
  rounds[1].id = 'code-review/pr-42/round-2';
  assert.deepEqual(validateChain(rounds), []);
});

test('a non-object is rejected', () => {
  assert.equal(validateResponse([])[0].rule, 'schema');
});
