import type { Game } from '@/lib/types';
import TagCloud from './TagCloud';

interface FilterDrawerProps {
  open: boolean;
  tags: string[];
  games: Game[];
  selectedTags: number[];
  onToggleTag: (index: number) => void;
  deck: -1 | 0 | 1 | 2;
  onDeckChange: (deck: -1 | 0 | 1 | 2) => void;
  minScore: number;
  onMinScoreChange: (value: number) => void;
}

export default function FilterDrawer({
  open,
  tags,
  games,
  selectedTags,
  onToggleTag,
  deck,
  onDeckChange,
  minScore,
  onMinScoreChange,
}: FilterDrawerProps) {
  return (
    <div className={`drawer ${open ? 'open' : ''}`}>
      <div className="drawer-inner">
        <div>
          <h4>Genres &amp; tags</h4>
          <TagCloud tags={tags} games={games} selected={selectedTags} onToggle={onToggleTag} />
        </div>
        <div className="drawer-row">
          <label>
            Steam Deck
            <select value={deck} onChange={(e) => onDeckChange(Number(e.target.value) as -1 | 0 | 1 | 2)}>
              <option value={-1}>Any</option>
              <option value={2}>Verified only</option>
              <option value={1}>Playable or better</option>
            </select>
          </label>
          <label>
            Min user score
            <input
              type="range"
              min={0}
              max={95}
              step={5}
              value={minScore}
              onChange={(e) => onMinScoreChange(Number(e.target.value))}
            />
            <span className="scoreval">{minScore || '—'}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
