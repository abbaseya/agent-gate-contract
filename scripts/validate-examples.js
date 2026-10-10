#!/usr/bin/env node
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { validateResponse, validateChain } from '../packages/validator/index.js';

const usage = 'usage: validate-examples.js [response.json ...] [--chain dir ...]';
const args = process.argv.slice(2);
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const chainFiles = (dir) => readdirSync(dir).filter((name) => name.endsWith('.json')).sort().map((name) => join(dir, name));

const targets = [];
if (args.length === 0) {
  readdirSync('examples').filter((name) => name.endsWith('.json')).forEach((name) => targets.push({ file: join('examples', name) }));
  readdirSync('examples/chains').forEach((dir) => targets.push({ chain: join('examples/chains', dir) }));
} else {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--chain') targets.push({ chain: args[++index] });
    else if (args[index].startsWith('-')) { console.error(usage); process.exit(2); }
    else if (statSync(args[index]).isDirectory()) targets.push({ chain: args[index] });
    else targets.push({ file: args[index] });
  }
}

let failed = 0;
for (const target of targets) {
  const errors = target.chain ? validateChain(chainFiles(target.chain).map(read)) : validateResponse(read(target.file));
  const name = target.chain || target.file;
  if (errors.length === 0) console.log(`ok    ${name}`);
  else {
    failed += 1;
    console.log(`FAIL  ${name}`);
    errors.forEach((error) => console.log(`      ${error.rule} ${error.path}: ${error.message}`));
  }
}
console.log(`${targets.length - failed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
