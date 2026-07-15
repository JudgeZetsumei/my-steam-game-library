'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface HeroStatsProps {
  games: number;
  hours: number;
  coop: number;
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString();
}

export default function HeroStats({ games, hours, coop }: HeroStatsProps) {
  const gamesRef = useRef<HTMLDivElement | null>(null);
  const hoursRef = useRef<HTMLDivElement | null>(null);
  const coopRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const gamesEl = gamesRef.current;
    const hoursEl = hoursRef.current;
    const coopEl = coopRef.current;
    if (!gamesEl || !hoursEl || !coopEl) return;

    if (reduceMotion) {
      gamesEl.textContent = fmt(games);
      hoursEl.textContent = fmt(hours);
      coopEl.textContent = fmt(coop);
      return;
    }

    const gamesState = { v: 0 };
    const hoursState = { v: 0 };
    const coopState = { v: 0 };

    const gamesTween = gsap.to(gamesState, {
      v: games,
      duration: 1.4,
      ease: 'power3.out',
      onUpdate: () => {
        gamesEl.textContent = fmt(gamesState.v);
      },
    });
    const hoursTween = gsap.to(hoursState, {
      v: hours,
      duration: 1.8,
      ease: 'power3.out',
      onUpdate: () => {
        hoursEl.textContent = fmt(hoursState.v);
      },
    });
    const coopTween = gsap.to(coopState, {
      v: coop,
      duration: 1.4,
      ease: 'power3.out',
      onUpdate: () => {
        coopEl.textContent = fmt(coopState.v);
      },
    });

    return () => {
      gamesTween.kill();
      hoursTween.kill();
      coopTween.kill();
    };
  }, [games, hours, coop, reduceMotion]);

  return (
    <div className="hero-stats">
      <div className="stat">
        <div className="num" ref={gamesRef}>
          0
        </div>
        <div className="lbl">Games</div>
      </div>
      <div className="stat">
        <div className="num" ref={hoursRef}>
          0
        </div>
        <div className="lbl">Hours played</div>
      </div>
      <div className="stat">
        <div className="num" ref={coopRef}>
          0
        </div>
        <div className="lbl">Co-op ready</div>
      </div>
    </div>
  );
}
