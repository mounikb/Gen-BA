export interface GameMeta {
  id: string;
  label: string;
  description: string;
  season: string;
  seasonType: "Regular Season" | "Playoffs";
  homeTeamName: string;
  awayTeamName: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  homeScore: number;
  awayScore: number;
  date: string;
  venue: string;
  gameLabel: string;
  seasonDisplay: string;
}

export const CURATED_GAMES: GameMeta[] = [
  {
    id: "0041500407",
    label: "2016 Finals Game 7",
    description: "The Block. The Shot. The Stop.",
    season: "2015-16",
    seasonType: "Playoffs",
    homeTeamName: "Cleveland Cavaliers",
    awayTeamName: "Golden State Warriors",
    homeTeamAbbr: "CLE",
    awayTeamAbbr: "GSW",
    homeScore: 93,
    awayScore: 89,
    date: "JUN 19, 2016",
    venue: "ORACLE ARENA  Â·  OAKLAND, CA",
    gameLabel: "GAME 7",
    seasonDisplay: "2015â€“16 NBA FINALS",
  },
  {
    id: "0021501228",
    label: "Kobe's 60-Point Farewell",
    description: "Mamba out. 60 points in the final game.",
    season: "2015-16",
    seasonType: "Regular Season",
    homeTeamName: "Los Angeles Lakers",
    awayTeamName: "Utah Jazz",
    homeTeamAbbr: "LAL",
    awayTeamAbbr: "UTA",
    homeScore: 101,
    awayScore: 96,
    date: "APR 13, 2016",
    venue: "STAPLES CENTER  Â·  LOS ANGELES, CA",
    gameLabel: "FINAL GAME",
    seasonDisplay: "2015â€“16 REGULAR SEASON",
  },
  {
    id: "0021600827",
    label: "Booker's 70-Point Game",
    description: "The youngest to score 70. Devin Booker.",
    season: "2016-17",
    seasonType: "Regular Season",
    homeTeamName: "Phoenix Suns",
    awayTeamName: "Boston Celtics",
    homeTeamAbbr: "PHX",
    awayTeamAbbr: "BOS",
    homeScore: 130,
    awayScore: 120,
    date: "MAR 24, 2017",
    venue: "TALKING STICK RESORT ARENA  Â·  PHOENIX, AZ",
    gameLabel: "REGULAR SEASON",
    seasonDisplay: "2016â€“17 REGULAR SEASON",
  },
  {
    id: "0021400587",
    label: "Klay's 37-Point Quarter",
    description: "37 points in one quarter. A record that still stands.",
    season: "2014-15",
    seasonType: "Regular Season",
    homeTeamName: "Golden State Warriors",
    awayTeamName: "Sacramento Kings",
    homeTeamAbbr: "GSW",
    awayTeamAbbr: "SAC",
    homeScore: 126,
    awayScore: 101,
    date: "JAN 23, 2015",
    venue: "ORACLE ARENA  Â·  OAKLAND, CA",
    gameLabel: "REGULAR SEASON",
    seasonDisplay: "2014â€“15 REGULAR SEASON",
  },
];
