import raw from '@/data/games.json';
import type { Library } from './types';

const library = raw as Library;

// Steam API seam: today this is static JSON; later, swap for a server-side
// IPlayerService/GetOwnedGames fetch (+ enrichment) without touching callers.
export async function getLibrary(): Promise<Library> {
  return library;
}
