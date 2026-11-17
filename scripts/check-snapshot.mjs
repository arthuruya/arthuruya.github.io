// Validates public/data/snapshot.json + snapshot.bin (RENCANA 4.1).
// Always: structure, byte length, speed, fill share, steps. With RELEASE=1: also fails if the
// files are missing or `synthetic` is true.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateField, validateMeta } from '../src/lib/drift/field.ts';

const root = resolve(import.meta.dirname, '..');
const jsonPath = resolve(root, 'public/data/snapshot.json');
const binPath = resolve(root, 'public/data/snapshot.bin');
const release = process.env.RELEASE === '1';

const fail = (msgs) => {
  for (const m of msgs) console.error(`check:snapshot  ${m}`);
  console.error(
    `\ncheck:snapshot FAILED: ${msgs.length} finding(s)${release ? ' (RELEASE=1)' : ''}`,
  );
  process.exit(1);
};

if (!existsSync(jsonPath) || !existsSync(binPath)) {
  if (release) fail(['public/data/snapshot.json and snapshot.bin are required for a release']);
  console.log(
    'check:snapshot OK (no snapshot present; run `node scripts/dev-field.mjs` for a synthetic one)',
  );
  process.exit(0);
}

let meta;
try {
  meta = JSON.parse(readFileSync(jsonPath, 'utf8'));
} catch (e) {
  fail([`snapshot.json is not valid JSON: ${e.message}`]);
}
const errs = validateMeta(meta);
if (errs.length) fail(errs);

const buf = readFileSync(binPath);
if (buf.length % 2 !== 0) fail([`snapshot.bin has an odd byte length (${buf.length})`]);
// Int16 little-endian regardless of host byte order
const data = new Int16Array(buf.length / 2);
for (let i = 0; i < data.length; i++) data[i] = buf.readInt16LE(2 * i);

const all = validateField(meta, data);
if (release && meta.synthetic)
  all.push('snapshot.json is flagged synthetic: not allowed in a release');
if (all.length) fail(all);

console.log(
  `check:snapshot OK (${meta.synthetic ? 'SYNTHETIC' : 'real'}, ${meta.nx}x${meta.ny}, ${meta.steps} steps, ${buf.length} bytes)`,
);
