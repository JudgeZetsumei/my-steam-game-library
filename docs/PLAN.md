# Refactor Game Vault (single-file HTML) into the Next.js 16 boilerplate

## Context

`source/game-vault.html` is a self-contained app (494 lines; a 72KB `const DATA` blob on line 250) rendering a searchable, filterable, sortable library of 637 Steam games with a GSAP slot-machine randomiser and a dark neon theme. The repo already contains an unmodified create-next-app boilerplate (Next.js 16.2.10, React 19.2.4, TS strict, Tailwind v4, `reactCompiler: true`, Turbopack default). Goal: port the app into Next.js with feature/visual parity, structured so a future Steam API data source can slot in.

**User decisions (fixed):**
- **Data**: extract the DATA blob from the HTML into a typed repo artifact now, **and** provide a CSV→data conversion script as the refresh path. The CSV exists at `source/steam-library-JudgeZetsumei-1.csv` (368KB, 637 rows, untracked; header: `game,id,hours,last_played,steam_deck,metascore,userscore,…` + ~400 boolean "x" feature/tag columns).
- **Styling**: port the existing custom CSS as-is (no Tailwind rebuild) — pixel-identical.
- **Animations**: add `gsap` as an npm dependency, port 1:1.

**AGENTS.md mandate**: read relevant guides in `node_modules/next/dist/docs/01-app/` before writing code. Key Next 16 facts already confirmed: Turbopack default, no `next lint` (use `eslint`), Tailwind v4 via `@import "tailwindcss"` in globals.css, Server Components default with `"use client"` for interactivity, root layout must render `<html>`/`<body>`, `fetch` not cached by default, image defaults changed (`qualities: [75]`, `minimumCacheTTL` 4h).

## Data architecture

**Expand compact keys at extraction time** (`n→name`, `i→appId`, `h→hours`, `m→metascore`, `u→userScore`, `y→year`, `d→deck`, `f→features`, `t→tagIndexes`). Keep the feature **bitmask** and tag **index array** as-is (semantic encodings decoded via named const maps; expanding them balloons the file and changes filter logic).

**Data lives at `src/data/games.json`** (`{ tags: string[], games: Game[] }`), imported **only** through `src/lib/data.ts`:
- Not `public/` — would need a runtime fetch (uncached by default in Next 16) for static local data.
- Not a `.ts` literal — 72KB of source TS must typecheck; JSON is regenerable by scripts. `tsconfig.json` already has `resolveJsonModule: true`; cast once in `data.ts`.

**The Steam API seam**: `src/app/page.tsx` (Server Component) does `const library = await getLibrary()` and passes it as a prop to the `"use client"` `GameLibrary`. Today `getLibrary()` returns the imported JSON; later it becomes a server-side Steam Web API fetch (API key stays in env) without touching any component.

### Types — `src/lib/types.ts`

```ts
export const Feature = {
  Coop: 1, OnlineCoop: 2, LocalCoop: 4, Multiplayer: 8, SinglePlayer: 16,
  FullController: 32, PartialController: 64, VR: 128, PvP: 256,
  Achievements: 512, OpenWorld: 1024, EarlyAccess: 2048,
} as const;
export const DeckStatus = { Unsupported: 0, Playable: 1, Verified: 2 } as const;
export type DeckStatus = (typeof DeckStatus)[keyof typeof DeckStatus];

export interface Game {
  name: string; appId: number; hours: number;
  metascore: number | null; userScore: number | null; year: number | null;
  deck: DeckStatus; features: number; tagIndexes: number[];
}
export interface Library { tags: string[]; games: Game[]; }
export type SortKey = 'name' | 'hours' | 'user' | 'meta' | 'year' | 'unplayed';
export interface FilterState { query: string; chips: string[]; tags: number[]; deck: -1 | 0 | 1 | 2; minScore: number; sort: SortKey; }
```

## File structure

