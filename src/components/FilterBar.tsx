import { CHIPS } from '@/lib/filters';
import type { Game, SortKey } from '@/lib/types';
import FilterDrawer from './FilterDrawer';

interface FilterBarProps {
  query: string;
  onQueryChange: (v: string) => void;
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
  totalCount: number;
  chips: string[];
  onToggleChip: (key: string) => void;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  tags: string[];
  games: Game[];
  selectedTags: number[];
  onToggleTag: (index: number) => void;
  deck: -1 | 0 | 1 | 2;
  onDeckChange: (deck: -1 | 0 | 1 | 2) => void;
  minScore: number;
  onMinScoreChange: (value: number) => void;
  onRoll: () => void;
}

export default function FilterBar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  totalCount,
  chips,
  onToggleChip,
  drawerOpen,
  onToggleDrawer,
  tags,
  games,
  selectedTags,
  onToggleTag,
  deck,
  onDeckChange,
  minScore,
  onMinScoreChange,
  onRoll,
}: FilterBarProps) {
  return (
    <div className="bar">
      <div className="bar-inner">
        <div className="row1">
          <div className="search">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              placeholder={`Search ${totalCount} games…`}
              autoComplete="off"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
            />
          </div>
          <select
            aria-label="Sort library"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
          >
            <option value="name">A → Z</option>
            <option value="hours">Most played</option>
            <option value="user">User score</option>
            <option value="meta">Metascore</option>
            <option value="year">Newest</option>
            <option value="unplayed">Least played</option>
          </select>
          <button className="btn" id="rollBtn" onClick={onRoll}>
            🎲 Roll the dice
          </button>
        </div>
        <div className="row2">
          {CHIPS.map((c) => {
            const isOn = chips.includes(c.key);
            return (
              <button
                type="button"
                key={c.key}
                className={`chip ${isOn ? 'on' : ''} ${isOn && c.mag ? 'mag' : ''}`}
                onClick={() => onToggleChip(c.key)}
              >
                {c.label}
              </button>
            );
          })}
          <button type="button" className="more-toggle" onClick={onToggleDrawer}>
            {drawerOpen ? 'Fewer filters ▴' : 'More filters ▾'}
          </button>
        </div>
        <FilterDrawer
          open={drawerOpen}
          tags={tags}
          games={games}
          selectedTags={selectedTags}
          onToggleTag={onToggleTag}
          deck={deck}
          onDeckChange={onDeckChange}
          minScore={minScore}
          onMinScoreChange={onMinScoreChange}
        />
      </div>
    </div>
  );
}
