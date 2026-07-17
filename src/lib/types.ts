export const Feature = {
  Coop: 1,
  OnlineCoop: 2,
  LocalCoop: 4,
  Multiplayer: 8,
  SinglePlayer: 16,
  FullController: 32,
  PartialController: 64,
  VR: 128,
  PvP: 256,
  Achievements: 512,
  OpenWorld: 1024,
  EarlyAccess: 2048,
} as const;
export const DeckStatus = { Unsupported: 0, Playable: 1, Verified: 2 } as const;
export type DeckStatus = (typeof DeckStatus)[keyof typeof DeckStatus];

export interface Game {
  name: string;
  appId: number;
  hours: number;
  metascore: number | null;
  userScore: number | null;
  year: number | null;
  deck: DeckStatus;
  features: number;
  tagIndexes: number[];
  /**
   * Override art URL (SteamGridDB), set at data-generation time only for games
   * whose legacy Steam CDN header URL is dead. Absent for all others.
   */
  artUrl?: string;
}
export interface Library {
  tags: string[];
  games: Game[];
}
export type SortKey = 'name' | 'hours' | 'user' | 'meta' | 'year' | 'unplayed';
export interface FilterState {
  query: string;
  chips: string[];
  tags: number[];
  deck: -1 | 0 | 1 | 2;
  minScore: number;
  sort: SortKey;
}
