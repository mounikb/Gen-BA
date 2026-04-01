import { GameMeta } from "./games";
import { Shot } from "./parseShots";
import { resolveThemeForGame, Theme } from "./themes";

const COURT_X_MIN = -252;
const COURT_X_MAX = 252;
const COURT_Y_MAX = 820;
const UNIT_COLS = 12;
const UNIT_ROWS = 18;

const Y_BREAKS: [number, number][] = [
  [-52, 0.0],
  [50, 0.3],
  [220, 0.7],
  [820, 1.0],
];

const BAND_TEMPLATES: number[][] = [
  [2, 1, 1, 1, 3, 1, 2, 3, 1, 2, 1],
  [1, 2, 1, 1, 3, 1, 3, 2, 1, 2, 1],
  [2, 1, 1, 2, 3, 1, 2, 2, 1, 2, 1],
  [2, 1, 2, 1, 3, 1, 2, 3, 1, 1, 1],
];

const WIDTH_PATTERNS: Record<number, number[][]> = {
  1: [
    [4, 4, 4],
    [5, 3, 4],
    [4, 3, 3, 2],
    [3, 4, 3, 2],
    [2, 3, 4, 3],
    [3, 2, 4, 3],
  ],
  2: [
    [4, 4, 4],
    [4, 3, 3, 2],
    [2, 3, 4, 3],
    [3, 4, 2, 3],
    [2, 5, 2, 3],
    [3, 2, 3, 4],
  ],
  3: [
    [2, 4, 3, 3],
    [3, 5, 4],
    [4, 4, 4],
    [2, 3, 3, 4],
    [3, 3, 2, 4],
  ],
};

const EDGE_PATTERNS: number[][] = [
  [5, 3, 4],
  [6, 3, 3],
  [4, 4, 4],
  [3, 5, 2, 2],
];

const CENTER_PATTERNS: Record<number, number[][]> = {
  2: [
    [2, 4, 2, 4],
    [1, 3, 4, 1, 3],
    [2, 3, 4, 3],
  ],
  3: [
    [1, 2, 5, 1, 3],
    [2, 5, 2, 3],
    [3, 5, 1, 3],
    [2, 2, 4, 1, 3],
  ],
};

type CellOwner = "home" | "away" | "neutral";

interface ShotPoint {
  teamId: number;
  playerName: string;
  locX: number;
  locY: number;
  shotMade: boolean;
  highlight: boolean;
  col: number;
  row: number;
}

interface GridCell {
  homeMakes: number;
  awayMakes: number;
  homeAttempts: number;
  awayAttempts: number;
  homeMakeInfluence: number;
  awayMakeInfluence: number;
  homeAttemptInfluence: number;
  awayAttemptInfluence: number;
  signal: number;
}

interface RawBlock {
  col: number;
  row: number;
  width: number;
  height: number;
}

interface BlockMetrics extends RawBlock {
  confidence: number;
  signal: number;
  attemptDensity: number;
  makeDensity: number;
  homeMakeInfluence: number;
  awayMakeInfluence: number;
  homeAttemptInfluence: number;
  awayAttemptInfluence: number;
}

interface GameProfile {
  averageEnergy: number;
  averageConfidence: number;
  averageAttemptDensity: number;
}

