#!/usr/bin/env node
// One-off: extract the `const DATA = {...}` blob from source/game-vault.html
// and write it out as src/data/games.json with expanded key names.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const htmlPath = path.join(repoRoot, 'source', 'game-vault.html');
const outPath = path.join(repoRoot, 'src', 'data', 'games.json');

const html = readFileSync(htmlPath, 'utf8');

const match = html.match(/const DATA = (\{.*?\});/s);
if (!match) {
  throw new Error(`Could not find "const DATA = {...};" in ${htmlPath}`);
}

/** @type {{ tags: string[], games: { n: string, i: number, h: number, m: number|null, u: number|null, y: number|null, d: number, f: number, t: number[] }[] }} */
const raw = JSON.parse(match[1]);

// --- Assertions ---
if (!Array.isArray(raw.tags) || raw.tags.length !== 46) {
  throw new Error(`Expected exactly 46 tags, got ${raw.tags?.length}`);
}
if (!Array.isArray(raw.games) || raw.games.length !== 637) {
  throw new Error(`Expected exactly 637 games, got ${raw.games?.length}`);
}
for (const g of raw.games) {
  for (const t of g.t) {
    if (t < 0 || t >= raw.tags.length) {
      throw new Error(`Game "${g.n}" has out-of-range tag index ${t}`);
    }
  }
  if (![0, 1, 2].includes(g.d)) {
    throw new Error(`Game "${g.n}" has invalid deck status ${g.d}`);
  }
}

// --- Map compact keys to expanded Game keys ---
const games = raw.games.map((g) => ({
  name: g.n,
  appId: g.i,
  hours: g.h,
  metascore: g.m,
  userScore: g.u,
  year: g.y,
  deck: g.d,
  features: g.f,
  tagIndexes: g.t,
}));

const library = { tags: raw.tags, games };

writeFileSync(outPath, JSON.stringify(library, null, 2) + '\n', 'utf8');

console.log(`Wrote ${outPath}`);
console.log(`  games: ${games.length}`);
console.log(`  tags:  ${raw.tags.length}`);
