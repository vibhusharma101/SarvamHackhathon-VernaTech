"use client";

import { use, useCallback, useRef, useState } from "react";

import { startMicCapture, type MicCaptureHandle } from "@/lib/audio";
import { CandidateSocket } from "@/lib/intentWs";

type Status = "connecting" | "idle" | "recording" | "processing" | "done" | "error";

const STATUS_COPY: Record<Status, string> = {
  connecting: "Connecting…",
  idle: "Ready",
  recording: "Recording",
  processing: "Processing",
  done: "Sent",
  error: "Error",
};

const STATUS_DOT: Record<Status, string> = {
  connecting: "bg-zinc-300 dark:bg-zinc-700",
  idle: "bg-zinc-300 dark:bg-zinc-700",
  recording: "bg-red-500",
  processing: "bg-amber-500",
  done: "bg-emerald-500",
  error: "bg-red-500",
};

export default function CandidatePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);

  const [sessionActive, setSessionActive] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState(0);

  const socketRef = useRef<CandidateSocket | null>(null);
  const micRef = useRef<MicCaptureHandle | null>(null);

  const startSession = useCallback(() => {
    const socket = new CandidateSocket(sessionId);
    socket.onOpen(() => setStatus("idle"));
    socket.onAck((ack) => {
      if (ack.status === "processing") setStatus("processing");
      if (ack.status === "done") {
        setStatus("done");
        setTurnCount(ack.turn_idx + 1);
      }
    });
    socket.onError((message) => {
      setStatus("error");
      setErrorMessage(message);
    });
    socketRef.current = socket;
    setSessionActive(true);
    setStatus("connecting");
    setErrorMessage(null);
  }, [sessionId]);

  const endSession = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;
    socketRef.current?.close();
    socketRef.current = null;
    setSessionActive(false);
    setStatus("idle");
    setErrorMessage(null);
    setTurnCount(0);
  }, []);

  const toggleRecording = useCallback(async () => {
    if (status === "connecting" || status === "processing") return;

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-10 p-8">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Technical screen</p>
        <p className="mt-1 text-xs text-zinc-400">{sessionId.slice(0, 8)}</p>
      </div>

      {!sessionActive ? (
        <button
          type="button"
          onClick={startSession}
          className="rounded-full bg-black px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
        >
          Start session
        </button>
      ) : (
        <>
          <div className="relative flex h-28 w-28 items-center justify-center">
            {isRecording && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />}
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isBusy}
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
            <p className="min-h-[1.25rem] text-xs text-zinc-400">
              {status === "done" && `${turnCount} turn${turnCount === 1 ? "" : "s"} sent`}
              {status === "error" && errorMessage}
            </p>
          </div>

          <button
            type="button"
            onClick={endSession}
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-600 hover:underline dark:hover:text-zinc-300"
          >
            End session
          </button>
        </>
      )}
    </main>
  );
}
