"use client";

import { use, useCallback, useRef, useState } from "react";

import { startMicCapture, type MicCaptureHandle } from "@/lib/audio";
import { CandidateSocket } from "@/lib/intentWs";

type Status = "idle" | "recording" | "processing" | "done" | "error";

export default function CandidatePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState(0);

  const socketRef = useRef<CandidateSocket | null>(null);
  const micRef = useRef<MicCaptureHandle | null>(null);

  const ensureSocket = useCallback(() => {
    if (!socketRef.current) {
      const socket = new CandidateSocket(sessionId);
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
    }
    return socketRef.current;
  }, [sessionId]);

  const handlePressStart = useCallback(async () => {
    if (status === "recording") return; // guard against duplicate mouse+touch firing
    const socket = ensureSocket();
    setErrorMessage(null);
    setStatus("recording");
    micRef.current = await startMicCapture((frame) => socket.sendAudioFrame(frame));
  }, [ensureSocket, status]);

  const handlePressEnd = useCallback(() => {
    if (status !== "recording") return;
    micRef.current?.stop();
    micRef.current = null;
    socketRef.current?.sendStop();
  }, [status]);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Hold to answer</h1>
        <p className="mt-1 text-xs text-zinc-500">session {sessionId.slice(0, 8)}</p>
      </div>

      <button
        type="button"
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        className={`h-32 w-32 select-none rounded-full text-sm font-medium transition-colors ${
          status === "recording"
            ? "animate-pulse bg-red-500 text-white"
            : "bg-black text-white dark:bg-white dark:text-black"
        }`}
      >
        {status === "recording" ? "Release to send" : "Hold to talk"}
      </button>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {status === "idle" && "Ready."}
        {status === "recording" && "Listening…"}
        {status === "processing" && "Processing…"}
        {status === "done" && `Sent — ${turnCount} turn(s) so far.`}
        {status === "error" && `Couldn't process that turn: ${errorMessage}`}
      </p>
    </main>
  );
}
