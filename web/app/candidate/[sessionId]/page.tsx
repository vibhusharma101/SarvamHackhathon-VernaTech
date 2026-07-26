"use client";

import { use, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { startMicCapture, type MicCaptureHandle } from "@/lib/audio";
import { InterviewSocket } from "@/lib/interviewWs";

type Status = "connecting" | "ready" | "recording" | "processing" | "complete" | "error";

const STATUS_COPY: Record<Status, string> = {
  connecting: "Connecting…",
  ready: "Ready",
  recording: "Recording",
  processing: "Processing…",
  complete: "Complete",
  error: "Error",
};

const STATUS_DOT: Record<Status, string> = {
  connecting: "bg-zinc-300 dark:bg-zinc-700",
  ready: "bg-zinc-300 dark:bg-zinc-700",
  recording: "bg-red-500",
  processing: "bg-amber-500",
  complete: "bg-emerald-500",
  error: "bg-red-500",
};

interface QuestionState {
  idx: number;
  total: number;
  text: string;
}

export default function CandidatePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<Status>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionState | null>(null);
  const [scoringPassId, setScoringPassId] = useState<string | null>(null);

  const socketRef = useRef<InterviewSocket | null>(null);
  const micRef = useRef<MicCaptureHandle | null>(null);

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
      // "done" is immediately followed by the next question or the complete
      // event — no separate UI state needed for it.
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
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Technical screen</p>
        <p className="mt-1 text-xs text-zinc-400">{sessionId.slice(0, 8)}</p>
      </div>

      {!started ? (
        <button
          type="button"
          onClick={startInterview}
          className="rounded-full bg-black px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
        >
          Start interview
        </button>
      ) : status === "complete" ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-lg font-medium">Interview complete</p>
          <p className="text-sm text-zinc-500">
            {scoringPassId ? "Your answers have been scored." : "Answers saved — scoring couldn't complete."}
          </p>
          {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
          <button
            type="button"
            onClick={() => router.push("/console")}
            className="mt-2 rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium dark:border-zinc-700"
          >
            View in recruiter console
          </button>
        </div>
      ) : (
        <>
          {question && (
            <div className="max-w-md text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Question {question.idx + 1} of {question.total}
              </p>
              <p className="mt-2 text-base leading-relaxed">{question.text}</p>
            </div>
          )}

          <div className="relative flex h-28 w-28 items-center justify-center">
            {isRecording && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />}
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isBusy || !question}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              className={`relative flex h-24 w-24 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                isRecording ? "bg-red-500" : "bg-black dark:bg-white"
              }`}
            >
              {isRecording ? (
                <span className="h-6 w-6 rounded-sm bg-white" />
              ) : (
                <span className="h-5 w-5 rounded-full bg-white dark:bg-black" />
              )}
            </button>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{STATUS_COPY[status]}</span>
            </div>
            {status === "error" && <p className="min-h-[1.25rem] text-xs text-red-500">{errorMessage}</p>}
          </div>
        </>
      )}
    </main>
  );
}
