import { NextRequest, NextResponse } from "next/server";
import { buildShotChartUrl, fetchNbaJson, findResultSet } from "@/lib/nbaApi";
import { GameMeta } from "@/lib/games";

export async function GET(request: NextRequest) {
  const gameId = request.nextUrl.searchParams.get("gameId")?.trim() ?? "";
  const season = request.nextUrl.searchParams.get("season")?.trim() ?? "";
  const seasonType = request.nextUrl.searchParams.get("seasonType")?.trim() as GameMeta["seasonType"] | "";

  if (!gameId || !season || !seasonType) {
    return NextResponse.json(
      { error: "gameId, season, and seasonType are required." },
      { status: 400 }
    );
  }

  try {
    const payload = await fetchNbaJson(buildShotChartUrl(gameId, season, seasonType));
    const shotSet = findResultSet(payload, "Shot_Chart_Detail");

    if (!shotSet?.rowSet?.length) {
      return NextResponse.json(
        { error: "The NBA API returned no shot data for this game." },
        { status: 404 }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load shot data from the NBA API.";

    return NextResponse.json(
      {
        error: `${message} The live NBA API can block some networks, so try again from a normal home or office connection if needed.`,
      },
      { status: 502 }
    );
  }
}
