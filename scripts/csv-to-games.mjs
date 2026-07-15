#!/usr/bin/env node
// Refresh path: convert a Steam library CSV export (e.g. from steam-library-export
// tooling) into src/data/games.json, in the same shape produced by
// extract-from-html.mjs (`{ tags: string[], games: Game[] }`).
//
// Usage: node scripts/csv-to-games.mjs [path-to-csv]
//   defaults to source/steam-library-JudgeZetsumei-1.csv
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const csvPath = path.resolve(process.argv[2] ?? path.join(repoRoot, 'source', 'steam-library-JudgeZetsumei-1.csv'));
const outPath = path.join(repoRoot, 'src', 'data', 'games.json');

const csv = readFileSync(csvPath, 'utf8');

// The CSV has ~400 boolean "x"/"" feature+tag columns, and several of the
// header names are DUPLICATED (Steam API "categories" columns ~12-92 and
// Steam store "tags" columns ~93-472 both have e.g. "co-op", "online co-op",
// "pvp", "early access"). csv-parse's `columns: true` collapses duplicate
// headers to the LAST occurrence, silently losing the earlier column. So we
// parse as raw arrays instead and resolve every column purely by position,
// using the header row only to build index maps (supporting multiple indexes
// per duplicate name).
const rows = parse(csv, { columns: false, bom: true });
const header = rows[0];
const dataRows = rows.slice(1);

/** @type {Map<string, number[]>} header name -> all column indexes with that name */
const colIndexes = new Map();
header.forEach((name, i) => {
  const arr = colIndexes.get(name) ?? [];
  arr.push(i);
  colIndexes.set(name, arr);
});
/** First index for a (non-duplicate, or "first occurrence wanted") column name. */
function col(name) {
  const idxs = colIndexes.get(name);
  if (!idxs) throw new Error(`Column not found in CSV: "${name}"`);
  return idxs[0];
}
/** All column indexes for a duplicated header name, e.g. col.all("co-op") -> [16, 164]. */
function colAll(name) {
  const idxs = colIndexes.get(name);
  if (!idxs) throw new Error(`Column not found in CSV: "${name}"`);
  return idxs;
}
function isX(row, idx) {
  return row[idx] === 'x';
}
function isXAny(row, idxs) {
  return idxs.some((i) => isX(row, i));
}

// --- Canonical 46-tag whitelist (order defines each tag's stable index; must
// match src/data/games.json's `tags` array, which extract-from-html.mjs
// produced from the HTML DATA blob). Every name below is an exact CSV column
// header (confirmed by inspection - single occurrence each, no duplicates
// among these 46). ---
const TAG_NAMES = [
  'action', 'adventure', 'rpg', 'strategy', 'simulation', 'racing', 'sports',
  'shooter', 'fps', 'puzzle', 'platformer', 'horror', 'survival', 'open world',
  'roguelite', 'city builder', 'sandbox', 'indie', 'casual', 'fighting',
  'stealth', 'story rich', 'atmospheric', 'sci-fi', 'fantasy',
  'post-apocalyptic', 'zombies', 'space', 'building', 'crafting',
  'management', 'rts', 'hack and slash', 'pixel graphics', 'vr', 'driving',
  'arcade', 'exploration', 'tactical', 'military', 'war', 'funny', 'relaxing',
  'difficult', 'physics', 'moddable',
];
// Each tag maps 1:1 to its identically-named CSV column, EXCEPT "roguelite":
// the ground-truth data treats it as the union of the CSV's "roguelite" tag
// column AND its separate "roguelike" tag column (2 games in the library are
// marked "roguelike" but not "roguelite" in the CSV export, yet are tagged
// roguelite in ground truth) - verified empirically, 0 residual mismatches.
const TAG_COL_OVERRIDES = { roguelite: ['roguelite', 'roguelike'] };
const TAG_COL_INDEXES = TAG_NAMES.map((name) =>
  (TAG_COL_OVERRIDES[name] ?? [name]).map((n) => col(n)),
);

// --- Feature bitmask (must match src/lib/types.ts `Feature`). ---
const Feature = {
  Coop: 1, OnlineCoop: 2, LocalCoop: 4, Multiplayer: 8, SinglePlayer: 16,
  FullController: 32, PartialController: 64, VR: 128, PvP: 256,
  Achievements: 512, OpenWorld: 1024, EarlyAccess: 2048,
};

