## Future Steam API (note only)

`src/lib/data.ts#getLibrary()` is the single plug point — later swap the JSON import for a server-side fetch of `IPlayerService/GetOwnedGames` + enrichment, choosing caching explicitly (Next 16 doesn't cache `fetch` by default; `revalidate`/`"use cache"` decided then). Types and components stay source-agnostic.
