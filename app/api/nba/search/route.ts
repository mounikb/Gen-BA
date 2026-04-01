import { NextRequest, NextResponse } from "next/server";
import { GameMeta } from "@/lib/games";
import { getTeamColors } from "@/lib/teamColors";
import {
  buildScoreboardUrl,
  deriveSeasonFromDate,
  deriveSeasonTypeFromGameId,
  fetchNbaJson,
  rowObjects,
  toDisplayDate,
} from "@/lib/nbaApi";

const MAX_SUGGESTION_DISTANCE_DAYS = 45;

function normalizeTerm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesTeamInput(input: string, name: string, abbr: string): boolean {
  const term = normalizeTerm(input);
  const candidates = [normalizeTerm(name), normalizeTerm(abbr)];
  return candidates.some(
    (candidate) => candidate.includes(term) || term.includes(candidate)
  );
}

function formatSeasonDisplay(season: string, seasonType: GameMeta["seasonType"]): string {
  return `${season} ${seasonType === "Playoffs" ? "NBA PLAYOFFS" : "REGULAR SEASON"}`;
}

function buildVenue(header: Record<string, unknown>): string {
  const arena = String(header.ARENA_NAME ?? "").trim();
  const city = String(header.ARENA_CITY ?? "").trim();
  const state = String(header.ARENA_STATE ?? "").trim();
  return [arena, [city, state].filter(Boolean).join(", ")].filter(Boolean).join("  ·  ");
}

function shiftIsoDate(date: string, deltaDays: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + deltaDays);
  return value.toISOString().slice(0, 10);
}

function buildTeamName(line: Record<string, unknown>): string {
  const abbr = String(line.TEAM_ABBREVIATION ?? "").trim();
  const fallback = `${String(line.TEAM_CITY_NAME ?? "").trim()} ${String(
    line.TEAM_NICKNAME ?? ""
  ).trim()}`.trim();

  return getTeamColors(abbr).teamName || fallback;
}

function findMatchOnDate(
  gameHeaders: Record<string, unknown>[],
  lineScores: Record<string, unknown>[],
  teamA: string,
  teamB: string
) {
  return gameHeaders.find((header) => {
    const gameId = String(header.GAME_ID ?? "");
    const homeTeamId = Number(header.HOME_TEAM_ID ?? 0);
    const awayTeamId = Number(header.VISITOR_TEAM_ID ?? 0);
    const lines = lineScores.filter((line) => String(line.GAME_ID ?? "") === gameId);
    const homeLine = lines.find((line) => Number(line.TEAM_ID ?? 0) === homeTeamId);
    const awayLine = lines.find((line) => Number(line.TEAM_ID ?? 0) === awayTeamId);

    if (!homeLine || !awayLine) {
      return false;
    }

    const homeName = buildTeamName(homeLine);
    const awayName = buildTeamName(awayLine);
    const homeAbbr = String(homeLine.TEAM_ABBREVIATION ?? "").trim();
    const awayAbbr = String(awayLine.TEAM_ABBREVIATION ?? "").trim();

    return (
      (matchesTeamInput(teamA, homeName, homeAbbr) &&
        matchesTeamInput(teamB, awayName, awayAbbr)) ||
      (matchesTeamInput(teamA, awayName, awayAbbr) &&
        matchesTeamInput(teamB, homeName, homeAbbr))
    );
  });
}

async function findClosestMatchDate(
  teamA: string,
  teamB: string,
  date: string
): Promise<string | null> {
  for (let distance = 1; distance <= MAX_SUGGESTION_DISTANCE_DAYS; distance += 1) {
    for (const nearbyDate of [shiftIsoDate(date, -distance), shiftIsoDate(date, distance)]) {
      const nearbyPayload = await fetchNbaJson(buildScoreboardUrl(nearbyDate));
      const nearbyHeaders = rowObjects(nearbyPayload, "GameHeader");
      const nearbyLines = rowObjects(nearbyPayload, "LineScore");
      const nearbyMatch = findMatchOnDate(nearbyHeaders, nearbyLines, teamA, teamB);

      if (nearbyMatch) {
        return nearbyDate;
      }
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const teamA = request.nextUrl.searchParams.get("teamA")?.trim() ?? "";
  const teamB = request.nextUrl.searchParams.get("teamB")?.trim() ?? "";
  const date = request.nextUrl.searchParams.get("date")?.trim() ?? "";

  if (!teamA || !teamB || !date) {
    return NextResponse.json(
      { error: "Team one, team two, and date are required." },
      { status: 400 }
    );
  }

  try {
    const payload = await fetchNbaJson(buildScoreboardUrl(date));
    const gameHeaders = rowObjects(payload, "GameHeader");
    const lineScores = rowObjects(payload, "LineScore");
    const match = findMatchOnDate(gameHeaders, lineScores, teamA, teamB);

    if (!match) {
      const closestDate = await findClosestMatchDate(teamA, teamB, date);

      if (closestDate) {
        return NextResponse.json(
          {
            error: `No NBA game found for ${teamA} vs ${teamB} on ${date}. A matching game was found on ${closestDate} instead.`,
            suggestedDate: closestDate,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `No NBA game found for ${teamA} vs ${teamB} on ${date}.` },
        { status: 404 }
      );
    }

    const gameId = String(match.GAME_ID ?? "");
    const homeTeamId = Number(match.HOME_TEAM_ID ?? 0);
    const awayTeamId = Number(match.VISITOR_TEAM_ID ?? 0);
    const lines = lineScores.filter((line) => String(line.GAME_ID ?? "") === gameId);
    const homeLine = lines.find((line) => Number(line.TEAM_ID ?? 0) === homeTeamId);
    const awayLine = lines.find((line) => Number(line.TEAM_ID ?? 0) === awayTeamId);

    if (!homeLine || !awayLine) {
      return NextResponse.json(
        { error: "NBA scoreboard data was missing team line scores for this game." },
        { status: 502 }
      );
    }

    const seasonType = deriveSeasonTypeFromGameId(gameId);
    const season = deriveSeasonFromDate(date);
    const homeTeamAbbr = String(homeLine.TEAM_ABBREVIATION ?? "").trim();
    const awayTeamAbbr = String(awayLine.TEAM_ABBREVIATION ?? "").trim();
    const homeTeamName = buildTeamName(homeLine);
    const awayTeamName = buildTeamName(awayLine);
    const homeScore = Number(homeLine.PTS ?? 0);
    const awayScore = Number(awayLine.PTS ?? 0);
    const meta: GameMeta = {
      id: gameId,
      label: `${awayTeamAbbr} at ${homeTeamAbbr}`,
      description: `${homeTeamAbbr} ${homeScore}, ${awayTeamAbbr} ${awayScore}.`,
      season,
      seasonType,
      homeTeamName,
      awayTeamName,
      homeTeamAbbr,
      awayTeamAbbr,
      homeScore,
      awayScore,
      date: toDisplayDate(date),
      venue: buildVenue(match),
      gameLabel: seasonType === "Playoffs" ? "PLAYOFFS" : "REGULAR SEASON",
      seasonDisplay: formatSeasonDisplay(season, seasonType),
    };

    return NextResponse.json({ game: meta });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to reach the NBA API right now.";

    return NextResponse.json(
      {
        error: `${message} The live NBA API can block some networks, so try again from a normal home or office connection if needed.`,
      },
      { status: 502 }
    );
  }
}
