import { Feature } from '@/lib/types';
import type { Game } from '@/lib/types';
import SteamArt from './SteamArt';

interface GameCardProps {
  game: Game;
}

export default function GameCard({ game }: GameCardProps) {
  const badges: { key: string; className: string; label: string }[] = [];
  if (game.features & Feature.Coop) badges.push({ key: 'coop', className: 'bdg coop', label: 'Co-op' });
  if (game.features & Feature.LocalCoop) badges.push({ key: 'couch', className: 'bdg coop', label: 'Couch' });
  if (game.features & Feature.PvP) badges.push({ key: 'pvp', className: 'bdg', label: 'PvP' });
  if (game.features & Feature.VR) badges.push({ key: 'vr', className: 'bdg vr', label: 'VR' });
  if (game.features & Feature.OpenWorld) badges.push({ key: 'ow', className: 'bdg', label: 'Open world' });

  return (
    <article className="card in">
      <div className="art">
        <SteamArt appId={game.appId} name={game.name} loading="lazy" />
        {game.deck === 2 && <span className="deckdot v">DECK ✓</span>}
        {game.deck === 1 && <span className="deckdot p">DECK ~</span>}
        <div className="shine" />
      </div>
      <div className="body">
        <h3>{game.name}</h3>
        <div className="stats">
          {game.hours >= 1 ? (
            <span className="hrs">{game.hours >= 100 ? Math.round(game.hours) : game.hours}h</span>
          ) : (
            <span className="hrs" style={{ color: 'var(--mute)' }}>
              unplayed
            </span>
          )}
          {game.userScore != null && <span className="sc">★ {game.userScore}</span>}
          {game.year ? <span className="yr">{game.year}</span> : null}
        </div>
        <div className="badges">
          {badges.slice(0, 4).map((b) => (
            <span key={b.key} className={b.className}>
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
