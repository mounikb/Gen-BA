"use client";

import { GameMeta } from "@/lib/games";

interface GameSelectorProps {
  games: GameMeta[];
  selectedId: string;
  onSelect: (game: GameMeta) => void;
}

export default function GameSelector({
  games,
  selectedId,
  onSelect,
}: GameSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {games.map((game) => {
        const isSelected = game.id === selectedId;
        return (
          <button
            key={game.id}
            onClick={() => onSelect(game)}
            className={[
              "px-3 py-2 text-left transition-all duration-150",
              "border text-xs tracking-widest uppercase font-mono",
              isSelected
                ? "border-white/30 bg-white/10 text-white"
                : "border-white/10 bg-transparent text-white/40 hover:border-white/20 hover:text-white/70",
            ].join(" ")}
          >
            <span className="block leading-tight">{game.label}</span>
            <span className="block mt-0.5 text-[10px] tracking-wide normal-case opacity-60">
              {game.homeTeamAbbr} {game.homeScore} · {game.awayTeamAbbr} {game.awayScore}
            </span>
          </button>
        );
      })}
    </div>
  );
}
