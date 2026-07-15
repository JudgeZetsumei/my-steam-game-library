import type { SortKey } from '@/lib/types';

interface FilterBarProps {
  query: string;
  onQueryChange: (v: string) => void;
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
  totalCount: number;
}

export default function FilterBar({ query, onQueryChange, sort, onSortChange, totalCount }: FilterBarProps) {
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
          <button className="btn" id="rollBtn">
            🎲 Roll the dice
          </button>
        </div>
        <div className="row2" />
        <div className="drawer" />
      </div>
    </div>
  );
}
