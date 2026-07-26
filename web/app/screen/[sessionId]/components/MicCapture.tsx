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
        // C8 fallback: no mic permission -> caller should switch to FileUploadFallback.
        setError(err instanceof Error ? err.message : "microphone unavailable");
      });

    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, [active, onFrame]);

  if (error) {
    return <p className="text-sm text-amber-700 dark:text-amber-400">Mic unavailable ({error}) — use file upload instead.</p>;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span className={`h-2 w-2 rounded-full ${active ? "bg-red-500 animate-pulse" : "bg-zinc-300 dark:bg-zinc-700"}`} />
      {active ? "Listening…" : "Mic off"}
    </div>
  );
}
