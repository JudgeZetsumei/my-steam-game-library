import { getLibrary } from "@/lib/data";
import { Feature } from "@/lib/types";
import GameLibrary from "@/components/GameLibrary";
import HeroStats from "@/components/HeroStats";

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
          <HeroStats
            games={library.games.length}
            hours={totalHours}
            coop={coopCount}
          />
        </header>

        <GameLibrary library={library} />
      </main>
    </>
  );
}
