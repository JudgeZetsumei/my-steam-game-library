import { useEffect, useRef, useState } from 'react';
import type { Game } from '@/lib/types';
import GameCard from './GameCard';

const CHUNK = 48;

interface GameGridProps {
  games: Game[];
  totalCount: number;
}

export default function GameGrid({ games, totalCount }: GameGridProps) {
  const [visibleCount, setVisibleCount] = useState(CHUNK);
  // Reset the chunk size whenever the filtered/sorted list identity changes.
  // Adjusting state during render (rather than in an effect) avoids an
  // extra commit — see https://react.dev/learn/you-might-not-need-an-effect.
  const [prevGames, setPrevGames] = useState(games);
  if (games !== prevGames) {
    setPrevGames(games);
    setVisibleCount(CHUNK);
  }

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((count) => (count < games.length ? Math.min(count + CHUNK, games.length) : count));
        }
      },
      { rootMargin: '900px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [games]);

  return (
    <>
      <div className="grid">
        {games.length === 0 ? (
          <div className="empty">
            <div className="big">Nothing matches that combo</div>
            Loosen a filter or two — the vault holds {totalCount} games.
          </div>
        ) : (
          games.slice(0, visibleCount).map((g) => <GameCard key={g.appId} game={g} />)
        )}
      </div>
      <div className="sentinel" ref={sentinelRef} />
    </>
  );
}
