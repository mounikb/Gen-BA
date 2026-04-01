# Fields of Hoops — Claude Code Project Prompt

## What we're building

A generative art poster web app that transforms NBA game shot data into abstract, beautiful poster compositions. Think "Fields of Chess" (https://fieldsofchess.com) but for basketball.

The reference site takes chess PGN notation and generates stunning abstract posters from the moves. We're doing the same thing with NBA shot chart data — every game becomes a unique piece of generative art.

**The output should look like wall art, NOT a data visualization.** No axes, no legends, no court outlines. The data drives the composition abstractly — color fields, geometric blocks, accent marks — arranged on a dark canvas that feels like a premium print poster.

---

## Reference: Fields of Chess

- **URL**: https://fieldsofchess.com
- **Colophon**: https://fieldsofchess.com/colophon
- **Stack**: Next.js, Tailwind CSS, HTML Canvas, hosted on Vercel
- **Font**: Departure Mono (https://departuremono.com/)
- **How it works**:
  1. User enters PGN (chess move notation) or picks a famous game
  2. Selects a visual theme (classic, lumon, fields)
  3. App parses moves and generates an abstract poster on Canvas
  4. User can download or copy the poster

**Key design qualities to match:**
- Dark background (near-black)
- Bold, confident color blocks — not subtle or pastel
- Minimal, elegant typography (monospace, small, lots of letter-spacing)
- The art dominates, text is secondary
- Clean layout: title at top, art in middle, game metadata at bottom
- Feels like something you'd frame and hang on a wall
- NO data visualization elements (no axes, legends, grid labels, court lines)

---

## Data Source: NBA Stats API

### Primary Endpoint: ShotChartDetail

**Base URL:**
```
https://stats.nba.com/stats/shotchartdetail
```

**Required Headers** (the API rejects requests without proper headers):
```javascript
{
  "Host": "stats.nba.com",
  "Referer": "https://www.nba.com/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token": "true"
}
```

**Example API call to get all shots from a specific game:**
```
https://stats.nba.com/stats/shotchartdetail?ContextMeasure=FGA&GameID=0041500407&LastNGames=0&LeagueID=00&Month=0&OpponentTeamID=0&Period=0&PlayerID=0&PlayerPosition=&Season=2015-16&SeasonSegment=&SeasonType=Playoffs&TeamID=0&VsConference=&VsDivision=
```

Setting `PlayerID=0` and `TeamID=0` returns ALL shots from both teams in that game.
Setting `ContextMeasure=FGA` returns both makes and misses (default `PTS` only returns makes).

### Response Shape

The API returns two result sets. The one we care about is `Shot_Chart_Detail`:

```json
{
  "resultSets": [
    {
      "name": "Shot_Chart_Detail",
      "headers": [
        "GRID_TYPE", "GAME_ID", "GAME_EVENT_ID", "PLAYER_ID", "PLAYER_NAME",
        "TEAM_ID", "TEAM_NAME", "PERIOD", "MINUTES_REMAINING", "SECONDS_REMAINING",
        "EVENT_TYPE", "ACTION_TYPE", "SHOT_TYPE", "SHOT_ZONE_BASIC", "SHOT_ZONE_AREA",
        "SHOT_ZONE_RANGE", "SHOT_DISTANCE", "LOC_X", "LOC_Y",
        "SHOT_ATTEMPTED_FLAG", "SHOT_MADE_FLAG", "GAME_DATE", "HTM", "VTM"
      ],
      "rowSet": [
        ["Shot Chart Detail", "0041500407", 2, 201567, "Kevin Love",
         1610612739, "Cleveland Cavaliers", 1, 11, 22,
         "Made Shot", "Cutting Layup Shot", "2PT Field Goal", "Restricted Area", "Center(C)",
         "Less Than 8 ft.", 1, 7, 14,
         1, 1, "20160619", "CLE", "GSW"],
        // ... more rows
      ]
    },
    {
      "name": "LeagueAverages",
      "headers": ["GRID_TYPE", "SHOT_ZONE_BASIC", "SHOT_ZONE_AREA", "SHOT_ZONE_RANGE", "FGA", "FGM", "FG_PCT"],
      "rowSet": [/* league averages by zone */]
    }
  ]
}
```

### Key fields for our generative art:

| Field | Description | How to use it |
|-------|-------------|---------------|
| `LOC_X` | Horizontal position on court (-250 to 250, 0 = center) | X coordinate for placement |
| `LOC_Y` | Vertical position on court (-50 to 900, 0 = basket) | Y coordinate for placement |
| `SHOT_MADE_FLAG` | 1 = made, 0 = missed | Solid fill vs outline/ring or opacity |
| `PERIOD` | Quarter (1-4, 5+ for OT) | Vertical section / row of the poster |
| `SHOT_DISTANCE` | Distance from basket in feet | Size of shape |
| `SHOT_TYPE` | "2PT Field Goal" or "3PT Field Goal" | Shape type or color intensity |
| `SHOT_ZONE_BASIC` | "Restricted Area", "In The Paint", "Mid-Range", "Above the Break 3", "Left Corner 3", "Right Corner 3", "Backcourt" | Zone-based color mapping |
| `TEAM_NAME` / `TEAM_ID` | Which team took the shot | Warm vs cool color palette |
| `EVENT_TYPE` | "Made Shot" or "Missed Shot" | Same as SHOT_MADE_FLAG |
| `ACTION_TYPE` | "Dunk", "Layup", "Jump Shot", "Pullup Jump Shot", etc. | Could influence shape |
| `MINUTES_REMAINING` / `SECONDS_REMAINING` | Time left in the quarter | Horizontal position within a quarter row |

### Court coordinate system:
- `LOC_X` ranges from -250 (left sideline) to 250 (right sideline)
- `LOC_Y` ranges from -50 (behind basket) to ~900 (far end)
- The basket is at (0, 0)
- Three-point line is roughly at LOC_Y ~90-240 depending on angle
- Units are in 1/10th of a foot

### Important Game IDs for curated presets:

| Game | Game ID | Season | Description |
|------|---------|--------|-------------|
| 2016 NBA Finals Game 7 | 0041500407 | 2015-16 | CLE 93-89 GSW — The Block, The Shot, The Stop |
| Kobe's Final Game (60 pts) | 0021501228 | 2015-16 | LAL 101-96 UTA — Kobe's 60-point farewell |
| Warriors 73-9 Record Game | 0021500796 | 2015-16 | GSW clinches 73-9 |
| Dame's 50-pt Playoff Game | 0041800174 | 2018-19 | POR vs OKC — The wave goodbye |
| Booker's 70-Point Game | 0021600827 | 2016-17 | PHX vs BOS — Booker scores 70 |
| Klay's 37-Point Quarter | 0021400587 | 2014-15 | GSW vs SAC — 37 in Q3 |

Note: Verify all Game IDs before hardcoding — the format is:
- `002YYYNNNN` for regular season (YYY = season start year offset, NNNN = game number)
- `004YYYRRNN` for playoffs (RR = round, NN = game number)

---

## CRITICAL: CORS and IP Blocking

### The NBA Stats API CANNOT be called from the browser.

1. **CORS**: nba.com does not send CORS headers, so browser fetch() will fail.
2. **IP Blocking**: NBA blocks requests from cloud providers (AWS, Vercel, Heroku, etc.).

### Solution: Next.js API Route as Proxy

Create a server-side API route in Next.js that proxies requests to the NBA API. For development, this works from your local machine. For production/deployment, you have two options:

**Option A (Recommended for MVP): Pre-fetch and bundle game data as static JSON**
- Write a local script that fetches shot data for your curated games
- Save the responses as JSON files in `/public/games/` or similar
- The app reads from these static files — no API calls needed at runtime
- This completely avoids CORS and IP blocking issues
- Add a "Custom Game" feature later that uses the proxy approach

**Option B: Server-side API route proxy**
```javascript
// app/api/shots/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');

  const response = await fetch(
    `https://stats.nba.com/stats/shotchartdetail?ContextMeasure=FGA&GameID=${gameId}&LastNGames=0&LeagueID=00&Month=0&OpponentTeamID=0&Period=0&PlayerID=0&Season=2015-16&SeasonType=Playoffs&TeamID=0`,
    {
      headers: {
        "Host": "stats.nba.com",
        "Referer": "https://www.nba.com/",
        "User-Agent": "Mozilla/5.0",
        "x-nba-stats-origin": "stats",
        "x-nba-stats-token": "true"
      }
    }
  );

  const data = await response.json();
  return Response.json(data);
}
```

**Go with Option A for the MVP.** Pre-fetch 6-10 iconic games, ship them as static JSON. You can always add live API lookup later.

---

## Tech Stack

- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Rendering**: HTML Canvas (preferred, same as Fields of Chess) or SVG
- **Font**: Departure Mono (https://departuremono.com/) — same as Fields of Chess, or use a similar monospace
- **Hosting**: Vercel

---

## App Structure & UX Flow

Mirror the Fields of Chess flow exactly:

```
1. Pick a game
   - Curated list of famous games (like the preset PGN buttons)
   - (Future: search by team/date or enter Game ID)

