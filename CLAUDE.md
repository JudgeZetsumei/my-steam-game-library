# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the dev server (Turbopack; dev build output goes to `.next/dev`)
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — ESLint (Next 16 has no `next lint` subcommand; this runs `eslint` directly)
- `npx tsc --noEmit` — typecheck
- `npm run data:csv [path-to-csv]` — regenerate `src/data/games.json` from a Steam library CSV export; defaults to `source/steam-library-JudgeZetsumei-1.csv` (untracked, gitignored)

There is no test suite. Deployment is on Vercel, built from `main`.

## Architecture

This is a single-page Steam library browser (search/filter/sort/randomise) ported from a
former single-file HTML prototype.

**Data seam.** `src/lib/data.ts#getLibrary()` is the *only* place `src/data/games.json` is
imported. Every component receives library data as a prop from `src/app/page.tsx` (a Server
Component) — never import the JSON directly elsewhere. `getLibrary()` currently just returns
the static JSON, but it's the designated plug point for a future server-side Steam Web API
fetch (`IPlayerService/GetOwnedGames` + enrichment); the swap should not require touching any
component or type.

`src/data/games.json` is generated, not hand-edited. Two regeneration paths exist:
`scripts/extract-from-html.mjs` (one-off, pulled the original DATA blob out of the legacy HTML
prototype) and `scripts/csv-to-games.mjs` (the ongoing refresh path, run via `npm run
data:csv`). The CSV script resolves columns by *position*, not name — the source CSV has ~400
boolean feature/tag columns and several duplicate header names (Steam "categories" vs Steam
store "tags" both have e.g. "co-op", "pvp"), so `columns: true`-style parsing would silently
collapse them. When editing that script, validate by diffing its output against the committed
`games.json`.

**Compact game encoding** (`src/lib/types.ts`): `Game.features` is a bitmask against the
`Feature` const map (bitwise `&` checks throughout, see `src/lib/filters.ts`'s `CHIPS`), and
`Game.tagIndexes` is an array of integer indexes into `Library.tags`, not tag strings. Index
order must stay stable across `games.json` and the CSV script's hardcoded 46-tag whitelist —
don't reorder the `tags` array or the whitelist independently of each other.

**Server/client split.** `layout.tsx` and `page.tsx` are Server Components; there is a single
`"use client"` boundary at `GameLibrary.tsx`, and everything it imports (FilterBar,
FilterDrawer, GameGrid, GameCard, TagCloud, RandomiserOverlay, SteamArt) is a client component
by extension. Filter/sort state lives in a `useReducer` in `GameLibrary.tsx`; state arrays
(`chips`, `tags`) are used instead of `Set`s deliberately, for referential equality under the
React Compiler. Search input is local `useState`, debounced 160ms
(`useDebouncedValue`) before being dispatched into the reducer.

**Pure filter logic** lives in `src/lib/filters.ts` (`filterGames`, `sortGames`, `tagCounts`,
and the `CHIPS` quick-filter definitions) decoupled from React, so it's easy to reason about or
test independently of components.

**Images.** `SteamArt.tsx` uses a plain `<img loading="lazy">` with an `onError` monogram
fallback rather than `next/image` — the Steam CDN already serves exact-size header images, so
`next/image`'s recompression buys nothing. `no-img-element` is disabled for this reason; keep
using plain `<img>` in that component rather than reaching for `next/image`.

**Animations** use GSAP directly via refs inside `useEffect` (no Framer Motion), with tween
cleanup on unmount — required because React 19 StrictMode double-invokes effects in dev.
`useReducedMotion()` (`useSyncExternalStore`, SSR-safe, defaults to `false` on the server)
short-circuits animations to their end state wherever they're used. `RandomiserOverlay` is a
conditionally-rendered `position: fixed` div (no portal) implementing a slot-machine reel plus
a canvas-based confetti effect driven by `requestAnimationFrame`.

**Styling** is hand-authored CSS in `src/app/globals.css`, ported 1:1 from the original
prototype's `<style>` block. Tailwind was removed entirely in cleanup — don't reintroduce
Tailwind classes or reach for a `postcss.config`/Tailwind import that no longer exists.

**React Compiler is on** (`reactCompiler: true` in `next.config.ts`) — write plain hooks and
let the compiler handle memoization; don't hand-roll `useMemo`/`useCallback` for referential
stability.
