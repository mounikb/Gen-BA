"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import PosterCanvas from "@/components/PosterCanvas";
import DownloadButtons from "@/components/DownloadButtons";
import { CURATED_GAMES, GameMeta } from "@/lib/games";
import { toIsoDate } from "@/lib/dateFormat";
import { parseNBAResponse, Shot } from "@/lib/parseShots";
import { resolveVanillaGameColors, TEAM_OPTIONS } from "@/lib/teamColors";
import { THEME_ORDER, THEMES, Theme, ThemeId } from "@/lib/themes";

const fieldClass =
  "w-full border border-[#d7d2c8] bg-[#fbf9f3] px-3 py-3 text-[12px] uppercase tracking-[0.14em] text-[#3a3841] outline-none transition-colors placeholder:text-[#b1ab9f] focus:border-[#4a4751] sm:px-4 sm:text-[14px] sm:tracking-[0.16em]";

function normalizeTerm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildLookupMessage(
  game: GameMeta,
  mvpPlayer: string
): string {
  if (!mvpPlayer.trim()) {
    return `Found ${game.label}. Poster ready.`;
  }

  return `Found ${game.label}. Featuring MVP ${mvpPlayer}.`;
}

function buildUnavailableMessage(teamA: string, teamB: string, dateValue: string): string {
  const teams = [teamA.trim(), teamB.trim()].filter(Boolean).join(" vs ");
  const dateLabel = dateValue || "the selected date";

  if (teams) {
    return `No NBA game found for ${teams} on ${dateLabel}.`;
  }

  return `No NBA game found for ${dateLabel}.`;
}