2. Select a theme
   - 3 themes with distinct color palettes and composition styles

3. Get poster
   - Canvas renders the generative art
   - Download button (PNG export from canvas)
   - Copy button (copies canvas to clipboard)
```

### Page Layout (single page app):
```
┌─────────────────────────────────┐
│  FIELDS OF HOOPS (small, top)   │
│                                 │
│  1. Pick a game                 │
│  [Game 7 2016] [Kobe 60] [...]  │
│                                 │
│  2. Select theme                │
│  [● court] [○ neon] [○ ember]   │
│                                 │
│  3. Get poster                  │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │    [GENERATED POSTER]     │  │
│  │                           │  │
│  └───────────────────────────┘  │
│  [Download]  [Copy]             │
│                                 │
│  Colophon · Twitter             │
│  By [your name]                 │
└─────────────────────────────────┘
```

---

## Generative Art Algorithm — Design Direction

This is the creative core. The algorithm takes the shot data array and produces abstract art. Here's the approach:

### Composition: Zone-Based Grid

Divide the poster canvas into a grid. Each cell corresponds to a **court zone** (not a literal court). The data fills this grid:

1. **Group shots by SHOT_ZONE_BASIC** → "Restricted Area", "In The Paint", "Mid-Range", "Above the Break 3", "Left Corner 3", "Right Corner 3"
2. **For each zone, compute:**
   - Total FGA (field goal attempts) → determines the SIZE of the block
   - FG% (made/attempted) → determines the COLOR INTENSITY
   - Which team dominated the zone → determines WARM vs COOL color
3. **Arrange blocks on canvas** in a grid-like composition where:
   - Paint/restricted area → large central blocks
   - Mid-range → medium blocks flanking the center
   - Three-point zones → horizontal bands or edge blocks
   - Corner threes → accent blocks at edges
4. **Layer by quarter (PERIOD):**
   - The poster reads top-to-bottom through Q1 → Q4
   - Each quarter section has its own zone breakdown
   - This means the same game with a hot Q1 and cold Q4 will look very different from an even game

### Visual Encoding:

| Data property | Visual mapping |
|--------------|----------------|
| Shot volume (FGA from zone) | Rectangle size |
| Shooting % (FG% from zone) | Color saturation / opacity |
| Team | Color hue (warm = home, cool = away) |
| Quarter | Vertical position on poster |
| 3PT vs 2PT | Color temperature or shape treatment |
| Individual highlight shots (buzzer beaters, and-1s) | Small bright accent squares (gold/yellow) |

### Accent marks for highlight moments:
Detect notable shots from the data:
- Shots in final 30 seconds of any quarter with SHOT_MADE_FLAG=1
- Very long distance shots (SHOT_DISTANCE > 28)
- These get rendered as small gold/bright accent squares overlaid on the composition

### Theme Variations:

**Theme 1: "Court"** — Warm palette
- Background: #080810 (near-black)
- Warm team: Deep reds, burnt orange (#D4412A, #E8593C, #F2A663)
- Cool team: Navy, steel blue (#0D2840, #1E5A8C, #2A7AB8)
- Accents: Gold (#FCDE5A)

**Theme 2: "Neon"** — Electric palette
- Background: #050510
- Team 1: Electric purple, magenta (#7B2FBE, #C850C0, #E8A0E8)
- Team 2: Cyan, electric blue (#00D4FF, #0088CC, #004466)
- Accents: White (#FFFFFF)

**Theme 3: "Ember"** — Monochrome warm
- Background: #0A0604
- All shots: Gradient from deep maroon to bright orange (#2A0A0A → #E85D24 → #FCDE5A)
- Made shots: Brighter/more saturated
- Missed shots: Darker/muted
- Accents: Bright white

---

## Poster Layout on Canvas

```
┌──────────────────────────────────┐
│                                  │
│  FIELDS OF HOOPS (10px, tracked) │  ← small title, heavy letter-spacing
│                                  │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  │   [GENERATIVE ART GRID]   │  │  ← the abstract composition fills this area
│  │   Q1 zone blocks           │  │
│  │   Q2 zone blocks           │  │
│  │   Q3 zone blocks           │  │
│  │   Q4 zone blocks           │  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  CLE 93        (large, bold)     │  ← winning team score, prominent
│  GSW 89        (large, muted)    │  ← losing team score, dimmed
│                                  │
│            GAME 7  (right-aligned)│
│       2016 NBA FINALS            │
│        JUN 19 2016               │
│  ─────────────────────────────── │  ← thin rule
│  83 FGA · 36 FGM · 43.4%        │  ← tiny footer stats
│              ORACLE ARENA, CA    │
└──────────────────────────────────┘
```

---

## Implementation Order

Build in this sequence:

### Phase 1: Static data + Canvas rendering
1. Set up Next.js project with Tailwind
2. Create the page layout (single page, dark theme)
3. Pre-fetch and save 3-4 game JSON files as static data
4. Build the generative algorithm: takes shot array → draws on Canvas
5. Wire up: select game → parse JSON → render poster

### Phase 2: Themes + polish
6. Implement 3 theme color palettes
7. Add theme selector UI
8. Refine the algorithm until every game looks beautiful
9. Add download (canvas.toDataURL) and copy-to-clipboard buttons
10. Typography polish — Departure Mono or similar monospace font

### Phase 3: More games + future features
11. Add more curated games (aim for 10-15 iconic games)
12. Add colophon page
13. (Optional) Add Game ID input for power users
14. (Optional) Add API proxy route for live game lookups

---

## File Structure

```
fields-of-hoops/
├── app/
│   ├── page.tsx              # Main single-page app
│   ├── layout.tsx            # Root layout with font + metadata
│   ├── colophon/
│   │   └── page.tsx          # About/credits page
│   └── api/
│       └── shots/
│           └── route.ts      # (Future) NBA API proxy
├── components/
│   ├── PosterCanvas.tsx      # Canvas component that renders the poster
│   ├── GameSelector.tsx      # Curated game picker buttons
│   ├── ThemeSelector.tsx     # Theme radio buttons
│   └── DownloadButtons.tsx   # Download PNG + Copy buttons
├── lib/
│   ├── generatePoster.ts     # Core algorithm: shot data → canvas drawing
│   ├── parseShots.ts         # Parse NBA API response into clean shot objects
│   ├── themes.ts             # Theme color definitions
│   └── games.ts              # Curated game metadata (names, IDs, descriptions)
├── data/
│   └── games/                # Pre-fetched game JSON files
│       ├── 0041500407.json   # 2016 Finals Game 7
│       ├── 0021501228.json   # Kobe's Final Game
│       └── ...
├── public/
│   └── fonts/                # Departure Mono or chosen font
├── tailwind.config.ts
└── package.json
```

---

## Key Technical Notes

- Canvas poster dimensions: 600×900px (2:3 ratio, portrait) at 2x for retina = 1200×1800 actual pixels
- Use `canvas.toBlob()` for download, `navigator.clipboard.write()` for copy
- The NBA API response has headers and rowSet separately — you'll need to zip them together into objects
- `LOC_X` and `LOC_Y` don't need to map to literal positions — they inform which zone a shot belongs to, and the zone drives the visual
- For the curated game list, store metadata (team names, score, date, description) alongside the Game ID in `games.ts`
- Pre-fetching script: write a simple Node.js script that fetches each curated game's data and saves to `/data/games/[gameId].json`

---

## Summary

Build a Next.js app that generates abstract art posters from NBA game shot data. Pre-fetch famous games as static JSON to avoid API issues. Use HTML Canvas to render zone-based geometric compositions. Offer 3 visual themes. Make it feel like https://fieldsofchess.com — minimal UI, maximum art, poster-quality output.
