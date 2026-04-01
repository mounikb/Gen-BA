"use client";

import { useRef } from "react";

interface DownloadButtonsProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gameLabel: string;
}

export default function DownloadButtons({ canvasRef, gameLabel }: DownloadButtonsProps) {
  const copyStatusRef = useRef<HTMLSpanElement>(null);

  function getCanvas() {
    return canvasRef.current;
  }

  function handleDownload() {
    const canvas = getCanvas();
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fields-of-hoops-${gameLabel.toLowerCase().replace(/\s+/g, "-")}.png`;
        a.click();
        URL.revokeObjectURL(url);
      },
      "image/png"
    );
  }

  async function handleCopy() {
    const canvas = getCanvas();
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      if (copyStatusRef.current) {
        copyStatusRef.current.textContent = "Copied!";
        setTimeout(() => {
          if (copyStatusRef.current) copyStatusRef.current.textContent = "Copy";
        }, 2000);
      }
    } catch {
      if (copyStatusRef.current) {
        copyStatusRef.current.textContent = "Copy failed";
        setTimeout(() => {
          if (copyStatusRef.current) copyStatusRef.current.textContent = "Copy";
        }, 2000);
      }
    }
  }

  const btnClass =
    "px-4 py-2.5 border border-[#46424c]/30 bg-[#fbf9f3] text-[#4a4751] text-[11px] tracking-[0.22em] uppercase font-mono hover:border-[#46424c] hover:bg-[#efebe3] transition-all duration-150";

  return (
    <div className="flex flex-wrap gap-3">
      <button onClick={handleDownload} className={btnClass}>
        Download PNG
      </button>
      <button onClick={handleCopy} className={btnClass}>
        <span ref={copyStatusRef}>Copy</span>
      </button>
    </div>
  );
}
