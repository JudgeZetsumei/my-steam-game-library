#!/usr/bin/env node
// Re-run art enrichment against the committed src/data/games.json in place,
// without needing the source CSV export. Same logic as the enrichment step in
// csv-to-games.mjs: HEAD-check every game's legacy Steam CDN header URL,
// resolve failures via SteamGridDB, and bake the result in as `artUrl`.
// Useful for refreshing rotted URLs between CSV refreshes.
//
// Usage: SGDB_API_KEY in .env.local (or env), then `npm run data:art`.
// Requires Node >= 22.18 (native TypeScript type stripping).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { enrichGamesWithArt } from '../src/lib/art-resolver.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const dataPath = path.join(repoRoot, 'src', 'data', 'games.json');

try {
  process.loadEnvFile(path.join(repoRoot, '.env.local'));
} catch {
  // no .env.local — fall through to plain process.env
}
const sgdbKey = process.env.SGDB_API_KEY;
if (!sgdbKey) {
  console.error('SGDB_API_KEY not set. Add it to .env.local (gitignored) and re-run.');
  process.exit(1);
}

const library = JSON.parse(readFileSync(dataPath, 'utf8'));
const result = await enrichGamesWithArt(library.games, sgdbKey, {
  onProgress: (msg) => console.log(msg),
});

writeFileSync(dataPath, JSON.stringify(library, null, 2) + '\n', 'utf8');
console.log(`Wrote ${dataPath}`);
console.log(
  `  ${result.resolved.length} SGDB overrides, ${result.unresolved.length} monogram fallbacks`,
);
