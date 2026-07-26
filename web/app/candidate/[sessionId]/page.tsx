"use client";

import { use, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { startMicCapture, type MicCaptureHandle } from "@/lib/audio";
import { InterviewSocket } from "@/lib/interviewWs";

type Status = "connecting" | "ready" | "recording" | "processing" | "complete" | "error";

const STATUS_COPY: Record<Status, string> = {
  connecting: "Establishing secure connection…",
  ready: "Ready when you are",
  recording: "Recording actively",
  processing: "Analyzing response…",
  complete: "Session Complete",
  error: "Connection Error",
};

const STATUS_DOT: Record<Status, string> = {
  connecting: "bg-[#E8E8E3]",
  ready: "bg-[#0F5D5A]",
  recording: "bg-[#C0392B]",
  processing: "bg-[#0A7A53]",
  complete: "bg-[#0F5D5A]",
  error: "bg-[#C0392B]",
};

interface QuestionState {
  idx: number;
  total: number;
  text: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  "en-IN": "English",
  "hi-IN": "Hindi",
  "te-IN": "Telugu",
  "ta-IN": "Tamil",
  "kn-IN": "Kannada",
  "ml-IN": "Malayalam",
  "bn-IN": "Bengali",
  "mr-IN": "Marathi",
  "gu-IN": "Gujarati",
  "pa-IN": "Punjabi",
  "od-IN": "Odia",
  unknown: "an unrecognized language",
};

export default function CandidatePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<Status>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionState | null>(null);
  const [scoringPassId, setScoringPassId] = useState<string | null>(null);
  const [languageToast, setLanguageToast] = useState<string | null>(null);

  const socketRef = useRef<InterviewSocket | null>(null);
  const micRef = useRef<MicCaptureHandle | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const forfeitSession = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;
    socketRef.current?.close();
    socketRef.current = null;
    setStarted(false);
    setStatus("ready");
    setErrorMessage(null);
    setQuestion(null);
    router.push("/");
  }, [router]);

  const startInterview = useCallback(() => {
    setStarted(true);
    setStatus("connecting");
    setErrorMessage(null);

    const socket = new InterviewSocket(sessionId);
    socket.onOpen(() => setStatus((s) => (s === "connecting" ? "ready" : s)));
    socket.onQuestion((q) => {
      setQuestion({ idx: q.idx, total: q.total, text: q.text });
      setStatus("ready");
    });
    socket.onAck((ack) => {
      if (ack.status === "processing") setStatus("processing");
      if (ack.status === "done") {
        // Fire-and-forget: informational only, no confirmation required —
        // it auto-dismisses and never blocks the interview from continuing.
        const label = LANGUAGE_NAMES[ack.language_code] ?? ack.language_code;
        setLanguageToast(`Detected language: ${label}`);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setLanguageToast(null), 3500);
      }
    });
    socket.onError((message) => {
      setStatus("error");
      setErrorMessage(message);
    });
    socket.onComplete((c) => {
      setStatus("complete");
      setScoringPassId(c.scoring_pass_id);
      if (c.error) setErrorMessage(c.error);
    });
    socketRef.current = socket;
  }, [sessionId]);

  const toggleRecording = useCallback(async () => {
    if (status === "connecting" || status === "processing" || status === "complete") return;

    if (status === "recording") {
      micRef.current?.stop();
      micRef.current = null;
      socketRef.current?.sendStop();
      return;
    }

    setErrorMessage(null);
    try {
      micRef.current = await startMicCapture((frame) => socketRef.current?.sendAudioFrame(frame));
      setStatus("recording");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Microphone unavailable.");
    }
  }, [status]);

  const isRecording = status === "recording";
  const isBusy = status === "connecting" || status === "processing";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-10 bg-[#FAFAF8] p-8 text-[#111111] animate-fade-in">
      <header className="text-center flex flex-col items-center gap-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#5C5C5C]">
          Technical screen
        </div>
        <p className="font-mono text-xs text-[#8A8A8A]">ID: {sessionId.slice(0, 8)}</p>
      </header>

      {!started ? (
        <button
          type="button"
          onClick={startInterview}
          className="mt-4 bg-[#0F5D5A] px-10 py-4 text-base font-medium text-white transition-colors hover:bg-[#0B4B48]"
        >
          Begin Technical Screen
        </button>
      ) : status === "complete" ? (
        <div className="flex flex-col items-center gap-4 text-center bg-[#FFFFFF] border border-[#E8E8E3] p-10 animate-slide-up">
          <h2 className="font-serif text-2xl text-[#111111]">Screen Complete</h2>
          <p className="text-base text-[#5C5C5C] max-w-sm">
            {scoringPassId ? "Your responses have been successfully recorded and scored." : "Your responses were saved, but scoring could not complete."}
          </p>
          {errorMessage && <p className="text-sm text-[#C0392B] bg-[#F5F5F2] p-2 rounded w-full border border-[#E8E8E3]">{errorMessage}</p>}
          <button
            type="button"
            onClick={() => router.push("/console")}
            className="mt-6 border border-[#0F5D5A] text-[#0F5D5A] px-6 py-2.5 text-sm font-medium hover:bg-[#0F5D5A] hover:text-[#FFFFFF] transition-colors"
          >
            Return to Recruiter Console
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-12 animate-slide-up-sm">
          {question && (
            <div className="w-full max-w-lg text-center">
              <div className="mb-4 flex items-center justify-center gap-2">
                {Array.from({ length: question.total }).map((_, i) => (
                  <div key={i} className={`h-1 transition-all ${i === question.idx ? "w-8 bg-[#111111]" : i < question.idx ? "w-3 bg-[#5C5C5C]" : "w-3 bg-[#E8E8E3]"}`} />
                ))}
              </div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#5C5C5C] mb-3">
                Question {question.idx + 1} of {question.total}
              </p>
              <h3 className="font-serif text-2xl leading-relaxed text-[#111111]">{question.text}</h3>
            </div>
          )}

          <div className="relative flex h-32 w-32 items-center justify-center">
            {isRecording && <span className="absolute inset-0 animate-ping rounded-full bg-[#C0392B]/20" />}
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isBusy || !question}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-all disabled:opacity-40 ${
                isRecording ? "bg-[#C0392B]" : "bg-[#0F5D5A]"
              }`}
            >
              {isRecording ? (
                <span className="h-8 w-8 rounded-sm bg-[#FFFFFF]" />
              ) : (
                <span className="h-8 w-8 rounded-full bg-[#FFFFFF]" />
              )}
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2.5 bg-[#FFFFFF] px-4 py-1.5 border border-[#E8E8E3] rounded-full">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]} ${isRecording || status === "processing" ? "animate-pulse" : ""}`} />
              <span className="text-sm font-medium text-[#111111]">{STATUS_COPY[status]}</span>
            </div>
            {status === "error" && <p className="min-h-[1.25rem] text-sm text-[#C0392B] font-medium mt-2">{errorMessage}</p>}
            <button
              type="button"
              onClick={forfeitSession}
              className="mt-4 text-xs font-mono text-[#8A8A8A] hover:text-[#C0392B] transition-colors underline underline-offset-2"
            >
              Forfeit Session
            </button>
          </div>
        </div>
      )}

      {languageToast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 animate-slide-up-sm border border-[#E8E8E3] bg-white px-4 py-3 text-sm text-[#111111] shadow-lg"
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0F5D5A]" />
            {languageToast}
          </div>
        </div>
      )}
    </main>
  );
}
