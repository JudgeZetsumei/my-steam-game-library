import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Game } from '@/lib/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

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

  // Fade/stagger-in newly mounted cards, mirroring the original's
  // `renderChunk` — cards render with plain class `"card"` and are
  // upgraded to `"card in"` here once GSAP (or the reduced-motion
  // fallback) has run.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const fresh = Array.from(container.querySelectorAll<HTMLElement>('.card:not(.in)'));
    if (fresh.length === 0) return;

    if (reduceMotion) {
      fresh.forEach((el) => el.classList.add('in'));
      return;
    }

    const tween = gsap.fromTo(
      fresh,
      { y: 26, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.022,
        ease: 'power2.out',
        onStart: () => fresh.forEach((el) => el.classList.add('in')),
        // `.in` + CSS is the source of truth for the resting state — clear
        // *all* inline styles once the tween completes so nothing GSAP set
        // (opacity included) can linger and override the stylesheet.
        clearProps: 'opacity,transform',
      },
    );

    return () => {
      // A bare kill() abandons whatever inline opacity/transform exists at
      // that instant — cards mid-stagger (or not yet started, thanks to
      // fromTo's immediateRender) would be left stuck translucent/invisible
      // with `.in` already applied, so the `:not(.in)` selector would never
      // rescue them. Kill, then wipe the inline styles so `.in` (or a re-run
      // of this effect for cards that never got it) takes over.
      tween.kill();
      gsap.set(fresh, { clearProps: 'opacity,transform' });
    };
  }, [games, visibleCount, reduceMotion]);

  return (
    <>
      <div className="grid" ref={containerRef}>
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
