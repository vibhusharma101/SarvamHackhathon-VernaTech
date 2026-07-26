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
      onBargeInAck: () => setAgentAudio(null),
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
      await api.uploadFallbackAudio(sessionId, file);
      await api.score(sessionId);
      setStage("complete");
    },
    [sessionId]
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-[#FAFAF8] p-8 text-[#111111] animate-fade-in">
      <header className="border-b border-[#E8E8E3] pb-4">
        <h1 className="font-serif text-3xl font-medium text-[#111111]">Technical screen</h1>
        {stage !== "complete" && (
          <div className="mt-4 flex items-center gap-2 text-xs font-mono text-[#5C5C5C]">
            <span className={stage === "language" ? "text-[#111111] font-medium" : ""}>Language</span>
            <span className="text-[#8A8A8A]">/</span>
            <span className={stage === "consent" ? "text-[#111111] font-medium" : ""}>Consent</span>
            <span className="text-[#8A8A8A]">/</span>
            <span className={stage === "live" ? "text-[#111111] font-medium" : ""}>Session</span>
          </div>
        )}
      </header>

      <div className="animate-slide-up flex flex-col gap-6">
        {stage === "language" && (
          <div className="flex flex-col gap-6 bg-[#FFFFFF] p-8 border border-[#E8E8E3]">
            <p className="text-base text-[#111111]">Choose the language you&apos;d prefer to communicate in.</p>
            <LanguagePicker value={language} onChange={setLanguage} />
            <button
              type="button"
              disabled={!language}
              onClick={() => setStage("consent")}
              className="mt-4 w-fit bg-[#0F5D5A] px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0B4B48] disabled:opacity-40 disabled:hover:bg-[#0F5D5A]"
            >
              Continue
            </button>
          </div>
        )}

        {stage === "consent" && <ConsentGate onConsent={startLive} />}

        {stage === "live" && (
          <div className="flex flex-col gap-6 stagger">
            {!useFallback ? (
              <div className="flex items-center justify-between bg-[#FFFFFF] p-4 border border-[#E8E8E3]">
                <MicCapture active={micActive} onFrame={handleMicFrame} />
                <button type="button" className="text-xs font-medium text-[#0F5D5A] hover:text-[#0B4B48] underline underline-offset-4" onClick={() => setUseFallback(true)}>
                  Switch to file upload instead
                </button>
              </div>
            ) : (
              <FileUploadFallback onFileSelected={handleFallbackFile} />
            )}
            <TranscriptView lines={lines} />
            <AudioPlayback audioB64={agentAudio} />
          </div>
        )}

        {stage === "complete" && (
          <div className="bg-[#FFFFFF] border border-[#E8E8E3] p-8 text-center animate-slide-up-sm">
            <h2 className="font-serif text-2xl text-[#111111] mb-2">Screen Complete</h2>
            <p className="text-base text-[#5C5C5C]">
              Thank you for your time. The recruiting team will follow up with you shortly.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
