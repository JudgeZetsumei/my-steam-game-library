import { Feature } from './types';
import type { FilterState, Game, SortKey } from './types';

export const CHIPS: { key: string; label: string; mag?: boolean; test: (g: Game) => boolean }[] = [
  { key: 'coop', label: 'Co-op', test: (g) => !!(g.features & Feature.Coop) },
  { key: 'ocoop', label: 'Online co-op', test: (g) => !!(g.features & Feature.OnlineCoop) },
  { key: 'couch', label: 'Couch / split', test: (g) => !!(g.features & Feature.LocalCoop) },
  { key: 'pvp', label: 'PvP', test: (g) => !!(g.features & Feature.PvP) },
  { key: 'sp', label: 'Single-player', test: (g) => !!(g.features & Feature.SinglePlayer) },
  { key: 'ow', label: 'Open world', mag: true, test: (g) => !!(g.features & Feature.OpenWorld) },
  {
    key: 'pad',
    label: 'Controller',
    test: (g) => !!(g.features & (Feature.FullController | Feature.PartialController)),
  },
  { key: 'deck', label: 'Deck ✓', mag: true, test: (g) => g.deck === 2 },
  { key: 'vr', label: 'VR', mag: true, test: (g) => !!(g.features & Feature.VR) },
  { key: 'unplayed', label: 'Backlog (<2h)', mag: true, test: (g) => g.hours < 2 },
];

export function filterGames(games: Game[], state: FilterState): Game[] {
  const q = state.query.trim().toLowerCase();
  return games.filter((g) => {
    if (q && !g.name.toLowerCase().includes(q)) return false;
    for (const c of CHIPS) {
      if (state.chips.includes(c.key) && !c.test(g)) return false;
    }
    if (!state.tags.every((t) => g.tagIndexes.includes(t))) return false;
    if (state.deck >= 0 && g.deck < state.deck) return false;
    if (state.minScore > 0 && (g.userScore == null || g.userScore < state.minScore)) return false;
    return true;
  });
}

export function sortGames(games: Game[], sort: SortKey): Game[] {
  const list = [...games];
  list.sort((a, b) => {
    if (sort === 'hours') return b.hours - a.hours;
    if (sort === 'unplayed') return a.hours - b.hours;
    if (sort === 'user') return (b.userScore ?? -1) - (a.userScore ?? -1);
    if (sort === 'meta') return (b.metascore ?? -1) - (a.metascore ?? -1);
    if (sort === 'year') return (b.year ?? 0) - (a.year ?? 0);
    return a.name.localeCompare(b.name);
  });
  return list;
}

export function tagCounts(
  games: Game[],
  tags: string[],
): { tag: string; index: number; count: number }[] {
  const counts = tags.map((tag, index) => ({ tag, index, count: 0 }));
  for (const g of games) {
    for (const t of g.tagIndexes) {
      counts[t].count++;
    }
  }
  return counts
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.count - a.c.count || a.i - b.i)
    .map(({ c }) => c);
}
