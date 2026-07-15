import { getLibrary } from "@/lib/data";
import { Feature } from "@/lib/types";
import GameLibrary from "@/components/GameLibrary";

export default async function Home() {
  const library = await getLibrary();

  const totalHours = Math.round(
    library.games.reduce((sum, game) => sum + game.hours, 0)
  );
  const coopCount = library.games.filter(
    (game) => (game.features & Feature.Coop) !== 0
  ).length;

  return (
    <>
      <div className="aurora" />
      <div className="grain" />

      <main>
        <header className="hero">
          <div>
            <h1>
              Game <em>Vault</em>
            </h1>
            <p className="sub">
              JudgeZetsumei&apos;s Steam library — filter it, sort it, or let
              fate pick tonight&apos;s game.
            </p>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <div className="num">{library.games.length}</div>
              <div className="lbl">Games</div>
            </div>
            <div className="stat">
              <div className="num">{totalHours}</div>
              <div className="lbl">Hours played</div>
            </div>
            <div className="stat">
              <div className="num">{coopCount}</div>
              <div className="lbl">Co-op ready</div>
            </div>
          </div>
        </header>

        {/*
          TODO: the roulette overlay below is still a static placeholder.
          A later step wires it up to real randomiser state owned by
          GameLibrary.
        */}
        <GameLibrary library={library} />
      </main>

      {/* roulette */}
      <div className="overlay">
        <canvas id="burst" />
        <button className="closer" aria-label="Close">
          ×
        </button>
        <div className="roll-title">Consulting the backlog gods…</div>
        <div className="reel-window">
          <div className="centerline" />
          <div className="reel" />
        </div>
        <div className="winner">
          <div className="wart" />
          <h2 />
          <div className="wstats" />
          <div className="wbtns">
            <a className="btn primary" target="_blank" rel="noopener">
              Open in Steam
            </a>
            <button className="btn">↻ Roll again</button>
          </div>
        </div>
      </div>
    </>
  );
}