// Column choice per bit, verified empirically by diffing against the
// HTML-extracted ground-truth games.json. For most
// bits a single Steam-API "category" column matches exactly; the categories
// group (cols ~12-92) turned out to be the reliable source over the
// store-tags group (cols ~93-472), which has more false positives/negatives.
// Zero residual mismatches across all 637 games / 12 bits.
const FEATURE_COLS = {
  // "co-op any" (category) - exact match. Plain "co-op" (both occurrences)
  // under- or over-counts vs ground truth.
  Coop: [col('co-op any')],
  // "online co-op" (category, first occurrence at ~idx 37). The store-tag
  // duplicate ("online co-op" second occurrence) has both false positives
  // and false negatives vs ground truth.
  OnlineCoop: [colAll('online co-op')[0]],
  // No single column matches. Ground truth = "local co-op" (tag) OR
  // "shared/split screen co-op" (category) OR "shared/split screen"
  // (category, the umbrella column without "co-op"/"pvp" suffix).
  LocalCoop: [col('local co-op'), col('shared/split screen co-op'), col('shared/split screen')],
  // "multiplayer any" (category) - exact match.
  Multiplayer: [col('multiplayer any')],
  // "single-player" (category) - exact match. The tag "singleplayer" (no
  // hyphen) both over- and under-counts.
  SinglePlayer: [col('single-player')],
  FullController: [col('full controller support')],
  PartialController: [col('partial controller support')],
  // "vr any" (category) - exact match.
  VR: [col('vr any')],
  // Ground truth = "online pvp" (category) OR "pvp" (category, first
  // occurrence). Neither the store-tag "pvp" nor "lan pvp"/"shared/split
  // screen pvp" are needed once these two are combined.
  PvP: [col('online pvp'), colAll('pvp')[0]],
  Achievements: [col('steam achievements')],
  // "open world" (tag) - exact match. "open world survival craft" is a
  // narrower sub-genre tag, not used.
  OpenWorld: [col('open world')],
  // "early access" (category, first occurrence). The tag duplicate has
  // false positives vs ground truth.
  EarlyAccess: [colAll('early access')[0]],
};

/**
 * Round hours to 1 decimal place matching the ground-truth data's precision.
 * The CSV's `hours` values are raw floats (playtime minutes / 60), most with
 * long non-terminating decimals (e.g. 5.366666666666666) that round
 * unambiguously. A handful land exactly on a 1-decimal tie (e.g. 5.75, 4.55
 * as printed - though 4.55 is *not* exactly representable in binary
 * floating point and is actually ~4.549999999999998, so it isn't a true
 * tie). For true exact ties (values that are exact multiples of 0.25, e.g.
 * 5.75, 61.25) the ground truth resolves via round-half-to-even (banker's
 * rounding), not JS's default round-half-up. `Number.prototype.toFixed`
 * already does the numerically-correct thing for the non-tie cases (it
 * doesn't naively multiply by 10 first), so it's used as the base, with an
 * explicit round-half-to-even override for exact quarter-hour ties.
 */
function roundHours(hours) {
  const quarters = hours * 4;
  const nearestQuarter = Math.round(quarters);
  const isExactTie = Math.abs(quarters - nearestQuarter) < 1e-9;
  if (isExactTie) {
    const tenths = nearestQuarter * 2.5; // exact math: quarters/4*10
    if (Number.isInteger(tenths)) return tenths / 10; // not actually a 1dp tie
    const lo = Math.floor(tenths);
    const hi = Math.ceil(tenths);
    return (lo % 2 === 0 ? lo : hi) / 10;
  }
  return Number(hours.toFixed(1));
}

const nameIdx = col('game');
const idIdx = col('id');
const hoursIdx = col('hours');
const metascoreIdx = col('metascore');
const userscoreIdx = col('userscore');
const releaseDateIdx = col('release_date');
const steamDeckIdx = col('steam_deck');

const games = dataRows.map((row) => {
  const name = row[nameIdx];
  const appId = Number(row[idIdx]);
  const hours = roundHours(Number(row[hoursIdx]));
  const metascoreRaw = row[metascoreIdx];
  const metascore = metascoreRaw === '' ? null : Number(metascoreRaw);
  const userscoreRaw = row[userscoreIdx];
  const userScore = userscoreRaw === '' ? null : Number(userscoreRaw);
  const releaseDate = row[releaseDateIdx];
  const year = releaseDate === '' ? null : Number(releaseDate.slice(0, 4));
  const deckRaw = row[steamDeckIdx];
  const deck = deckRaw === 'verified' ? 2 : deckRaw === 'playable' ? 1 : 0;

  let features = 0;
  for (const [flagName, idxs] of Object.entries(FEATURE_COLS)) {
    if (isXAny(row, idxs)) features |= Feature[flagName];
  }

  const tagIndexes = [];
  TAG_COL_INDEXES.forEach((idxs, tagIdx) => {
    if (isXAny(row, idxs)) tagIndexes.push(tagIdx);
  });

  return { name, appId, hours, metascore, userScore, year, deck, features, tagIndexes };
});

// --- Assertions (mirror extract-from-html.mjs's invariants). ---
if (games.length !== 637) {
  throw new Error(`Expected exactly 637 games, got ${games.length}`);
}
for (const g of games) {
  for (const t of g.tagIndexes) {
    if (t < 0 || t >= TAG_NAMES.length) {
      throw new Error(`Game "${g.name}" has out-of-range tag index ${t}`);
    }
  }
  if (![0, 1, 2].includes(g.deck)) {
    throw new Error(`Game "${g.name}" has invalid deck status ${g.deck}`);
  }
}

const library = { tags: TAG_NAMES, games };

writeFileSync(outPath, JSON.stringify(library, null, 2) + '\n', 'utf8');

console.log(`Wrote ${outPath}`);
console.log(`  games: ${games.length}`);
console.log(`  tags:  ${TAG_NAMES.length}`);
