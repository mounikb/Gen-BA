"use client";

import { Theme, ThemeId, THEMES, THEME_ORDER } from "@/lib/themes";

interface ThemeSelectorProps {
  selectedId: ThemeId;
  onSelect: (theme: Theme) => void;
}

const THEME_PREVIEWS: Record<ThemeId, { swatch1: string; swatch2: string }> = {
  vanilla: { swatch1: "#D96B3B", swatch2: "#2F6FCA" },
  court: { swatch1: "#E8593C", swatch2: "#1E6AAC" },
  neon: { swatch1: "#C850C0", swatch2: "#00D4FF" },
  ember: { swatch1: "#E85D24", swatch2: "#FCDE5A" },
};

export default function ThemeSelector({ selectedId, onSelect }: ThemeSelectorProps) {
  return (
    <div className="flex gap-3">
      {THEME_ORDER.map((id) => {
        const theme = THEMES[id];
        const isSelected = id === selectedId;
        const { swatch1, swatch2 } = THEME_PREVIEWS[id];
        return (
          <button
            key={id}
            onClick={() => onSelect(theme)}
            className={[
              "flex items-center gap-2 px-3 py-2 border transition-all duration-150",
              "text-xs tracking-widest uppercase font-mono",
              isSelected
                ? "border-white/30 bg-white/10 text-white"
                : "border-white/10 bg-transparent text-white/40 hover:border-white/20 hover:text-white/70",
            ].join(" ")}
          >
            <span className="flex gap-0.5 shrink-0">
              <span
                className="w-2 h-3 block"
                style={{ backgroundColor: swatch1 }}
              />
              <span
                className="w-2 h-3 block"
                style={{ backgroundColor: swatch2 }}
              />
            </span>
            {theme.name}
          </button>
        );
      })}
    </div>
  );
}
