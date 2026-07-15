import { getLibrary } from "@/lib/data";
import { Feature } from "@/lib/types";

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
          TODO: everything below, down through the closing </div> of the
          roulette overlay, is a static placeholder. A later step replaces
          it with a single <GameLibrary library={library} /> client
          component that owns filter/sort/randomiser state.
        */}
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
                  placeholder={`Search ${library.games.length} games…`}
                  autoComplete="off"
                  disabled
                />
              </div>
              <select aria-label="Sort library" disabled>
                <option value="name">A → Z</option>
                <option value="hours">Most played</option>
                <option value="user">User score</option>
                <option value="meta">Metascore</option>
                <option value="year">Newest</option>
                <option value="unplayed">Least played</option>
              </select>
              <button className="btn" id="rollBtn" disabled>
                🎲 Roll the dice
              </button>
            </div>
            <div className="row2" />
            <div className="drawer" />
          </div>
        </div>

        <div className="meta">
          <span>
            Showing <b>{library.games.length}</b> of{" "}
            <b>{library.games.length}</b>
          </span>
          <button className="clear">✕ Clear all filters</button>
        </div>

        <div className="grid" />
        <div className="sentinel" />
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
