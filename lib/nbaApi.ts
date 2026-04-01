import { HttpsProxyAgent } from "https-proxy-agent";
import { GameMeta } from "./games";

const NBA_HEADERS = {
  Host: "stats.nba.com",
  Referer: "https://www.nba.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token": "true",
  Connection: "keep-alive",
} as const;

// Webshare proxy list — rotated randomly on each request to avoid bans.
const PROXY_LIST = [
  "http://jrzdkdpa:af4lib5r658v@31.59.20.176:6754",
  "http://jrzdkdpa:af4lib5r658v@23.95.150.145:6114",
  "http://jrzdkdpa:af4lib5r658v@198.23.239.134:6540",
  "http://jrzdkdpa:af4lib5r658v@45.38.107.97:6014",
  "http://jrzdkdpa:af4lib5r658v@107.172.163.27:6543",
  "http://jrzdkdpa:af4lib5r658v@198.105.121.200:6462",
  "http://jrzdkdpa:af4lib5r658v@216.10.27.159:6837",
  "http://jrzdkdpa:af4lib5r658v@142.111.67.146:5611",
  "http://jrzdkdpa:af4lib5r658v@191.96.254.138:6185",
  "http://jrzdkdpa:af4lib5r658v@31.58.9.4:6077",
];

function randomProxy(): string {
  return PROXY_LIST[Math.floor(Math.random() * PROXY_LIST.length)];
}

type ResultSet = {
  name?: string;
  headers?: string[];
  rowSet?: unknown[][];
};

function asResultSets(payload: unknown): ResultSet[] {
  const data = payload as { resultSets?: ResultSet[] | { name?: string; headers?: string[]; rowSet?: unknown[][] }[] };
  if (!data?.resultSets) {
    return [];
  }

  return Array.isArray(data.resultSets) ? data.resultSets : [];
}

export function findResultSet(payload: unknown, name: string): ResultSet | undefined {
  return asResultSets(payload).find((set) => set.name === name);
}

export function rowObjects(payload: unknown, name: string): Record<string, unknown>[] {
  const resultSet = findResultSet(payload, name);
  if (!resultSet?.headers || !resultSet.rowSet) {
    return [];
  }

  return resultSet.rowSet.map((row) =>
    resultSet.headers!.reduce<Record<string, unknown>>((acc, header, index) => {
      acc[header] = row[index];
      return acc;
    }, {})
  );
}

function formatSeason(startYear: number): string {
  const endYear = (startYear + 1).toString().slice(-2);
  return `${startYear}-${endYear}`;
}

export function deriveSeasonFromDate(gameDateIso: string): string {
  const [yearText, monthText] = gameDateIso.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const startYear = month >= 10 ? year : year - 1;
  return formatSeason(startYear);
}

export function deriveSeasonTypeFromGameId(gameId: string): GameMeta["seasonType"] {
  const prefix = gameId.slice(0, 3);
  if (prefix === "004") {
    return "Playoffs";
  }

  return "Regular Season";
}

export function toNbaDate(dateIso: string): string {
  const [year, month, day] = dateIso.split("-");
  return `${month}/${day}/${year}`;
}

export function toDisplayDate(dateIso: string): string {
  const date = new Date(`${dateIso}T12:00:00Z`);
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const day = date.toLocaleString("en-US", { day: "2-digit", timeZone: "UTC" });
  const year = date.toLocaleString("en-US", { year: "numeric", timeZone: "UTC" });
  return `${month} ${day}, ${year}`;
}

export function buildScoreboardUrl(dateIso: string): string {
  const params = new URLSearchParams({
    DayOffset: "0",
    GameDate: toNbaDate(dateIso),
    LeagueID: "00",
  });

  return `https://stats.nba.com/stats/scoreboardv2?${params.toString()}`;
}

export function buildShotChartUrl(
  gameId: string,
  season: string,
  seasonType: GameMeta["seasonType"]
): string {
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

  return `https://stats.nba.com/stats/shotchartdetail?${params.toString()}`;
}

export async function fetchNbaJson(url: string): Promise<unknown> {
  const agent = new HttpsProxyAgent(randomProxy());

  const response = await fetch(url, {
    headers: NBA_HEADERS,
    cache: "no-store",
    // @ts-expect-error — agent is a Node.js extension not in the standard fetch types
    agent,
  });

  if (!response.ok) {
    throw new Error(`NBA API returned HTTP ${response.status}.`);
  }

  return response.json();
}