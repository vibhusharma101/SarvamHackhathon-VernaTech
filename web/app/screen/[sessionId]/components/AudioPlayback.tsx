"use client";

import { useEffect } from "react";

import { playBase64Audio } from "@/lib/audio";

/** Plays each new agent utterance as it arrives. Barge-in (C5) is handled by
 * the parent stopping the audio element / AudioContext on `barge_in_ack` —
 * see screen/[sessionId]/page.tsx. */
export function AudioPlayback({ audioB64 }: { audioB64: string | null }) {
  useEffect(() => {
    if (!audioB64) return;
    playBase64Audio(audioB64).catch(() => {
      // Playback failure is non-fatal — transcript still renders.
    });
  }, [audioB64]);

  return null;
}
