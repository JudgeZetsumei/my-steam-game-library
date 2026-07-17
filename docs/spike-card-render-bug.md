# Spike: intermittent game cards failing to render

**Symptom.** Cards sometimes invisible — on first load, on selecting a filter, and on scrolling. Intermittent; only some cards affected.

**Verdict.** Cards *do* render — they're in the DOM but stuck at `opacity: 0` (or partial). Root cause is the entrance-animation effect in `GameGrid.tsx` killing an in-flight GSAP tween and never recovering.

## Mechanism

The relevant pieces:

1. `globals.css:84–85` — `.card { opacity: 0 }`, `.card.in { opacity: 1 }`. Cards are invisible by default until upgraded.
2. `GameGrid.tsx:49–78` — an effect selects `.card:not(.in)`, runs `gsap.fromTo(fresh, { opacity: 0, y: 26 }, { opacity: 1, ... stagger: 0.022 })`, adds `.in` to **all** fresh cards in `onStart`, and its cleanup calls `tween.kill()`.

The failure sequence:

- `fromTo` has `immediateRender: true` by default, so **every** fresh card gets inline `opacity: 0` the moment the tween is created — including cards whose staggered slot hasn't started yet (48 cards × 0.022s stagger + 0.5s duration ≈ 1.5s total).
- `onStart` fires on the first tick and adds `.in` to all 48 cards at once.
- If the effect re-runs before the tween finishes, cleanup runs `tween.kill()`. Kill does not complete or revert — it abandons whatever inline styles exist at that instant.
- Result: cards already past their stagger slot are stuck at partial inline opacity; cards not yet reached are stuck at inline `opacity: 0` — fully invisible. All of them now have `.in`, so the `.card:not(.in)` selector **never picks them up again**. Inline opacity beats `.card.in { opacity: 1 }`. Permanent.

`clearProps: 'transform'` only clears transform, only on completion — it never rescues opacity, and never runs on a killed tween.

## Why each reported trigger fires the effect mid-flight

The effect's deps are `[games, visibleCount, reduceMotion]`:

- **Scrolling.** The IntersectionObserver sentinel (`rootMargin: '900px'`) bumps `visibleCount` by 48. Scrolling fast enough that the sentinel re-enters range within ~1.5s of the previous chunk kills that chunk's tween mid-flight. The next chunk animates fine — which is why only *some* cards are affected.
- **First load.** Before lazy images load, 48 collapsed-ish cards + a 900px rootMargin can put the sentinel in range immediately, so `visibleCount` jumps 48→96 milliseconds after mount, killing the first chunk's tween almost at t=0 — most of the first screen stuck near `opacity: 0`. Whether the sentinel is in range depends on viewport height / image load timing → intermittent.
- **Selecting a filter.** `games` gets a new identity, killing any in-flight tween. Cards whose `appId` survives the filter are *reused* by React (`key={g.appId}`), keeping their `.in` class and stuck inline opacity. Newly-mounted cards animate normally — again, only a subset affected. Typing in search (each 160ms debounce flush) and changing sort hit the same path.

StrictMode's dev double-invoke is benign here (kill happens before `onStart`, so `.in` is never added and the second run re-selects), which is why this survived dev testing — the bug needs a *mid-flight* kill, not an instant one.

## Ruled out

- Duplicate React keys: `games.json` has 637 games, 0 duplicate `appId`s.
- `SteamArt` image errors: `onError` swaps to a monogram placeholder — the card body would still show.
- Data/filter logic (`filters.ts`): pure and deterministic; can't produce intermittence.

## Verification (for whoever picks this up)

- Repro deterministically: load, immediately click a filter chip within ~1s; or throttle CPU and scroll fast. Inspect an invisible card — expect `class="card in"` with inline `opacity` < 1.
- One-liner check in console: `document.querySelectorAll('.card.in').forEach(c => +c.style.opacity < 1 && console.log(c))`.

## Fix directions (not implemented — spike only)

- In cleanup, don't bare-`kill()`: either `tween.progress(1).kill()` (snap survivors to end state) or kill then clear inline opacity (`gsap.set(fresh, { clearProps: 'opacity,transform' })`) — the `.in` class then carries visibility via CSS.
- Alternatively add `opacity` to `clearProps` and treat `.in` + CSS as the single source of truth for the resting state, so a killed tween can never leave a card invisible.
- Consider not depending the animation effect on `visibleCount` alone but tracking which cards were actually animated, so a chunk bump doesn't kill the previous chunk's tween.
