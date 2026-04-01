export interface Shot {
  gameId: string;
  playerId: number;
  playerName: string;
  teamId: number;
  teamName: string;
  period: number;
  minutesRemaining: number;
  secondsRemaining: number;
  eventType: string;
  actionType: string;
  shotType: string;
  shotZoneBasic: string;
  shotDistance: number;
  locX: number;
  locY: number;
  shotMade: boolean;
  gameDate: string;
  htm: string;
  vtm: string;
}

type NbaResultSet = {
  name: string;
  headers: string[];
  rowSet: unknown[][];
};

type NbaResponse = {
  resultSets?: NbaResultSet[];
};

export function parseNBAResponse(data: NbaResponse): Shot[] {
  const resultSet = data?.resultSets?.find((rs) => rs.name === "Shot_Chart_Detail");
  if (!resultSet) return [];

  const headers: string[] = resultSet.headers;
  const idx = (key: string) => headers.indexOf(key);

  return resultSet.rowSet.map((row): Shot => ({
    gameId: String(row[idx("GAME_ID")]),
    playerId: Number(row[idx("PLAYER_ID")]),
    playerName: String(row[idx("PLAYER_NAME")]),
    teamId: Number(row[idx("TEAM_ID")]),
    teamName: String(row[idx("TEAM_NAME")]),
    period: Number(row[idx("PERIOD")]),
    minutesRemaining: Number(row[idx("MINUTES_REMAINING")]),
    secondsRemaining: Number(row[idx("SECONDS_REMAINING")]),
    eventType: String(row[idx("EVENT_TYPE")]),
    actionType: String(row[idx("ACTION_TYPE")]),
    shotType: String(row[idx("SHOT_TYPE")]),
    shotZoneBasic: String(row[idx("SHOT_ZONE_BASIC")]),
    shotDistance: Number(row[idx("SHOT_DISTANCE")]),
    locX: Number(row[idx("LOC_X")]),
    locY: Number(row[idx("LOC_Y")]),
    shotMade: row[idx("SHOT_MADE_FLAG")] === 1,
    gameDate: String(row[idx("GAME_DATE")]),
    htm: String(row[idx("HTM")]),
    vtm: String(row[idx("VTM")]),
  }));
}

export interface GameSummary {
  totalFGA: number;
  totalFGM: number;
  fgPct: number;
  homeTeamId: number;
  awayTeamId: number;
}

export function summarizeGame(shots: Shot[], homeTeamName: string): GameSummary {
  const homeShot = shots.find((s) => s.teamName === homeTeamName);
  const homeTeamId = homeShot?.teamId ?? 0;
  const allTeamIds = Array.from(new Set(shots.map((s) => s.teamId)));
  const awayTeamId = allTeamIds.find((id) => id !== homeTeamId) ?? 0;

  const totalFGA = shots.length;
  const totalFGM = shots.filter((s) => s.shotMade).length;

  return {
    totalFGA,
    totalFGM,
    fgPct: totalFGA > 0 ? totalFGM / totalFGA : 0,
    homeTeamId,
    awayTeamId,
  };
}
