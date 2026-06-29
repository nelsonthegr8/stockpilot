"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function BarcodeScanner({ onScan, placeholder = "Scan or type barcode…", autoFocus }: BarcodeScannerProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // USB scanner keyboard wedge: listens for rapid keystrokes ending in Enter
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;

    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now();
      const target = e.target as HTMLElement;
      
      // Only capture if the target is not an input/textarea (we handle those separately)
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "Enter" && buffer.length > 0) {
        onScan(buffer);
        buffer = "";
        return;
      }

      if (now - lastKeyTime < 50) {
        // Rapid keystroke — scanner input
        buffer += e.key;
      } else {
        buffer = e.key;
      }
      lastKeyTime = now;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      onScan(value.trim());
      setValue("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="font-mono"
      />
      <Button type="submit" variant="outline">Scan</Button>
    </form>
  );
}