interface PosterBlock extends RawBlock {
  owner: CellOwner;
  color: string;
  confidence: number;
  signal: number;
  attemptDensity: number;
  makeDensity: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
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

function mixMany(colors: string[]): string {
  const [r, g, b] = colors.reduce(
    (acc, color) => {
      const [cr, cg, cb] = hexToRgb(color);
      return [acc[0] + cr, acc[1] + cg, acc[2] + cb] as [number, number, number];
    },
    [0, 0, 0] as [number, number, number]
  );

  return rgbToHex(r / colors.length, g / colors.length, b / colors.length);
}

function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);

  return rgbToHex(
    ar + (br - ar) * t,
    ag + (bg - ag) * t,
    ab + (bb - ab) * t
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function remapY(locY: number): number {
  for (let i = 1; i < Y_BREAKS.length; i += 1) {
    const [y0, f0] = Y_BREAKS[i - 1];
    const [y1, f1] = Y_BREAKS[i];

    if (locY <= y1) {
      const t = (locY - y0) / (y1 - y0);
      return f0 + t * (f1 - f0);
    }
  }

  return 1;
}

function invertRemapY(frac: number): number {
  for (let i = 1; i < Y_BREAKS.length; i += 1) {
    const [y0, f0] = Y_BREAKS[i - 1];
    const [y1, f1] = Y_BREAKS[i];

    if (frac <= f1) {
      const t = (frac - f0) / Math.max(f1 - f0, 0.0001);
      return y0 + t * (y1 - y0);
    }
  }

  return COURT_Y_MAX;
}

function toCanvasCoords(
  locX: number,
  locY: number,
  artX: number,
  artY: number,
  artW: number,
  artH: number
): [number, number] {
  const xRatio = (locX - COURT_X_MIN) / (COURT_X_MAX - COURT_X_MIN);
  const yRatio = remapY(locY);

  return [artX + xRatio * artW, artY + artH - yRatio * artH];
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function nextSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

function detectTeams(shots: Shot[], game: GameMeta) {
  const teamMap = new Map<number, string>();
  for (const shot of shots) {
    teamMap.set(shot.teamId, shot.teamName);
  }

  let homeTeamId = 0;
  let awayTeamId = 0;

  for (const [id, name] of teamMap) {
    if (name === game.homeTeamName) {
      homeTeamId = id;
    } else if (name === game.awayTeamName) {
      awayTeamId = id;
    }
  }

  if (!homeTeamId || !awayTeamId) {
    const ids = Array.from(teamMap.keys());
    homeTeamId = homeTeamId || ids[0] || 0;
    awayTeamId = awayTeamId || ids.find((id) => id !== homeTeamId) || homeTeamId;
  }

  return { homeTeamId, awayTeamId };
}

function createNeutralColor(theme: Theme): string {
  return mixMany([
    theme.homeColors[0],
    theme.homeColors[2],
    theme.awayColors[3],
    theme.background,
  ]);
}

function mapShots(shots: Shot[]): ShotPoint[] {
  return shots.map((shot) => {
    const xRatio = clamp(
      (shot.locX - COURT_X_MIN) / (COURT_X_MAX - COURT_X_MIN),
      0,
      0.999999
    );
    const yRatio = clamp(remapY(shot.locY), 0, 0.999999);

    return {
      teamId: shot.teamId,
      playerName: shot.playerName,
      locX: shot.locX,
      locY: shot.locY,
      shotMade: shot.shotMade,
      highlight:
        shot.shotMade &&
        (shot.shotDistance >= 27 ||
          (shot.period === 4 &&
            shot.minutesRemaining === 0 &&
            shot.secondsRemaining <= 45)),
      col: Math.floor(xRatio * UNIT_COLS),
      row: UNIT_ROWS - 1 - Math.floor(yRatio * UNIT_ROWS),
    };
  });
}

function buildGrid(shotPoints: ShotPoint[], homeTeamId: number): GridCell[][] {
  const cells = Array.from({ length: UNIT_ROWS }, () =>
    Array.from({ length: UNIT_COLS }, (): GridCell => ({
      homeMakes: 0,
      awayMakes: 0,
      homeAttempts: 0,
      awayAttempts: 0,
      homeMakeInfluence: 0,
      awayMakeInfluence: 0,
      homeAttemptInfluence: 0,
      awayAttemptInfluence: 0,
      signal: 0,
    }))
  );

  for (const point of shotPoints) {
    const cell = cells[point.row][point.col];
    if (point.teamId === homeTeamId) {
      cell.homeAttempts += 1;
      if (point.shotMade) {
        cell.homeMakes += 1;
      }
    } else {
      cell.awayAttempts += 1;
      if (point.shotMade) {
        cell.awayMakes += 1;
      }
    }
  }

  const madeShots = shotPoints.filter((point) => point.shotMade);

  for (let row = 0; row < UNIT_ROWS; row += 1) {
    for (let col = 0; col < UNIT_COLS; col += 1) {
      const cell = cells[row][col];
      const xRatio = (col + 0.5) / UNIT_COLS;
      const yRatio = 1 - (row + 0.5) / UNIT_ROWS;
      const centerX = COURT_X_MIN + xRatio * (COURT_X_MAX - COURT_X_MIN);
      const centerY = invertRemapY(yRatio);

      for (const point of shotPoints) {
        const dx = (point.locX - centerX) / 76;
        const dy = (point.locY - centerY) / 96;
        const distSq = dx * dx + dy * dy;

        if (distSq > 5.8) {
          continue;
        }

        const attemptInfluence = 1 / (1 + distSq * 1.18);
        if (point.teamId === homeTeamId) {
          cell.homeAttemptInfluence += attemptInfluence;
        } else {
          cell.awayAttemptInfluence += attemptInfluence;
        }
      }

      for (const point of madeShots) {
        const dx = (point.locX - centerX) / 72;
        const dy = (point.locY - centerY) / 90;
        const distSq = dx * dx + dy * dy;

        if (distSq > 4.4) {
          continue;
        }

        const makeInfluence = 1 / (1 + distSq * 1.45);
        if (point.teamId === homeTeamId) {
          cell.homeMakeInfluence += makeInfluence;
        } else {
          cell.awayMakeInfluence += makeInfluence;
        }
      }

      const directAttempts = cell.homeAttempts + cell.awayAttempts;
      const attemptEnergy = cell.homeAttemptInfluence + cell.awayAttemptInfluence;
      const makeEnergy = cell.homeMakeInfluence + cell.awayMakeInfluence;
      cell.signal = clamp(
        attemptEnergy * 0.62 +
          makeEnergy * 0.22 +
          directAttempts * 0.16,
        0,
        2.2
      );
    }
  }

  return cells;
}

function choosePattern(height: number, index: number, totalBands: number, seed: number): number[] {
  const middle = Math.floor(totalBands / 2);
  const nearMiddle = Math.abs(index - middle) <= 1;
  const nearEdge = index <= 1 || index >= totalBands - 2;

  if (nearMiddle && CENTER_PATTERNS[height]?.length) {
    const patterns = CENTER_PATTERNS[height];
    return patterns[seed % patterns.length];
  }

  if (nearEdge && height === 1) {
    return EDGE_PATTERNS[seed % EDGE_PATTERNS.length];
  }

  const patterns = WIDTH_PATTERNS[height] ?? WIDTH_PATTERNS[1];
  return patterns[seed % patterns.length];
}

function buildRawBlocks(gameId: string): RawBlock[] {
  let seed = hashString(gameId);
  const template = BAND_TEMPLATES[seed % BAND_TEMPLATES.length];
  const blocks: RawBlock[] = [];
  let row = 0;

  for (let index = 0; index < template.length; index += 1) {
    const height = template[index];
    const pattern = choosePattern(height, index, template.length, seed);
    let col = 0;

    for (const width of pattern) {
      blocks.push({ col, row, width, height });
      col += width;
    }

    row += height;
    seed = nextSeed(seed);
  }

  return blocks;
}

function measureBlock(block: RawBlock, cells: GridCell[][]): BlockMetrics {
  let homeMakeInfluence = 0;
  let awayMakeInfluence = 0;
  let homeAttemptInfluence = 0;
  let awayAttemptInfluence = 0;
  let homeAttempts = 0;
  let awayAttempts = 0;
  let homeMakes = 0;
  let awayMakes = 0;
  let signal = 0;

  for (let row = block.row; row < block.row + block.height; row += 1) {
    for (let col = block.col; col < block.col + block.width; col += 1) {
      const cell = cells[row][col];
      homeMakeInfluence += cell.homeMakeInfluence;
      awayMakeInfluence += cell.awayMakeInfluence;
      homeAttemptInfluence += cell.homeAttemptInfluence;
      awayAttemptInfluence += cell.awayAttemptInfluence;
      homeAttempts += cell.homeAttempts;
      awayAttempts += cell.awayAttempts;
      homeMakes += cell.homeMakes;
      awayMakes += cell.awayMakes;
      signal += cell.signal;
    }
  }

  const area = block.width * block.height;
  const avgHomeMakeInfluence = homeMakeInfluence / area;
  const avgAwayMakeInfluence = awayMakeInfluence / area;
  const avgHomeAttemptInfluence = homeAttemptInfluence / area;
  const avgAwayAttemptInfluence = awayAttemptInfluence / area;
  const avgAttempts = (homeAttempts + awayAttempts) / area;
  const avgMakes = (homeMakes + awayMakes) / area;
  const avgSignal = signal / area;
  const makeTotal = avgHomeMakeInfluence + avgAwayMakeInfluence;
  const attemptTotal = avgHomeAttemptInfluence + avgAwayAttemptInfluence;
  const confidence =
    makeTotal > 0.05
      ? Math.abs(avgHomeMakeInfluence - avgAwayMakeInfluence) / makeTotal
      : attemptTotal > 0
        ? (Math.abs(avgHomeAttemptInfluence - avgAwayAttemptInfluence) / attemptTotal) * 0.55
        : 0;

  return {
    ...block,
    confidence,
    signal: avgSignal,
    attemptDensity: avgAttempts,
    makeDensity: avgMakes,
    homeMakeInfluence: avgHomeMakeInfluence,
    awayMakeInfluence: avgAwayMakeInfluence,
    homeAttemptInfluence: avgHomeAttemptInfluence,
    awayAttemptInfluence: avgAwayAttemptInfluence,
  };
}

function buildGameProfile(metrics: BlockMetrics[]): GameProfile {
  const activeMetrics = metrics.filter((metric) => metric.signal > 0.05);
  const source = activeMetrics.length > 0 ? activeMetrics : metrics;
  const averageEnergy =
    source.reduce((sum, metric) => sum + metric.signal, 0) / Math.max(source.length, 1);
  const averageConfidence =
    source.reduce((sum, metric) => sum + metric.confidence, 0) /
    Math.max(source.length, 1);
  const averageAttemptDensity =
    source.reduce((sum, metric) => sum + metric.attemptDensity, 0) /
    Math.max(source.length, 1);

  return {
    averageEnergy: Math.max(averageEnergy, 0.12),
    averageConfidence: Math.max(averageConfidence, 0.08),
    averageAttemptDensity: Math.max(averageAttemptDensity, 0.08),
  };
}

function scoreBlock(
  metrics: BlockMetrics,
  theme: Theme,
  profile: GameProfile
): PosterBlock {
  const neutralColor = createNeutralColor(theme);
  const makeLead = metrics.homeMakeInfluence - metrics.awayMakeInfluence;
  const attemptLead = metrics.homeAttemptInfluence - metrics.awayAttemptInfluence;
  const makeTotal = metrics.homeMakeInfluence + metrics.awayMakeInfluence;
  const energyRatio = metrics.signal / Math.max(profile.averageEnergy, 0.001);
  const confidenceFloor = clamp(profile.averageConfidence * 0.65, 0.06, 0.18);
  const isOuter =
    metrics.row <= 1 ||
    metrics.row + metrics.height >= UNIT_ROWS - 1 ||
    metrics.col === 0 ||
    metrics.col + metrics.width === UNIT_COLS;
  const lowSignal =
    energyRatio < (isOuter ? 0.68 : 0.52) &&
    metrics.attemptDensity < profile.averageAttemptDensity * 0.9;
  const closeBattle =
    makeTotal > 0.04 &&
    metrics.confidence < confidenceFloor;
  const sparseZone =
    metrics.attemptDensity < profile.averageAttemptDensity * 0.45 &&
    energyRatio < 0.82;
  const activeZone =
    energyRatio > 0.95 ||
    metrics.attemptDensity > profile.averageAttemptDensity * 1.05;
  const shouldNeutralize = lowSignal || sparseZone || (closeBattle && !activeZone);

  if (shouldNeutralize) {
    const leadColor =
      Math.abs(makeLead) > 0.02
        ? makeLead >= 0
          ? theme.homeColors[3]
          : theme.awayColors[3]
        : attemptLead >= 0
          ? theme.homeColors[3]
          : theme.awayColors[3];
    const neutralMix = mixMany([neutralColor, leadColor, theme.background]);
    const neutralTone = clamp((energyRatio - 0.35) * 0.18, 0.05, 0.28);

    return {
      ...metrics,
      owner: "neutral",
      color: lerpHex(neutralColor, neutralMix, neutralTone),
    };
  }

  const homeWins = Math.abs(makeLead) > 0.02 ? makeLead >= 0 : attemptLead >= 0;
  const palette = homeWins ? theme.homeColors : theme.awayColors;
  const rowDepth = metrics.row / (UNIT_ROWS - 1);
  const tone = clamp(
    0.1 +
      (1 - metrics.confidence) * 0.36 +
      rowDepth * 0.08 -
      Math.min(energyRatio, 1.6) * 0.08 -
      metrics.makeDensity * 0.05,
    0,
    0.58
  );

  return {
    ...metrics,
    owner: homeWins ? "home" : "away",
    color: lerpHex(palette[0], palette[2], tone),
  };
}

function splitRawBlock(block: RawBlock, gameId: string): RawBlock[] {
  const area = block.width * block.height;
  if (area < 4) {
    return [block];
  }

  const hash = hashString(`${gameId}:${block.row}:${block.col}:${block.width}:${block.height}`);

  if (block.width >= 4 && block.width >= block.height) {
    const leftWidth = clamp(Math.floor(block.width / 2) + (hash % 2), 1, block.width - 1);
    return [
      { ...block, width: leftWidth },
      {
        col: block.col + leftWidth,
        row: block.row,
        width: block.width - leftWidth,
        height: block.height,
      },
    ];
  }

  if (block.height >= 2) {
    const topHeight = clamp(Math.floor(block.height / 2) + (hash % 2), 1, block.height - 1);
    return [
      { ...block, height: topHeight },
      {
        col: block.col,
        row: block.row + topHeight,
        width: block.width,
        height: block.height - topHeight,
      },
    ];
  }

  return [block];
}

function refineNeutralBlocks(
  blocks: PosterBlock[],
  cells: GridCell[][],
  theme: Theme,
  profile: GameProfile,
  gameId: string
): PosterBlock[] {
  const refined: PosterBlock[] = [];

  for (const block of blocks) {
    const area = block.width * block.height;
    const shouldSplit =
      block.owner === "neutral" &&
      area >= 4 &&
      block.signal > profile.averageEnergy * 0.9 &&
      block.attemptDensity > profile.averageAttemptDensity * 0.8;

    if (!shouldSplit) {
      refined.push(block);
      continue;
    }

    const pieces = splitRawBlock(block, gameId);
    if (pieces.length === 1) {
      refined.push(block);
      continue;
    }

    for (const piece of pieces) {
      const metrics = measureBlock(piece, cells);
      refined.push(scoreBlock(metrics, theme, profile));
    }
  }

  return refined;
}

function canMergeVertical(a: PosterBlock, b: PosterBlock): boolean {
  return (
    a.col === b.col &&
    a.width === b.width &&
    a.row + a.height === b.row &&
    a.owner === b.owner &&
    Math.abs(a.confidence - b.confidence) < 0.12 &&
    Math.abs(a.signal - b.signal) < 0.14 &&
    (a.owner !== "neutral" || a.height + b.height <= 2)
  );
}

function mergeVerticalBlocks(blocks: PosterBlock[]): PosterBlock[] {
  const sorted = [...blocks].sort(
    (a, b) => a.col - b.col || a.width - b.width || a.row - b.row
  );
  const merged: PosterBlock[] = [];

  for (const block of sorted) {
    const prev = merged[merged.length - 1];
    if (prev && canMergeVertical(prev, block)) {
      const prevArea = prev.width * prev.height;
      const nextArea = block.width * block.height;
      const totalArea = prevArea + nextArea;
      prev.height += block.height;
      prev.color = mixMany([prev.color, block.color]);
      prev.confidence =
        (prev.confidence * prevArea + block.confidence * nextArea) / totalArea;
      prev.signal = (prev.signal * prevArea + block.signal * nextArea) / totalArea;
      prev.attemptDensity =
        (prev.attemptDensity * prevArea + block.attemptDensity * nextArea) / totalArea;
      prev.makeDensity =
        (prev.makeDensity * prevArea + block.makeDensity * nextArea) / totalArea;
    } else {
      merged.push({ ...block });
    }
  }

  return merged.sort((a, b) => a.row - b.row || a.col - b.col);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: {
    size: number;
    color: string;
    align?: CanvasTextAlign;
    tracking?: number;
    weight?: string;
  }
) {
  ctx.save();
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align ?? "left";
  ctx.textBaseline = "top";
  ctx.font = `${opts.weight ?? "normal"} ${opts.size}px "Geist Mono", monospace`;

  if (opts.tracking && opts.tracking > 0) {
    const chars = text.split("");
    let cursorX = x;

    if (opts.align === "right") {
      let totalWidth = 0;
      for (const ch of chars) {
        totalWidth += ctx.measureText(ch).width + opts.tracking;
      }
      cursorX = x - totalWidth + opts.tracking;
    } else if (opts.align === "center") {
      let totalWidth = 0;
      for (const ch of chars) {
        totalWidth += ctx.measureText(ch).width + opts.tracking;
      }
      cursorX = x - totalWidth / 2;
    }

    for (const ch of chars) {
      ctx.fillText(ch, cursorX, y);
      cursorX += ctx.measureText(ch).width + opts.tracking;
    }
  } else {
    ctx.fillText(text, x, y);
  }

  ctx.restore();
}

function drawGhostBlocks(
  ctx: CanvasRenderingContext2D,
  blocks: PosterBlock[],
  theme: Theme,
  artX: number,
  artY: number,
  cellW: number,
  cellH: number
) {
  for (const block of blocks) {
    const area = block.width * block.height;
    if (block.owner === "neutral" || area < 5 || block.confidence < 0.5) {
      continue;
    }

    const hash = hashString(`${block.row}:${block.col}:${block.width}:${block.height}`);
    if (hash % 3 !== 0) {
      continue;
    }

    const x = artX + block.col * cellW + 12 + (hash % 10);
    const y = artY + block.row * cellH + 12 + ((hash >> 4) % 10);
    const w = Math.max(block.width * cellW * 0.34, 18);
    const h = Math.max(block.height * cellH * 0.28, 18);

    ctx.save();
    ctx.globalAlpha = 0.2 + Math.min(block.signal, 1) * 0.08;
    ctx.fillStyle = lerpHex(block.color, theme.background, 0.4);
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
}

export function generatePoster(
  canvas: HTMLCanvasElement,
  shots: Shot[],
  game: GameMeta,
  theme: Theme,
  highlightPlayer?: string
) {
  const activeTheme = resolveThemeForGame(theme, game);
  const W = 600;
  const H = 900;
  const SCALE = 2;
  const PAD_X = 28;
  const ART_TOP = 82;
  const ART_BOTTOM = 736;
  const ART_W = W - PAD_X * 2;
  const ART_H = ART_BOTTOM - ART_TOP;
  const GAP = 2;

  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.resetTransform();
  ctx.scale(SCALE, SCALE);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = activeTheme.background;
  ctx.fillRect(0, 0, W, H);

  const filteredShots = shots.filter((shot) => shot.period >= 1 && shot.period <= 4);
  const { homeTeamId, awayTeamId } = detectTeams(filteredShots, game);
  const shotPoints = mapShots(filteredShots);
  const cells = buildGrid(shotPoints, homeTeamId);
  const rawBlocks = buildRawBlocks(game.id);
  const blockMetrics = rawBlocks.map((block) => measureBlock(block, cells));
  const profile = buildGameProfile(blockMetrics);
  const scoredBlocks = blockMetrics.map((metrics) => scoreBlock(metrics, activeTheme, profile));
  const mergedBlocks = mergeVerticalBlocks(scoredBlocks);
  const blocks = refineNeutralBlocks(mergedBlocks, cells, activeTheme, profile, game.id);
  const cellW = ART_W / UNIT_COLS;
  const cellH = ART_H / UNIT_ROWS;

  ctx.save();
  ctx.fillStyle = lerpHex(activeTheme.background, activeTheme.dividerColor, 0.58);
  ctx.fillRect(PAD_X - 1, ART_TOP - 1, ART_W + 2, ART_H + 2);

  for (const block of blocks) {
    const x = PAD_X + block.col * cellW + GAP / 2;
    const y = ART_TOP + block.row * cellH + GAP / 2;
    const w = block.width * cellW - GAP;
    const h = block.height * cellH - GAP;

    ctx.fillStyle = block.color;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = lerpHex(block.color, activeTheme.background, 0.46);
    ctx.lineWidth = block.owner === "neutral" ? 0.8 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  ctx.restore();

  drawGhostBlocks(ctx, blocks, activeTheme, PAD_X, ART_TOP, cellW, cellH);

  ctx.save();
  ctx.shadowColor = activeTheme.accentColor;
  ctx.shadowBlur = 9;
  ctx.fillStyle = activeTheme.accentColor;

  for (const point of shotPoints.filter((shot) => shot.highlight).slice(0, 10)) {
    const [x, y] = toCanvasCoords(point.locX, point.locY, PAD_X, ART_TOP, ART_W, ART_H);
    ctx.fillRect(x - 5, y - 5, 10, 10);
  }

  ctx.restore();

  drawText(ctx, "FIELDS OF HOOPS", W / 2, 24, {
    size: 10,
    color: lerpHex(activeTheme.textSecondary, activeTheme.textPrimary, 0.35),
    align: "center",
    tracking: 4,
  });

  const footerTop = 764;
  ctx.strokeStyle = activeTheme.dividerColor;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(PAD_X, footerTop - 8);
  ctx.lineTo(W - PAD_X, footerTop - 8);
  ctx.stroke();

  const homeWon = game.homeScore >= game.awayScore;
  drawText(ctx, game.homeTeamAbbr, PAD_X, footerTop, {
    size: 24,
    color: homeWon ? activeTheme.textPrimary : activeTheme.textSecondary,
    weight: "bold",
  });
  drawText(ctx, `${game.homeScore}`, PAD_X + 74, footerTop - 1, {
    size: 25,
    color: homeWon ? activeTheme.textPrimary : activeTheme.textSecondary,
    weight: "bold",
  });
  drawText(ctx, game.awayTeamAbbr, PAD_X, footerTop + 32, {
    size: 24,
    color: !homeWon ? activeTheme.textPrimary : activeTheme.textSecondary,
    weight: "bold",
  });
  drawText(ctx, `${game.awayScore}`, PAD_X + 74, footerTop + 31, {
    size: 25,
    color: !homeWon ? activeTheme.textPrimary : activeTheme.textSecondary,
    weight: "bold",
  });

  drawText(ctx, game.gameLabel, W - PAD_X, footerTop + 4, {
    size: 12,
    color: lerpHex(activeTheme.textSecondary, activeTheme.textPrimary, 0.34),
    align: "right",
    tracking: 0.9,
  });
  drawText(ctx, game.seasonDisplay, W - PAD_X, footerTop + 22, {
    size: 10.5,
    color: lerpHex(activeTheme.textSecondary, activeTheme.textPrimary, 0.3),
    align: "right",
    tracking: 0.4,
  });
  drawText(ctx, game.date, W - PAD_X, footerTop + 36, {
    size: 10.5,
    color: lerpHex(activeTheme.textSecondary, activeTheme.textPrimary, 0.3),
    align: "right",
    tracking: 0.4,
  });
  if (highlightPlayer?.trim()) {
    drawText(ctx, `MVP ${highlightPlayer.toUpperCase()}`, W - PAD_X, footerTop + 50, {
      size: 9.75,
      color: lerpHex(activeTheme.textSecondary, activeTheme.textPrimary, 0.3),
      align: "right",
      tracking: 0.3,
    });
  }

  const totalFGA = filteredShots.length;
  const totalFGM = filteredShots.filter((shot) => shot.shotMade).length;
  const fgPct = totalFGA > 0 ? ((totalFGM / totalFGA) * 100).toFixed(1) : "--";
  const homeMakes = filteredShots.filter(
    (shot) => shot.teamId === homeTeamId && shot.shotMade
  ).length;
  const awayMakes = filteredShots.filter(
    (shot) => shot.teamId === awayTeamId && shot.shotMade
  ).length;

  drawText(
    ctx,
    `${homeMakes} HOME MAKES  ${awayMakes} AWAY MAKES  ${totalFGM}/${totalFGA} FG  ${fgPct}%`,
    PAD_X,
    H - 46,
    {
      size: 9.75,
      color: lerpHex(activeTheme.textSecondary, activeTheme.textPrimary, 0.28),
      tracking: 0.25,
    }
  );
  drawText(ctx, game.venue, W - PAD_X, H - 46, {
    size: 9.75,
    color: lerpHex(activeTheme.textSecondary, activeTheme.textPrimary, 0.28),
    align: "right",
    tracking: 0.12,
  });
  drawText(ctx, game.description.toUpperCase(), PAD_X, H - 22, {
    size: 9.25,
    color: lerpHex(activeTheme.textSecondary, activeTheme.textPrimary, 0.26),
    tracking: 0.4,
  });
}
