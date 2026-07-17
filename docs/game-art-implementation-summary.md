# Hybrid game art — implementation summary (Phase 1, done 2026-07-17)

Context for planning the per-SteamID dynamic library feature ("Phase 2").

Background: card art was previously constructed client-side from the legacy
Steam CDN URL pattern alone. Steam no longer populates that path for newer
releases, so those cards fell through to the monogram placeholder. A spike
(2026-07-17) verified all 637 legacy URLs in-browser: 13 failed — 7 recent
titles whose assets exist only at hashed new-style URLs, and 6 delisted/test
apps with no store assets at all. No constructable URL variant works on the
new CDN hosts, so a runtime URL-pattern fallback was a dead end; SteamGridDB
was chosen as the fallback source instead.

## What was built

Card art now resolves in two tiers, decided at data-generation time:

1. **Legacy Steam CDN** (`cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg`)
   remains the default — no per-game data stored. Works for 624/637 games.
2. **SteamGridDB override** — `Game.artUrl?: string` (new optional field in
   `src/lib/types.ts`), baked into `src/data/games.json` only for games whose
   legacy URL is dead. Currently 11 games carry an override; 2 (Screamer Demo,
   WheelMates Demo) have no SGDB art either and correctly fall through to
   `SteamArt`'s monogram placeholder.

Why not Steam's own new asset URLs: they are hashed and non-constructable
(`shared.akamai.steamstatic.com/store_item_assets/...`) and rotate when
publishers update art (observed within a day). SGDB URLs are stable.

### Files

- `src/lib/art-resolver.ts` — **the shared module Phase 2 should reuse.**
  Pure async, no React, no Node-only APIs, plain `fetch`, erasable-TS syntax
  only (Node scripts import it directly via native type stripping, so it must
  stay enum/namespace-free and can't use `@/` aliases or extensionless
  relative imports). Exports:
  - `legacyHeaderUrlWorks(appId)` — HEAD against the legacy CDN.
  - `resolveSgdbHeaderUrl(appId, apiKey)` — SGDB grids lookup; tries
    `dimensions=460x215` then `920x430` (same 2.14:1 aspect at 2x — the
    fallback recovered 3 titles incl. Where Winds Meet that have no 460x215
    entry); prefers `style === 'official'` among results; returns `null` when
    SGDB has nothing (→ monogram).
  - `enrichGamesWithArt(games, apiKey, opts)` — orchestration: HEAD-checks all
    games (concurrency 8), clears stale `artUrl` where the legacy URL
    recovered, resolves failures via SGDB throttled ~1 req/sec. Contains a
    sanity guard: aborts if > max(25, 5%) of checks fail, because a network
    outage is indistinguishable from dead URLs per-request and would otherwise
    bake in hundreds of spurious overrides.
- `scripts/csv-to-games.mjs` — runs `enrichGamesWithArt` after building the
  games array. If `SGDB_API_KEY` is unset it warns, skips enrichment, and
  carries over existing `artUrl` values from the committed `games.json`
  (keyless runs are non-destructive).
- `scripts/enrich-art.mjs` (`npm run data:art`) — same enrichment run against
  the committed `games.json` in place, no CSV needed. Used for the initial
  bake (the CSV export wasn't present) and for refreshing rotted URLs.
- `src/components/SteamArt.tsx` — new optional `artUrl` prop;
  `src={artUrl ?? headerImageUrl(appId)}`; `onError` → monogram unchanged.
  `GameCard` passes `game.artUrl` through. Still a plain `<img>` per repo
  convention.

### Key / environment

`SGDB_API_KEY` lives in `.env.local` (repo root, gitignored via `.env*`). It
is only ever read by Node-side code — never shipped to the client. Node
>= 22.18 required for the scripts (native TS type stripping). The
`MODULE_TYPELESS_PACKAGE_JSON` warning on script runs is cosmetic; fixing it
would mean `"type": "module"` repo-wide, deliberately not done.

## Constraints honored for Phase 2 (do not undo)

- **Resolution is keyed by `appId` only, never by user.** The mapping is
  identical for every user, so any cache is global and the static library's
  baked overrides pre-warm it.
- **`getLibrary()` (`src/lib/data.ts`) is still the only data seam.**
  `IPlayerService/GetOwnedGames` returns no header art and no dead-CDN signal,
  so Phase 2 reuses `art-resolver.ts` as-is at request time.
- **Baked `artUrl` is an optimization, not the mechanism.** The long-term
  mechanism is lazy: `SteamArt.onError` already detects dead art in the right
  place. Phase 2 escalates it — legacy URL fails → fetch a new
  `app/api/art/[appId]/route.ts` (calls `resolveSgdbHeaderUrl`, caches by
  appId in something like Vercel KV, returns URL or 404) → SGDB URL or
  monogram. The SGDB key then also becomes a Vercel env var, still
  server-only.
- **Rate limits:** SGDB limits are undocumented; the route handler must cache
  before being exposed to traffic. Enrichment volume at build time is tiny
  (13 lookups today).

## Verification state

`npm run data:art` is idempotent (re-runs re-resolve the same 11, refresh
rotted URLs). Diff after the final run: exactly 11 `artUrl` additions, all on
`cdn2.steamgriddb.com`, nothing else changed. `npm run lint` and
`npx tsc --noEmit` clean. Visually confirmed in the app: SGDB art renders,
the 2 demo apps show monograms, untouched cards still hit the legacy CDN.
