"use client";

import { forwardRef, useEffect, useRef } from "react";
import { Shot } from "@/lib/parseShots";
import { Theme } from "@/lib/themes";
import { GameMeta } from "@/lib/games";
import { generatePoster } from "@/lib/generatePoster";

interface PosterCanvasProps {
  shots: Shot[];
  game: GameMeta;
  theme: Theme;
  highlightPlayer?: string;
}

const PosterCanvas = forwardRef<HTMLCanvasElement, PosterCanvasProps>(
  function PosterCanvas({ shots, game, theme, highlightPlayer }, ref) {
    const internalRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = ref ?? internalRef;

    useEffect(() => {
      const canvas =
        typeof canvasRef === "function" ? null : canvasRef.current;
      if (!canvas || shots.length === 0) return;
      document.fonts.ready.then(() => {
        generatePoster(canvas, shots, game, theme, highlightPlayer);
      });
    }, [shots, game, theme, highlightPlayer]);

    return (
      <canvas
        ref={canvasRef}
        className="mx-auto block w-full max-w-[680px] border border-black/10 bg-white shadow-[0_28px_60px_rgba(0,0,0,0.08)]"
        style={{ aspectRatio: "2 / 3", height: "auto" }}
        aria-label={`Generative art poster for ${game.label}`}
      />
    );
  }
);

export default PosterCanvas;