export default function Home() {
  const initialGame = CURATED_GAMES[0];
  const [selectedGame, setSelectedGame] = useState<GameMeta>(initialGame);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(THEMES.vanilla);
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestedDate, setSuggestedDate] = useState<string | null>(null);
  const [lookupMessage, setLookupMessage] = useState(
    "Search any NBA matchup by teams and date, then generate the poster from live shot data."
  );
  const [teamOne, setTeamOne] = useState(initialGame.homeTeamAbbr);
  const [teamTwo, setTeamTwo] = useState(initialGame.awayTeamAbbr);
  const [selectedDate, setSelectedDate] = useState(toIsoDate(initialGame.date));

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadGame(selectedGame);
  }, [selectedGame]);

  async function loadGame(game: GameMeta) {
    setLoading(true);
    setLoadError(null);
    setShots([]);

    try {
      const params = new URLSearchParams({
        gameId: game.id,
        season: game.season,
        seasonType: game.seasonType,
      });
      const res = await fetch(`/api/nba/shots?${params.toString()}`);
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `Shot data request failed (HTTP ${res.status}).`);
      }
      const data = await res.json();
      const parsed = parseNBAResponse(data);
      if (parsed.length === 0) {
        throw new Error("No shot data found in this file.");
      }
      setShots(parsed);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load game.");
    } finally {
      setLoading(false);
    }
  }

  const mvpPlayer = useMemo(() => {
    if (!shots.length) {
      return "";
    }

    const playerStats = new Map<string, { points: number; makes: number; attempts: number }>();
    for (const shot of shots) {
      const current = playerStats.get(shot.playerName) ?? {
        points: 0,
        makes: 0,
        attempts: 0,
      };
      current.attempts += 1;
      if (shot.shotMade) {
        current.makes += 1;
        current.points += shot.shotType.includes("3PT") ? 3 : 2;
      }
      playerStats.set(shot.playerName, current);
    }

    return Array.from(playerStats.entries())
      .sort(
        (a, b) =>
          b[1].points - a[1].points ||
          b[1].makes - a[1].makes ||
          b[1].attempts - a[1].attempts ||
          a[0].localeCompare(b[0])
      )[0]?.[0] ?? "";
  }, [shots]);

  useEffect(() => {
    if (!shots.length || loading || loadError) {
      return;
    }

    setLookupMessage(buildLookupMessage(selectedGame, mvpPlayer));
  }, [
    loadError,
    loading,
    mvpPlayer,
    selectedGame,
    shots,
  ]);

  async function applyGameSearch() {
    if (!teamOne.trim() || !teamTwo.trim() || !selectedDate) {
      setSearchError("Enter both teams and a date before generating a poster.");
      setSuggestedDate(null);
      return;
    }

    setLoading(true);
    setSearchError(null);
    setSuggestedDate(null);
    setLookupMessage("Searching the live NBA schedule...");

    try {
      const params = new URLSearchParams({
        teamA: teamOne.trim(),
        teamB: teamTwo.trim(),
        date: selectedDate,
      });
      const res = await fetch(`/api/nba/search?${params.toString()}`);
      const payload = (await res.json().catch(() => null)) as
        | { error?: string; game?: GameMeta; suggestedDate?: string }
        | null;

      if (!res.ok || !payload?.game) {
        setSuggestedDate(payload?.suggestedDate ?? null);
        throw new Error(
          payload?.error ?? buildUnavailableMessage(teamOne, teamTwo, selectedDate)
        );
      }

      setSuggestedDate(null);
      setSelectedGame(payload.game);
      setLookupMessage(`Found ${payload.game.label}. Loading poster...`);
    } catch (err) {
      setLoading(false);
      setSearchError(
        err instanceof Error ? err.message : "Unable to find that NBA game."
      );
      setLookupMessage("Game unavailable.");
    }
  }

  function loadQuickGame(game: GameMeta) {
    setSearchError(null);
    setLoadError(null);
    setSuggestedDate(null);
    setTeamOne(game.homeTeamAbbr);
    setTeamTwo(game.awayTeamAbbr);
    setSelectedDate(toIsoDate(game.date));
    setSelectedGame(game);
    setLookupMessage(`Loaded ${game.label}.`);
  }

  const themeId = selectedTheme.id as ThemeId;
  const vanillaPreview = useMemo(
    () =>
      resolveVanillaGameColors(
        selectedGame.homeTeamAbbr,
        selectedGame.awayTeamAbbr
      ),
    [selectedGame]
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#e9e6de] text-[#383640]">
      <div className="mx-auto max-w-[1600px] px-1 py-1 sm:px-3 sm:py-3 lg:px-6 lg:py-4">
        <div className="grid gap-2 sm:gap-3 xl:grid-cols-[500px_minmax(0,1fr)]">
          <section className="min-w-0 border border-[#d4d0c7] bg-[#f4f1ea] px-3 py-4 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
            <header className="border-b border-[#d7d2c8] pb-6 sm:pb-8">
              <div className="grid gap-x-6 gap-y-5 sm:gap-x-8 sm:gap-y-10 md:grid-cols-[156px_minmax(0,1fr)] md:items-start md:gap-x-8 md:gap-y-10 lg:grid-cols-[184px_minmax(0,1fr)] lg:gap-x-9 lg:gap-y-12">
                <div className="justify-self-start">
                  <LogoMark />
                </div>
                <div className="min-w-0 self-start">
                  <p className="pl-[2px] text-[9px] uppercase tracking-[0.7em] text-[#8e8a80] sm:text-[10px] sm:tracking-[0.78em]">
                    Gen-BA
                  </p>
                  <h1 className="mt-3 text-[28px] font-medium uppercase leading-[0.95] tracking-[-0.05em] text-[#46424c] sm:mt-5 sm:text-[36px] lg:text-[45px]">
                    Fields
                    <br />
                    of
                    <br />
                    Hoops
                  </h1>
                </div>
                <p className="max-w-full text-[14px] leading-[1.6] tracking-[-0.01em] text-[#4e4a54] sm:max-w-[720px] sm:text-[18px] sm:leading-[1.55] sm:tracking-[-0.02em] md:col-span-2 md:text-[19px]">
                  Generative NBA posters built from shot pressure, makes, and the
                  control each team had across the floor.
                </p>
              </div>
            </header>

            <form
              className="mt-6 space-y-6 sm:mt-8 sm:space-y-8"
              onSubmit={(event) => {
                event.preventDefault();
                applyGameSearch();
              }}
            >
              <PanelSection
                step="1."
                title="Find Game"
                description="Search the live NBA schedule using both teams and the game date."
              >
                <div className="space-y-4">
                  <FieldLabel label="Team One">
                    <input
                      name="team-one"
                      list="team-options"
                      value={teamOne}
                      onChange={(event) => setTeamOne(event.target.value)}
                      className={fieldClass}
                      placeholder="Cleveland Cavaliers"
                      autoComplete="on"
                    />
                  </FieldLabel>
                  <FieldLabel label="Team Two">
                    <input
                      name="team-two"
                      list="team-options"
                      value={teamTwo}
                      onChange={(event) => setTeamTwo(event.target.value)}
                      className={fieldClass}
                      placeholder="Golden State Warriors"
                      autoComplete="on"
                    />
                  </FieldLabel>
                  <FieldLabel label="Game Date">
                    <div>
                      <input
                        name="game-date"
                        type="date"
                        value={selectedDate}
                        onChange={(event) => setSelectedDate(event.target.value)}
                        className={fieldClass}
                        autoComplete="on"
                      />
                      {suggestedDate && (
                        <div className="mt-3 border border-[#d8b2aa] bg-[#fbf1ed] px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8f3f34]">
                            Closest available date
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <p className="text-[13px] uppercase tracking-[0.18em] text-[#5a4a45]">
                              {suggestedDate}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDate(suggestedDate);
                                setSearchError(null);
                                setLookupMessage(`Closest date applied: ${suggestedDate}.`);
                              }}
                              className="inline-flex items-center justify-center border border-[#b0483b]/35 bg-[#fff7f4] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#8f3f34] transition-colors hover:border-[#b0483b] hover:bg-[#f5e6df]"
                            >
                              Use This Date
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </FieldLabel>
                </div>

                <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[#8c877b]">
                  {lookupMessage}
                </p>
                {searchError && (
                  <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[#b0483b] sm:text-[11px] sm:tracking-[0.18em]">
                    {searchError}
                  </p>
                )}
              </PanelSection>

              <PanelSection
                step="1b."
                title="Try These"
                description="Quick-load a curated game and adjust the search fields automatically."
              >
                <div className="space-y-2">
                  {CURATED_GAMES.map((game) => {
                    const isSelected = selectedGame.id === game.id;
                    return (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => loadQuickGame(game)}
                        className={[
                          "flex w-full items-start gap-3 border px-3 py-2 text-left transition-colors",
                          isSelected
                            ? "border-[#4c4a54] bg-[#ece8df] text-[#2f2d35]"
                            : "border-[#ddd8ce] bg-[#f8f5ef] text-[#6e6a61] hover:border-[#a29d92] hover:text-[#3a3841]",
                        ].join(" ")}
                      >
                        <span className="mt-[3px] text-[12px] uppercase tracking-[0.28em]">
                          [{isSelected ? "*" : " "}]
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] uppercase tracking-[0.08em]">
                            {game.label}
                          </span>
                          <span className="mt-1 block text-[11px] uppercase tracking-[0.22em] text-[#908c82]">
                            {game.homeTeamAbbr} {game.homeScore} / {game.awayTeamAbbr}{" "}
                            {game.awayScore}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PanelSection>

              <PanelSection
                step="2."
                title="Select Theme"
                description="Switch the poster palette while keeping the same game geometry."
              >
                <div className="space-y-2">
                  {THEME_ORDER.map((id) => {
                    const theme = THEMES[id];
                    const isSelected = themeId === id;
                    const swatchOne =
                      id === "vanilla"
                        ? vanillaPreview.homeColor
                        : theme.homeColors[1];
                    const swatchTwo =
                      id === "vanilla"
                        ? vanillaPreview.awayColor
                        : theme.awayColors[1];

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedTheme(theme)}
                        className={[
                          "flex w-full items-center gap-3 border px-3 py-2 text-left transition-colors",
                          isSelected
                            ? "border-[#4c4a54] bg-[#ece8df] text-[#2f2d35]"
                            : "border-[#ddd8ce] bg-[#f8f5ef] text-[#6e6a61] hover:border-[#a29d92] hover:text-[#3a3841]",
                        ].join(" ")}
                      >
                        <span className="text-[12px] uppercase tracking-[0.28em]">
                          [{isSelected ? "*" : " "}]
                        </span>
                        <span className="flex gap-1">
                          <span
                            className="h-4 w-4 border border-black/10"
                            style={{ backgroundColor: swatchOne }}
                          />
                          <span
                            className="h-4 w-4 border border-black/10"
                            style={{ backgroundColor: swatchTwo }}
                          />
                          <span
                            className="h-4 w-4 border border-black/10"
                            style={{ backgroundColor: theme.accentColor }}
                          />
                        </span>
                        <span className="text-[15px] uppercase tracking-[0.08em]">
                          {theme.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PanelSection>

              <div className="border-t border-[#d7d2c8] pt-6">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center border border-[#46424c] bg-[#46424c] px-5 py-3 text-[12px] uppercase tracking-[0.26em] text-[#f7f3ea] transition-colors hover:bg-[#2d2b32] sm:min-w-[180px] sm:w-auto sm:text-[13px] sm:tracking-[0.3em]"
                >
                  Get Poster
                </button>
              </div>
            </form>

            <footer className="mt-8 border-t border-[#d7d2c8] pt-4 text-[9px] uppercase tracking-[0.18em] text-[#8f8a80] sm:mt-10 sm:pt-5 sm:text-[11px] sm:tracking-[0.24em]">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
                <Link
                  href="/colophon"
                  className="transition-colors hover:text-[#46424c]"
                >
                  Colophon
                </Link>
                <span>Live NBA API</span>
                <span className="sm:ml-auto">By mounikb</span>
              </div>
            </footer>

            <datalist id="team-options">
              {TEAM_OPTIONS.map((team) => (
                <option key={team} value={team} />
              ))}
            </datalist>
          </section>

          <section className="min-w-0 overflow-hidden border border-[#d4d0c7] bg-[#ddd9d0] p-1 sm:p-6 lg:p-8">
            <div className="flex min-h-[320px] items-start justify-center bg-[#e7e4dc] p-1 sm:min-h-[560px] sm:p-6 lg:p-8 xl:min-h-[calc(100vh-3rem)]">
              <div className="w-full min-w-0 max-w-[860px]">
                {loading && (
                  <div className="flex min-h-[360px] items-center justify-center border border-black/10 bg-[#f8f5ef] px-6 text-center text-[11px] uppercase tracking-[0.24em] text-[#878277] sm:min-h-[520px] sm:text-[12px] sm:tracking-[0.35em] xl:min-h-[860px]">
                    Generating poster...
                  </div>
                )}

                {loadError && !loading && (
                  <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 border border-black/10 bg-[#f8f5ef] px-6 text-center sm:min-h-[520px] sm:px-8 xl:min-h-[860px]">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#7f4b46] sm:text-[12px] sm:tracking-[0.28em]">
                      {loadError}
                    </p>
                    <p className="max-w-[420px] text-sm leading-6 text-[#8a8579]">
                      The poster now loads live data from the NBA API. If this
                      keeps failing, that API may be blocking the current network.
                    </p>
                  </div>
                )}

                {!loading && !loadError && shots.length > 0 && (
                  <div className="space-y-6">
                    <div className="border border-black/10 bg-[#f4f1ea] p-1 shadow-[0_25px_60px_rgba(0,0,0,0.08)] sm:p-6 lg:p-8">
                      <PosterCanvas
                        ref={canvasRef}
                        shots={shots}
                        game={selectedGame}
                        theme={selectedTheme}
                        highlightPlayer={mvpPlayer}
                      />
                    </div>
                    <div className="flex flex-col gap-3 border border-black/10 bg-[#f4f1ea] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#898478] sm:text-[11px] sm:tracking-[0.24em]">
                        {selectedGame.homeTeamAbbr} vs {selectedGame.awayTeamAbbr} / {" "}
                        {selectedGame.date}
                      </div>
                      <DownloadButtons
                        canvasRef={canvasRef}
                        gameLabel={selectedGame.label}
                      />
                    </div>
                    <div className="hidden overflow-hidden border border-black/10 bg-[#f4f1ea] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.05)] sm:block sm:p-5">
                      <Image
                        src="/hero-illustration.png"
                        alt="Basketball illustration"
                        width={1365}
                        height={768}
                        className="h-auto w-full border border-black/10 object-cover"
                        priority
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function PanelSection({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[#d7d2c8] pt-5 sm:pt-6">
      <div className="flex items-baseline gap-2 sm:gap-3">
        <span className="text-[11px] uppercase tracking-[0.16em] text-[#3a3841] sm:text-[14px] sm:tracking-[0.18em]">
          {step}
        </span>
        <h2 className="text-[17px] uppercase tracking-[-0.03em] text-[#3a3841] sm:text-[22px] sm:tracking-[-0.04em]">
          {title}
        </h2>
      </div>
      <p className="mt-2 max-w-full text-[10px] uppercase tracking-[0.14em] text-[#8e8a80] sm:max-w-[360px] sm:text-[13px] sm:tracking-[0.18em]">
        {description}
      </p>
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-[#807b70] sm:text-[11px] sm:tracking-[0.24em]">
        {label}
      </span>
      {children}
    </label>
  );
}

function LogoMark() {
  return (
    <div className="overflow-hidden border border-[#5a5860] bg-[#f4f1ea] p-[4px] shadow-[0_10px_28px_rgba(0,0,0,0.08)]">
      <Image
        src="/brand-court.svg"
        alt="Fields of Hoops brand mark"
        width={176}
        height={176}
        className="h-[88px] w-[88px] sm:h-[128px] sm:w-[128px] lg:h-[156px] lg:w-[156px]"
        priority
      />
    </div>
  );
}
