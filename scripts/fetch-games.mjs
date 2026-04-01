import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const GAMES = [
  {
    id: "0041500407",
    season: "2015-16",
    seasonType: "Playoffs",
    label: "2016 Finals Game 7",
  },
  {
    id: "0021501228",
    season: "2015-16",
    seasonType: "Regular Season",
    label: "Kobe's 60-Point Farewell",
  },
  {
    id: "0021600827",
    season: "2016-17",
    seasonType: "Regular Season",
    label: "Booker's 70-Point Game",
  },
  {
    id: "0021400587",
    season: "2014-15",
    seasonType: "Regular Season",
    label: "Klay's 37-Point Quarter",
  },
];

const NBA_HEADERS = {
  Host: "stats.nba.com",
  Referer: "https://www.nba.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token": "true",
  Connection: "keep-alive",
};

function buildUrl(gameId, season, seasonType) {
  const params = new URLSearchParams({
    ContextMeasure: "FGA",
    GameID: gameId,
    LastNGames: "0",
    LeagueID: "00",
    Month: "0",
    OpponentTeamID: "0",
    Period: "0",
    PlayerID: "0",
    PlayerPosition: "",
    Season: season,
    SeasonSegment: "",
    SeasonType: seasonType,
    TeamID: "0",
    VsConference: "",
    VsDivision: "",
  });
  return `https://stats.nba.com/stats/shotchartdetail?${params}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchGame(game) {
  const url = buildUrl(game.id, game.season, game.seasonType);
  const response = await fetch(url, { headers: NBA_HEADERS });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const shotSet = data?.resultSets?.find((rs) => rs.name === "Shot_Chart_Detail");
  if (!shotSet || shotSet.rowSet.length === 0) {
    throw new Error("Response contained no shot data â€” check Game ID and season/type.");
  }

  return { data, shotCount: shotSet.rowSet.length };
}

async function main() {
  const outputDir = join(__dirname, "..", "public", "games");
  mkdirSync(outputDir, { recursive: true });

  console.log(`\nFields of Hoops â€” game data fetcher`);
  console.log(`Output: ${outputDir}\n`);

  let successCount = 0;

  for (let i = 0; i < GAMES.length; i++) {
    const game = GAMES[i];
    process.stdout.write(`[${i + 1}/${GAMES.length}] ${game.label} (${game.id}) â€¦ `);

    try {
      const { data, shotCount } = await fetchGame(game);
      const outputPath = join(outputDir, `${game.id}.json`);
      writeFileSync(outputPath, JSON.stringify(data));
      console.log(`âœ“  ${shotCount} shots`);
      successCount++;
    } catch (err) {
      console.log(`âœ—  ${err.message}`);
    }

    if (i < GAMES.length - 1) {
      const delay = 2000 + Math.random() * 1000;
      await sleep(delay);
    }
  }

  console.log(`\n${successCount}/${GAMES.length} games fetched.`);

  if (successCount > 0) {
    console.log(`\nNext steps:`);
    console.log(`  npm run dev       â†’ start the dev server`);
    console.log(`  open http://localhost:3000\n`);
  } else {
    console.log(`\nAll fetches failed. Make sure you're on a home/office connection`);
    console.log(`(not a cloud server) â€” the NBA API blocks cloud provider IPs.\n`);
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
