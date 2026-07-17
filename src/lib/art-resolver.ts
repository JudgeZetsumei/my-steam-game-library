// Art resolution for game card images. Steam's legacy CDN header path is the
// primary source; SteamGridDB is the fallback for appIds where Steam no longer
// populates the legacy path (newer releases only get hashed, non-constructable
// `store_item_assets` URLs, which also rotate on art updates — so we bake in
// stable SGDB URLs instead).
//
// Shared between the data pipeline (scripts/csv-to-games.mjs imports this file
// directly via Node's native TypeScript type stripping, Node >= 22.18) and
// future Next server code (the Phase 2 /api/art route). Keep it free of React
// and Node-only APIs — plain `fetch` only — and keep the syntax erasable
// (no enums/namespaces) so Node can strip it.

/**
 * Legacy Steam CDN header URL. Keep in sync with src/lib/steam.ts#headerImageUrl.
 * (Duplicated because this module must be importable from Node scripts, where
 * the `@/` alias and extensionless relative imports don't resolve.)
 */
const legacyHeaderUrl = (appId: number): string =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

/** True when the legacy Steam CDN header image exists for this appId. */
export async function legacyHeaderUrlWorks(appId: number): Promise<boolean> {
  try {
    const res = await fetch(legacyHeaderUrl(appId), { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

interface SgdbGrid {
  url?: unknown;
  style?: unknown;
}
interface SgdbResponse {
  success?: boolean;
  data?: SgdbGrid[];
}

/**
 * Resolve a header-style grid for an appId via SteamGridDB.
 * Tries 460x215 (Steam's native header size) first, then 920x430 (the same
 * 2.14:1 aspect at 2x — many SGDB entries only exist at this size; the card
 * CSS scales it down). Returns the best result's URL, or null when SGDB has
 * nothing for this app (expected for some delisted/test apps — the monogram
 * remains the fallback). Prefers `official`-style art, to match Steam's own
 * headers.
 */
export async function resolveSgdbHeaderUrl(
  appId: number,
  apiKey: string,
): Promise<string | null> {
  for (const dimensions of ['460x215', '920x430']) {
    const res = await fetch(
      `https://www.steamgriddb.com/api/v2/grids/steam/${appId}?dimensions=${dimensions}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (res.status === 404) return null; // app unknown to SGDB
    if (!res.ok) {
      throw new Error(`SteamGridDB request failed for appId ${appId}: HTTP ${res.status}`);
    }
    const body = (await res.json()) as SgdbResponse;
    if (!body.success || !Array.isArray(body.data) || body.data.length === 0) continue;
    const pick = body.data.find((g) => g.style === 'official') ?? body.data[0];
    if (typeof pick.url === 'string') return pick.url;
  }
  return null;
}

export interface ArtEnrichmentResult {
  /** appIds whose legacy CDN URL failed the HEAD check. */
  failingAppIds: number[];
  /** Subset of failing appIds resolved to an SGDB URL (and written to artUrl). */
  resolved: { appId: number; url: string }[];
  /** Subset of failing appIds with no SGDB art — monogram fallback applies. */
  unresolved: number[];
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Enrich a games array in place: HEAD-check every game's legacy CDN URL
 * (with modest concurrency), then resolve failures via SGDB (throttled to
 * ~1 req/sec) and set `artUrl`. Also clears a stale `artUrl` on any game
 * whose legacy URL works again. Resolution is keyed purely by appId — the
 * result is user-independent, so it can back a shared cache later.
 */
export async function enrichGamesWithArt<T extends { appId: number; artUrl?: string }>(
  games: T[],
  apiKey: string,
  opts?: { concurrency?: number; throttleMs?: number; onProgress?: (msg: string) => void },
): Promise<ArtEnrichmentResult> {
  const concurrency = opts?.concurrency ?? 8;
  const throttleMs = opts?.throttleMs ?? 1000;
  const log = opts?.onProgress ?? (() => {});

  const failing: T[] = [];
  for (let i = 0; i < games.length; i += concurrency) {
    const batch = games.slice(i, i + concurrency);
    const oks = await Promise.all(batch.map((g) => legacyHeaderUrlWorks(g.appId)));
    oks.forEach((ok, j) => {
      const game = batch[j];
      if (ok) {
        if (game.artUrl !== undefined) delete game.artUrl; // legacy URL recovered
      } else {
        failing.push(game);
      }
    });
  }
  log(`legacy CDN check: ${failing.length}/${games.length} failing`);

  // Sanity guard: a network outage is indistinguishable from a dead URL at the
  // per-request level (both report "failing"), but a mass failure is far more
  // likely to be connectivity than Steam delisting a large chunk of the
  // library. Abort rather than bake in hundreds of spurious SGDB overrides.
  const maxPlausibleFailures = Math.max(25, Math.ceil(games.length * 0.05));
  if (failing.length > maxPlausibleFailures) {
    throw new Error(
      `${failing.length}/${games.length} legacy CDN checks failed — implausibly many; ` +
        'suspecting a network problem, not dead art. Aborting without changes.',
    );
  }

  const result: ArtEnrichmentResult = {
    failingAppIds: failing.map((g) => g.appId),
    resolved: [],
    unresolved: [],
  };
  for (const game of failing) {
    const url = await resolveSgdbHeaderUrl(game.appId, apiKey);
    if (url) {
      game.artUrl = url;
      result.resolved.push({ appId: game.appId, url });
      log(`  ${game.appId}: SGDB -> ${url}`);
    } else {
      delete game.artUrl;
      result.unresolved.push(game.appId);
      log(`  ${game.appId}: no SGDB art, monogram fallback`);
    }
    await sleep(throttleMs);
  }
  return result;
}
