import { tagCounts } from '@/lib/filters';
import type { Game } from '@/lib/types';

interface TagCloudProps {
  tags: string[];
  games: Game[];
  selected: number[];
  onToggle: (index: number) => void;
}

export default function TagCloud({ tags, games, selected, onToggle }: TagCloudProps) {
  const counts = tagCounts(games, tags);

  return (
    <div className="tagcloud">
      {counts.map(({ tag, index, count }) => (
        <button
          type="button"
          key={index}
          className={`tagpill ${selected.includes(index) ? 'on' : ''}`}
          onClick={() => onToggle(index)}
        >
          {tag}
          <b>{count}</b>
        </button>
      ))}
    </div>
  );
}