```
scripts/
  extract-from-html.mjs      # one-off: HTML DATA blob -> src/data/games.json
  csv-to-games.mjs           # refresh path: CSV -> src/data/games.json
src/
  data/games.json            # expanded-key data, generated
  lib/
    types.ts                 # Game, Library, Feature, DeckStatus, SortKey, FilterState
    data.ts                  # getLibrary(): Promise<Library>  <-- future Steam API seam
    filters.ts               # CHIPS defs, filterGames(), sortGames(), tagCounts() (pure)
    steam.ts                 # headerImageUrl(appId), steamRunUrl(appId), initials(name)
  hooks/
    useDebouncedValue.ts     # 160ms debounce
    useReducedMotion.ts      # matchMedia via useSyncExternalStore (SSR-safe, server snapshot false)
  components/                # all client; "use client" at GameLibrary covers imports
    GameLibrary.tsx          # owns filter reducer + overlay open state
    HeroStats.tsx            # GSAP count-up stat tiles
    FilterBar.tsx            # search input, sort select, roll button, chips, drawer toggle
    FilterDrawer.tsx         # tag cloud + deck select + min-score slider
    TagCloud.tsx             # 46 tag pills with live counts (freq desc)
    GameGrid.tsx             # chunked grid + IntersectionObserver sentinel + stagger-in
    GameCard.tsx             # card: art, deck badge, feature badges, hours/score/year
    SteamArt.tsx             # <img> + onError monogram fallback (shared by card/reel/winner)
    RandomiserOverlay.tsx    # slot-machine reel, winner panel, confetti canvas
  app/
    layout.tsx               # next/font fonts, metadata
    page.tsx                 # Server Component: aurora/grain shell + await getLibrary() -> <GameLibrary/>
    globals.css              # ported theme CSS (Tailwind import removed)
```

## Implementation steps (each leaves the app runnable)

