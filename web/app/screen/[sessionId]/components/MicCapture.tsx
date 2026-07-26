"use client";

import { useEffect, useRef, useState } from "react";

import { startMicCapture, type MicCaptureHandle } from "@/lib/audio";

export function MicCapture({ onFrame, active }: { onFrame: (frame: ArrayBuffer) => void; active: boolean }) {
  const handleRef = useRef<MicCaptureHandle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      handleRef.current?.stop();
      handleRef.current = null;
      return;
    }

    startMicCapture(onFrame)
      .then((handle) => {
        handleRef.current = handle;
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "microphone unavailable");
      });

    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, [active, onFrame]);

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#C0392B] font-medium">
        <span>⚠</span> Mic unavailable ({error}) — use file upload instead.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm font-medium text-[#111111]">
      <div className="relative flex h-2.5 w-2.5 items-center justify-center">
        {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0F5D5A] opacity-75"></span>}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${active ? "bg-[#0F5D5A]" : "bg-[#8A8A8A]"}`} />
      </div>
      {active ? "Listening intently…" : "Mic off"}
    </div>
  );
}
