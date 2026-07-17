# Implementation Plan: Hybrid Game Art (Steam CDN + SteamGridDB)

## Background

Card art is constructed client-side as
`https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg`
(`src/lib/steam.ts#headerImageUrl`). Steam no longer populates this legacy path
for newer releases — their assets live only at hashed, non-constructable
`shared.akamai.steamstatic.com/store_item_assets/...` URLs.

Spike findings (2026-07-17), verified by loading all 637 legacy URLs in-browser:

- **13 games fail.** 7 are recent titles with new-style hashed assets only
  (Forza Horizon 6, PEAK, RV There Yet?, S.T.A.L.K.E.R. SoC Enhanced,
  Where Winds Meet, Screamer Demo, WheelMates Demo). 6 are delisted/test apps
  with no store assets at all (`appdetails` returns `success:false`); the
  monogram fallback is the correct end state for those.
- No hash-less URL variant works on either new CDN host — a runtime URL-pattern
  fallback is a dead end.
- Steam's hashed URLs rotate when publishers update art (observed for FH6
  within one day), so baked-in Steam `store_item_assets` URLs would rot.
  SteamGridDB URLs are stable.

## Approach

Keep Steam legacy CDN as the primary art source (consistent official style,
works for 624/637 games). Resolve art via the SteamGridDB API only where the
legacy URL fails, and bake the result into `games.json` as an optional
`artUrl` override at data-generation time.

**Forward compatibility** with the future per-SteamID dynamic library is a
design constraint throughout:

1. The SGDB resolver is a standalone shared module — not inline in the CSV
   script — so a future `getLibrary()` backed by `IPlayerService/GetOwnedGames`
   can call the same function at request time.
2. Art resolution is cached/keyed by `appId`, never by user — the mapping is
   identical for every user, so the hardcoded library pre-warms a cache that a
   future dynamic version shares.
3. Build-time failure detection is treated as an optimization, not the
   mechanism. The long-term mechanism is lazy: `SteamArt`'s `onError` already
   detects failures in the right place; it later escalates to an API route
   (Phase 2) instead of straight to the monogram.

## Phase 1 — Hybrid enrichment (now)

### 1. Type change — `src/lib/types.ts`

Add `artUrl?: string` to `Game`. Optional and absent for the 624 games where
the legacy URL works, keeping `games.json` size flat.

### 2. Art resolver — `src/lib/art-resolver.ts` (new)

Pure async module, no React, mirroring the `filters.ts` convention of logic
decoupled from components. Exports roughly:

- `legacyHeaderUrlWorks(appId): Promise<boolean>` — HEAD request against the
  legacy CDN URL.
- `resolveSgdbHeaderUrl(appId, apiKey): Promise<string | null>` —
  `GET https://www.steamgriddb.com/api/v2/grids/steam/{appId}?dimensions=460x215`
  with `Authorization: Bearer {apiKey}`; returns the first result's `url`, or
  `null` when SGDB has nothing (expected for some delisted/test apps →
  monogram remains the fallback).

Notes:
- 460x215 matches the current header aspect ratio — no `GameCard`/CSS changes.
- Must be importable from both a Node script and Next server code: plain
  `fetch`, no Node-only APIs.
- Throttle to ~1 req/sec against SGDB; only failing appIds are queried
  (13 today), so runtime is trivial.

### 3. Pipeline integration — `scripts/csv-to-games.mjs`

After building the games array: for each game, check the legacy URL
(HEAD, batched with modest concurrency); for failures, resolve via SGDB and
set `artUrl`. Re-runs on every `npm run data:csv`, which also refreshes any
rotted URLs.

- API key from `SGDB_API_KEY` env var (`.env.local`, gitignored — verify it is,
  and never committed). If unset, warn and skip enrichment rather than fail,
  so the pipeline still works without a key.
- Preserve the existing validation practice: diff output against committed
  `games.json`; the expected diff is exactly the ~7 `artUrl` additions.

### 4. Component change — `src/components/SteamArt.tsx`

Accept optional `artUrl` prop; `src={artUrl ?? headerImageUrl(appId)}`.
Existing `onError` → monogram unchanged. Keep plain `<img>` (per repo
convention; SGDB also serves exact-size images). `GameCard` passes
`game.artUrl` through. No other component changes; React Compiler handles
memoization — no manual memo.

### 5. Verification

- `npm run data:csv` and diff `games.json`: only `artUrl` additions on the
  7 class-A games.
- Load the app; confirm the 7 render SGDB art, the 6 class-B apps render
  monograms, and spot-check that untouched cards still hit the legacy CDN.
- `npm run lint` and `npx tsc --noEmit`.

## Phase 2 — Lazy runtime resolution (with the SteamID feature, later)

Not built now; Phase 1 is designed so nothing below requires undoing it.

- `getLibrary()` swaps to `IPlayerService/GetOwnedGames` (the designated seam;
  it returns no header art and no dead-CDN signal, so the Phase 1 resolver is
  reused as-is).
- New route handler `app/api/art/[appId]/route.ts`: calls
  `resolveSgdbHeaderUrl`, caches by `appId` (global, user-independent —
  Vercel KV or equivalent), returns the URL or 404.
- `SteamArt` `onError` escalation: legacy URL fails → fetch `/api/art/{appId}`
  → SGDB URL or monogram. The Phase 1 `artUrl` prop becomes a pre-warmed
  fast path rather than the sole mechanism.
- SGDB key moves to a Vercel env var; it is only ever read server-side in both
  phases.

## Risks / open questions

- **SGDB art style variance.** Community art may not match official headers.
  Affected set is small (7); if a pick looks off, curate by choosing a
  different SGDB result ID. Consider `?styles=official` filter as a first pass.
- **SGDB coverage gaps.** Unverified until we run with the API key. `null`
  results fall through to the monogram — same as today, no regression.
- **Rate limits.** SGDB limits are undocumented; enrichment volume is tiny,
  but Phase 2's route handler must cache before it can be exposed to traffic.
