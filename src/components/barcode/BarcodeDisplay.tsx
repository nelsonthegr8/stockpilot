"use client";

import { useEffect, useRef } from "react";

interface BarcodeDisplayProps {
  value: string;
}

export function BarcodeDisplay({ value }: BarcodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    
    async function render() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const bwipjs = require("bwip-js") as typeof import("bwip-js");
        bwipjs.toCanvas(canvasRef.current!, {
          bcid: "code128",
          text: value,
          scale: 2,
          height: 10,
          includetext: true,
          textxalign: "center",
        });
      } catch (e) {
        console.error("Barcode render error", e);
      }
    }
    render();
  }, [value]);

  return <canvas ref={canvasRef} style={{ maxWidth: "100%" }} />;
}
