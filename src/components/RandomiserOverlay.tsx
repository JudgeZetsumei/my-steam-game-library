'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Game } from '@/lib/types';
import { steamRunUrl } from '@/lib/steam';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import SteamArt from './SteamArt';

const N = 42;
const TARGET_INDEX = N - 4;

interface RandomiserOverlayProps {
  pool: Game[];
  onClose: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: string;
  l: number;
}

export default function RandomiserOverlay({ pool, onClose }: RandomiserOverlayProps) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<'rolling' | 'winner'>('rolling');
  const [tiles, setTiles] = useState<Game[]>([]);
  const [target, setTarget] = useState<Game | null>(null);
  const [hot, setHot] = useState(false);
  const [rollTitle, setRollTitle] = useState('Consulting the backlog gods…');

  const rollingRef = useRef(true);
  const reelRef = useRef<HTMLDivElement | null>(null);
  const reelWindowRef = useRef<HTMLDivElement | null>(null);
  const winnerRef = useRef<HTMLDivElement | null>(null);
  const burstCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  function startRoll() {
    if (pool.length === 0) return;
    rollingRef.current = true;
    setPhase('rolling');
    setHot(false);
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setTarget(chosen);
    setRollTitle(pool.length === 1 ? 'Well… that was easy' : 'Consulting the backlog gods…');
    const next: Game[] = [];
    for (let i = 0; i < N; i++) {
      next.push(i === TARGET_INDEX ? chosen : pool[Math.floor(Math.random() * pool.length)]);
    }
    setTiles(next);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mounting this overlay IS the "roll" trigger (mirrors the original's click handler), not derived state
    startRoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-once roll
  }, []);

  const burst = useCallback(() => {
    if (reduceMotion) return;
    const canvas = burstCanvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cols = ['#53ddff', '#ff5ca8', '#ffc061', '#6ee89a'];
    const particles: Particle[] = Array.from({ length: 130 }, (_, i) => {
      const a = Math.random() * Math.PI * 2;
      const s = 4 + Math.random() * 9;
      return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 3,
        r: 2 + Math.random() * 3.5,
        c: cols[i % 4],
        l: 1,
      };
    });
    const step = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22;
        p.vx *= 0.985;
        p.l -= 0.013;
        if (p.l > 0) {
          alive = true;
          ctx.globalAlpha = p.l;
          ctx.fillStyle = p.c;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, 7);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      rafRef.current = alive
        ? requestAnimationFrame(step)
        : (ctx.clearRect(0, 0, canvas.width, canvas.height), null);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [reduceMotion]);

  useEffect(() => {
    if (tiles.length === 0) return;
    const reel = reelRef.current;
    const reelWindow = reelWindowRef.current;
    if (!reel || !reelWindow) return;
    const tileEls = Array.from(reel.children) as HTMLElement[];
    const firstTile = tileEls[0];
    if (!firstTile) return;
    const tw = firstTile.getBoundingClientRect().width + 16; // 16px = .reel gap
    const center = reelWindow.getBoundingClientRect().width / 2;
    const targetX = -(TARGET_INDEX * tw + tw / 2 - center);
    gsap.set(reel, { x: center - tw / 2 });

    if (reduceMotion) {
      rollingRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced-motion short-circuit: this effect IS the roll's driver (GSAP tween skipped), instantly resolving to the winner phase
      setPhase('winner');
      return;
    }

    setRollTitle('Rolling…');
    let last = 0;
    const tween = gsap.to(reel, {
      x: targetX,
      duration: 4.6,
      ease: 'power4.out',
      onUpdate: function () {
        const x = gsap.getProperty(reel, 'x') as number;
        const v = Math.abs(x - last);
        last = x;
        reel.style.filter = `blur(${Math.min(v * 0.18, 7)}px)`;
        if (v < 2.5) setHot(true);
      },
      onComplete: () => {
        reel.style.filter = 'none';
        const winTile = tileEls[TARGET_INDEX];
        if (winTile) {
          gsap.fromTo(
            winTile,
            { scale: 1 },
            { scale: 1.08, duration: 0.28, yoyo: true, repeat: 1, ease: 'power2.inOut' },
          );
          gsap.to(winTile, {
            boxShadow: '0 0 40px rgba(83,221,255,.9)',
            borderColor: 'rgba(83,221,255,1)',
            duration: 0.3,
          });
        }
        burst();
        setTimeout(() => {
          rollingRef.current = false;
          setPhase('winner');
        }, 750);
      },
    });

    return () => {
      tween.kill();
    };
  }, [tiles, reduceMotion, burst]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'winner' || reduceMotion) return;
    const el = winnerRef.current;
    if (!el) return;
    const tween = gsap.fromTo(
      el,
      { scale: 0.85, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(1.7)' },
    );
    return () => {
      tween.kill();
    };
  }, [phase, reduceMotion]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !rollingRef.current) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleReroll = () => {
    if (!rollingRef.current) startRoll();
  };

  const handleClose = () => {
    if (!rollingRef.current) onClose();
  };

  return (
    <div
      className="overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget && !rollingRef.current) onClose();
      }}
    >
      <canvas id="burst" ref={burstCanvasRef} />
      <button className="closer" aria-label="Close" onClick={handleClose}>
        ×
      </button>
      <div className={`roll-title ${hot || phase === 'winner' ? 'hot' : ''}`}>
        {phase === 'winner' ? 'Tonight you play' : rollTitle}
      </div>
      {phase === 'rolling' && (
        <div className="reel-window" ref={reelWindowRef}>
          <div className="centerline" />
          <div className="reel" ref={reelRef}>
            {tiles.map((g, i) => (
              <div className="tile" key={i}>
                <SteamArt appId={g.appId} name={g.name} loading="eager" />
              </div>
            ))}
          </div>
        </div>
      )}
      {phase === 'winner' && target && (
        <div className="winner show" ref={winnerRef}>
          <div className="wart">
            <SteamArt appId={target.appId} name={target.name} loading="eager" />
          </div>
          <h2>{target.name}</h2>
          <div className="wstats">
            <span className="hrs">
              {target.hours >= 1 ? `${target.hours}h logged` : 'never launched — a true backlog pull'}
            </span>
            {target.userScore != null && <span className="sc">★ {target.userScore} user score</span>}
            {target.year && <span>{target.year}</span>}
            {target.deck === 2 && <span style={{ color: 'var(--deck-ok)' }}>Deck verified</span>}
          </div>
          <div className="wbtns">
            <a className="btn primary" href={steamRunUrl(target.appId)} target="_blank" rel="noopener">
              Open in Steam
            </a>
            <button className="btn" onClick={handleReroll}>
              ↻ Roll again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
