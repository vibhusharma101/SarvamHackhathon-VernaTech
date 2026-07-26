"use client";

import { use, useCallback, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { SpokenLanguage } from "@/lib/types";
import { SessionStream } from "@/lib/ws";

import { AudioPlayback } from "./components/AudioPlayback";
import { ConsentGate } from "./components/ConsentGate";
import { FileUploadFallback } from "./components/FileUploadFallback";
import { LanguagePicker } from "./components/LanguagePicker";
import { MicCapture } from "./components/MicCapture";
import { TranscriptView, type TranscriptLine } from "./components/TranscriptView";

type Stage = "language" | "consent" | "live" | "complete";

export default function ScreenPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);

  const [stage, setStage] = useState<Stage>("language");
  const [language, setLanguage] = useState<SpokenLanguage | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [agentAudio, setAgentAudio] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  const streamRef = useRef<SessionStream | null>(null);

  const startLive = useCallback(() => {
    if (!language) return;
    setStage("live");
    setMicActive(true);

    const stream = new SessionStream(sessionId, language, {
      onTranscript: (e) =>
        setLines((prev) => {
          const withoutInterim = prev.filter((l) => l.turnIdx !== e.turn_idx || l.isFinal);
          return [...withoutInterim, { turnIdx: e.turn_idx, text: e.text, isFinal: e.is_final }];
        }),
      onAgentSpeaking: (e) => setAgentAudio(e.audio_b64),
      onBargeInAck: () => setAgentAudio(null), // C5: stop playback mid-sentence
      onScreenComplete: () => {
        setStage("complete");
        setMicActive(false);
      },
    });
    streamRef.current = stream;
  }, [language, sessionId]);

  const handleMicFrame = useCallback((frame: ArrayBuffer) => {
    streamRef.current?.sendAudioFrame(frame);
  }, []);

  const handleFallbackFile = useCallback(
    async (file: File) => {
      // Same pipeline, same scorecard, no mic permission needed (C8).
      await api.uploadFallbackAudio(sessionId, file);
      await api.score(sessionId);
      setStage("complete");
    },
    [sessionId]
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Technical screen</h1>

      {stage === "language" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Pick the language you&apos;d like to answer in.</p>
          <LanguagePicker value={language} onChange={setLanguage} />
          <button
            type="button"
            disabled={!language}
            onClick={() => setStage("consent")}
            className="w-fit rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            Continue
          </button>
        </div>
      )}

      {stage === "consent" && <ConsentGate onConsent={startLive} />}

      {stage === "live" && (
        <div className="flex flex-col gap-4">
          {!useFallback ? (
            <>
              <MicCapture active={micActive} onFrame={handleMicFrame} />
              <button type="button" className="w-fit text-xs underline" onClick={() => setUseFallback(true)}>
                Switch to file upload instead
              </button>
            </>
          ) : (
            <FileUploadFallback onFileSelected={handleFallbackFile} />
          )}
          <TranscriptView lines={lines} />
          <AudioPlayback audioB64={agentAudio} />
        </div>
      )}

      {stage === "complete" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Screen complete. Thank you — the recruiter will follow up.
        </p>
      )}
    </main>
  );
}
