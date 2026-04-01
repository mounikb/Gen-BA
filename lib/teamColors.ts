export interface TeamColorEntry {
  teamName: string;
  abbr: string;
  primary: string;
  away: string;
}

const FALLBACK_PRIMARY = "#d96b3b";
const FALLBACK_AWAY = "#2f6fca";

export const TEAM_COLOR_DATA: Record<string, TeamColorEntry> = {
  ATL: { teamName: "Atlanta Hawks", abbr: "ATL", primary: "#E03A3E", away: "#C1D32F" },
  BKN: { teamName: "Brooklyn Nets", abbr: "BKN", primary: "#000000", away: "#FFFFFF" },
  BOS: { teamName: "Boston Celtics", abbr: "BOS", primary: "#007A33", away: "#BA9653" },
  CHA: { teamName: "Charlotte Hornets", abbr: "CHA", primary: "#1D1160", away: "#00788C" },
  CHI: { teamName: "Chicago Bulls", abbr: "CHI", primary: "#CE1141", away: "#000000" },
  CLE: { teamName: "Cleveland Cavaliers", abbr: "CLE", primary: "#6F263D", away: "#FFB81C" },
  DAL: { teamName: "Dallas Mavericks", abbr: "DAL", primary: "#00538C", away: "#B8C4CA" },
  DEN: { teamName: "Denver Nuggets", abbr: "DEN", primary: "#0E2240", away: "#FEC524" },
  DET: { teamName: "Detroit Pistons", abbr: "DET", primary: "#C8102E", away: "#1D42BA" },
  GSW: { teamName: "Golden State Warriors", abbr: "GSW", primary: "#1D428A", away: "#FFC72C" },
  HOU: { teamName: "Houston Rockets", abbr: "HOU", primary: "#CE1141", away: "#000000" },
  IND: { teamName: "Indiana Pacers", abbr: "IND", primary: "#002D62", away: "#FDBB30" },
  LAC: { teamName: "Los Angeles Clippers", abbr: "LAC", primary: "#C8102E", away: "#1D428A" },
  LAL: { teamName: "Los Angeles Lakers", abbr: "LAL", primary: "#552583", away: "#FDB927" },
  MEM: { teamName: "Memphis Grizzlies", abbr: "MEM", primary: "#5D76A9", away: "#12173F" },
  MIA: { teamName: "Miami Heat", abbr: "MIA", primary: "#98002E", away: "#F9A01B" },
  MIL: { teamName: "Milwaukee Bucks", abbr: "MIL", primary: "#00471B", away: "#EEE1C6" },
  MIN: { teamName: "Minnesota Timberwolves", abbr: "MIN", primary: "#0C2340", away: "#236192" },
  NOP: { teamName: "New Orleans Pelicans", abbr: "NOP", primary: "#0C2340", away: "#C8102E" },
  NYK: { teamName: "New York Knicks", abbr: "NYK", primary: "#006BB6", away: "#F58426" },
  OKC: { teamName: "Oklahoma City Thunder", abbr: "OKC", primary: "#007AC1", away: "#EF3B24" },
  ORL: { teamName: "Orlando Magic", abbr: "ORL", primary: "#0077C0", away: "#C4CED4" },
  PHI: { teamName: "Philadelphia 76ers", abbr: "PHI", primary: "#006BB6", away: "#ED174C" },
  PHX: { teamName: "Phoenix Suns", abbr: "PHX", primary: "#1D1160", away: "#E56020" },
  POR: { teamName: "Portland Trail Blazers", abbr: "POR", primary: "#E03A3E", away: "#000000" },
  SAC: { teamName: "Sacramento Kings", abbr: "SAC", primary: "#5A2D81", away: "#63727A" },
  SAS: { teamName: "San Antonio Spurs", abbr: "SAS", primary: "#C4CED4", away: "#000000" },
  TOR: { teamName: "Toronto Raptors", abbr: "TOR", primary: "#CE1141", away: "#000000" },
  UTA: { teamName: "Utah Jazz", abbr: "UTA", primary: "#002B5C", away: "#F9A01B" },
  WAS: { teamName: "Washington Wizards", abbr: "WAS", primary: "#002B5C", away: "#E31837" },
};

export const TEAM_OPTIONS = Object.values(TEAM_COLOR_DATA)
  .flatMap((team) => [team.teamName, team.abbr])
  .sort((a, b) => a.localeCompare(b));

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "");
  return [
    parseInt(cleaned.slice(0, 2), 16),
    parseInt(cleaned.slice(2, 4), 16),
    parseInt(cleaned.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((value) =>
        Math.round(Math.max(0, Math.min(255, value)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);

  return rgbToHex(
    ar + (br - ar) * t,
    ag + (bg - ag) * t,
    ab + (bb - ab) * t
  );
}

function colorDistance(a: string, b: string): number {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);

  return Math.sqrt(
    Math.pow(ar - br, 2) +
      Math.pow(ag - bg, 2) +
      Math.pow(ab - bb, 2)
  );
}

function buildPalette(baseColor: string): string[] {
  return [
    mixHex(baseColor, "#ffffff", 0.18),
    baseColor,
    mixHex(baseColor, "#1a1620", 0.28),
    mixHex(baseColor, "#040406", 0.58),
  ];
}

export function getTeamColors(abbr: string): TeamColorEntry {
  return (
    TEAM_COLOR_DATA[abbr] ?? {
      teamName: abbr,
      abbr,
      primary: FALLBACK_PRIMARY,
      away: FALLBACK_AWAY,
    }
  );
}

export function resolveVanillaGameColors(homeAbbr: string, awayAbbr: string) {
  const home = getTeamColors(homeAbbr);
  const away = getTeamColors(awayAbbr);

  const combos = [
    {
      homeColor: home.primary,
      awayColor: away.primary,
      penalty: 0,
    },
    {
      homeColor: home.primary,
      awayColor: away.away,
      penalty: 10,
    },
    {
      homeColor: home.away,
      awayColor: away.primary,
      penalty: 10,
    },
    {
      homeColor: home.away,
      awayColor: away.away,
      penalty: 18,
    },
  ].map((combo) => ({
    ...combo,
    distance: colorDistance(combo.homeColor, combo.awayColor),
  }));

  const preferred = combos.find((combo) => combo.distance >= 92 && combo.penalty === 0);
  const best =
    preferred ??
    combos.sort(
      (a, b) => b.distance - b.penalty - (a.distance - a.penalty)
    )[0];

  return {
    home,
    away,
    homeColor: best.homeColor,
    awayColor: best.awayColor,
    homePalette: buildPalette(best.homeColor),
    awayPalette: buildPalette(best.awayColor),
    usedAlternate:
      best.homeColor !== home.primary || best.awayColor !== away.primary,
  };
}