1. **Docs pass** (AGENTS.md mandate) — read under `node_modules/next/dist/docs/01-app/`: `01-getting-started/05-server-and-client-components.md`, `13-fonts.md`, `12-images.md`, `11-css.md`, `02-project-structure.md`, `14-metadata-and-og-images.md`.
2. **Deps**: `npm install gsap`; `npm install -D csv-parse`.
3. **Data layer**: write + run `scripts/extract-from-html.mjs` — regex the `const DATA = ({...})` line out of `source/game-vault.html:250`, `JSON.parse`, map to expanded keys, assert invariants (637 games, 46 tags, tag indexes in range, `deck ∈ {0,1,2}`), write pretty-printed `src/data/games.json`. Add `types.ts`, `data.ts`, `filters.ts` (direct transcription of the HTML's `filtered()` logic incl. nullish sort fallbacks `u??-1`, `y??0`, AND tag logic), `steam.ts`. Check `npx tsc --noEmit`.
4. **Theme shell**: replace `globals.css` with the ported sheet from `source/game-vault.html` `<style>` block (lines ~10–157) — **remove `@import "tailwindcss"`** (its preflight fights the app's own reset; keep Tailwind devDeps/postcss config untouched for now). Update `layout.tsx`: `next/font/google` — `Chakra_Petch`, `Manrope`, `JetBrains_Mono` as CSS variables on `<html>`, point the theme's font tokens at them; set real `metadata`. Rewrite `page.tsx` to the server shell (aurora/grain divs, `<main>`, static hero) — boilerplate welcome content removed here.
5. **Core library**: `GameLibrary` (useReducer: `SET_QUERY`, `TOGGLE_CHIP`, `TOGGLE_TAG`, `SET_DECK`, `SET_MIN_SCORE`, `SET_SORT`, `CLEAR_ALL` — arrays not Sets for referential equality with the React Compiler) + `FilterBar` (search + sort only) + `GameGrid`/`GameCard`/`SteamArt`. Infinite scroll: `visibleCount` state starting at 48, `IntersectionObserver` (`rootMargin: '900px'`) on a sentinel ref, +48 per hit, disconnect on cleanup, reset to 48 when the filtered list changes. Debounce: raw input state feeds `useDebouncedValue(raw, 160)` → dispatch; `CLEAR_ALL` must also reset the raw input.
6. **Full filtering**: chips row (10 chips w/ bitmask/field tests from `CHIPS`), drawer with `TagCloud` (live counts, freq desc), deck select, min-score slider, clear-all visibility, result meta line, empty state.
7. **Animations** (GSAP from npm, all in effects with refs; cleanup kills tweens — React 19 StrictMode double-runs effects): `HeroStats` count-up writes `textContent` via refs; grid stagger `fromTo` (y:26, stagger .022, `clearProps:'transform'`) on newly mounted cards; `useReducedMotion()` short-circuits to final state everywhere. CSS `prefers-reduced-motion` block ports as-is.
8. **Randomiser**: `RandomiserOverlay` as a conditionally-rendered `position:fixed` div (no portal needed — original was a fixed div under body; conditional render gives free tween/canvas cleanup). Props: `pool` (filtered list), `onClose`. Phases `'rolling' | 'winner'`; 42-tile reel (target at length−4), tile width measured via refs, `power4.out` x-tween with blur/onUpdate/onComplete verbatim; confetti on canvas ref via rAF (cancelled in cleanup); Escape/backdrop close blocked while rolling; "Open in Steam" = plain `<a href={steamRunUrl(appId)}>`. Reduced motion → instant winner, no confetti.
9. **CSV refresh path**: `scripts/csv-to-games.mjs` (input path argv, default `source/steam-library-JudgeZetsumei-1.csv`; use `csv-parse` — names contain commas). Mapping: `game→name`, `id→appId`, `hours→round(1dp)`, `metascore`/`userscore→number|null`, `release_date→year|null`, `steam_deck` `verified→2`/`playable→1`/else→0; features from "x" columns per the `Feature` map; tags via the canonical 46-tag whitelist hardcoded in the script (indexes stay stable). **Validate by diffing output against the extracted `games.json` until identical** — this pins down the ambiguous column mappings (LocalCoop/Multiplayer/VR sources). Add npm script `"data:csv": "node scripts/csv-to-games.mjs"`. Document in README.
10. **Cleanup**: delete unused boilerplate `public/*.svg`; disable `@next/next/no-img-element` in `eslint.config.mjs` with a comment (plain `<img>` is deliberate — Steam CDN serves exact-size 460×215 headers; `next/image` would re-compress at quality 75 for zero gain); commit `source/game-vault.html` for provenance, gitignore the CSV; optionally drop Tailwind deps + `postcss.config.mjs`.

## Key decisions & gotchas

- **Images: plain `<img loading="lazy">`** in `SteamArt` with React `onError` → monogram fallback. No `next.config.ts` `remotePatterns` needed.
- **Server/client split**: `layout.tsx` + `page.tsx` stay Server Components; single `"use client"` boundary at `GameLibrary.tsx`. Data crosses once via the RSC payload (same net transfer as the original inline blob).
- **React Compiler is on**: write plain hooks, don't hand-memoize; imperative GSAP via refs in effects is fine.
- Next 16: no `next lint` (script is `eslint`); Turbopack default; dev output in `.next/dev`.

## Verification

- `npm run dev` with `source/game-vault.html` open side-by-side, checklist: hero count-ups (637 / total hours / co-op count); debounced search; all 6 sorts; each of the 10 chips; multi-tag AND filtering with live counts; deck select; min-score slider; clear-all resets everything incl. search box; empty state; infinite scroll past 48; broken image → monogram (test with bogus appId temporarily); randomiser roll → blur ramp → lock-in → confetti → winner stats → `steam://run` link → reroll; Escape/backdrop close blocked mid-roll; OS reduced-motion skips animations.
- `npm run build` clean (page prerenders static); `npm run lint` and `npx tsc --noEmit` clean.
- `node scripts/csv-to-games.mjs` output diff vs committed `games.json` is empty.

## Future Steam API (note only)

`src/lib/data.ts#getLibrary()` is the single plug point — later swap the JSON import for a server-side fetch of `IPlayerService/GetOwnedGames` + enrichment, choosing caching explicitly (Next 16 doesn't cache `fetch` by default; `revalidate`/`"use cache"` decided then). Types and components stay source-agnostic.
