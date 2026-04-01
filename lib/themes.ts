import { resolveVanillaGameColors } from "./teamColors";
import { GameMeta } from "./games";

export type ThemeId = "vanilla" | "court" | "neon" | "ember";

export interface Theme {
  id: ThemeId;
  name: string;
  background: string;
  homeColors: string[];
  awayColors: string[];
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  dividerColor: string;
  quarterGapColor: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  vanilla: {
    id: "vanilla",
    name: "Vanilla",
    background: "#0b0a10",
    homeColors: ["#D96B3B", "#C95528", "#7C2A17", "#32110B"],
    awayColors: ["#3B7DD9", "#2C62B3", "#173564", "#0B1732"],
    accentColor: "#FFE27A",
    textPrimary: "#F7F4ED",
    textSecondary: "#766F86",
    dividerColor: "#161321",
    quarterGapColor: "#0C0A14",
  },
  court: {
    id: "court",
    name: "Court",
    background: "#080810",
    homeColors: ["#F2A663", "#E8593C", "#C03020", "#8A1A0D"],
    awayColors: ["#4A9ED8", "#1E6AAC", "#0D3A6A", "#071E3D"],
    accentColor: "#FCDE5A",
    textPrimary: "#FFFFFF",
    textSecondary: "#555575",
    dividerColor: "#14142A",
    quarterGapColor: "#0C0C1A",
  },
  neon: {
    id: "neon",
    name: "Neon",
    background: "#050510",
    homeColors: ["#EAA8EA", "#C850C0", "#8E22A0", "#5A1070"],
    awayColors: ["#00D4FF", "#0088CC", "#004A88", "#002244"],
    accentColor: "#FFFFFF",
    textPrimary: "#FFFFFF",
    textSecondary: "#3A3A5A",
    dividerColor: "#0A0A20",
    quarterGapColor: "#080818",
  },
  ember: {
    id: "ember",
    name: "Ember",
    background: "#0A0604",
    homeColors: ["#FCDE5A", "#E85D24", "#A03010", "#4A1005"],
    awayColors: ["#FCDE5A", "#E85D24", "#A03010", "#4A1005"],
    accentColor: "#FFFFFF",
    textPrimary: "#FFFFFF",
    textSecondary: "#3A2810",
    dividerColor: "#150A05",
    quarterGapColor: "#0D0805",
  },
};

export const THEME_ORDER: ThemeId[] = ["vanilla", "court", "neon", "ember"];

export function resolveThemeForGame(theme: Theme, game: GameMeta): Theme {
  if (theme.id !== "vanilla") {
    return theme;
  }

  const vanilla = resolveVanillaGameColors(game.homeTeamAbbr, game.awayTeamAbbr);

  return {
    ...theme,
    homeColors: vanilla.homePalette,
    awayColors: vanilla.awayPalette,
    accentColor: vanilla.usedAlternate
      ? vanilla.home.away
      : vanilla.away.away,
    textSecondary: vanilla.usedAlternate
      ? "#8A839A"
      : "#756E85",
    dividerColor: "#161321",
    quarterGapColor: "#0C0A14",
  };
}
