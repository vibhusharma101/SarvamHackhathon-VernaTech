"use client";

import { useState } from "react";

import { api } from "@/lib/api";

// R6: reopen a past session and re-score it -> new scoring_pass, prior
// runs retained (TRD §5). Extended with a recruiter comment that persists
// on the session (app/services/scoring_service.py reads it on every future
// pass, not just this one) — this is the "memory" behavior: add context
// once, every rescore from here on incorporates it.

export function RescoreButton({
  sessionId,
  initialNote,
  onRescored,
}: {
  sessionId: string;
  initialNote: string | null;
  onRescored: () => void;
}) {
  const [comment, setComment] = useState(initialNote ?? "");
  const [prevSessionId, setPrevSessionId] = useState(sessionId);
  const [prevNote, setPrevNote] = useState(initialNote);
  const [busy, setBusy] = useState(false);

  if (prevSessionId !== sessionId || prevNote !== initialNote) {
    setPrevSessionId(sessionId);
    setPrevNote(initialNote);
    setComment(initialNote ?? "");
  }

  const rescore = async () => {
    setBusy(true);
    try {
      await api.rescore(sessionId, comment);
      onRescored();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a personalized note (e.g. something the candidate clarified after the interview) — it's remembered on every future rescore."
        rows={2}
        className="w-full resize-none border border-[#E8E8E3] bg-white px-3 py-2 text-xs text-[#111111] outline-none focus:border-[#0F5D5A]"
      />
      <button
        type="button"
        disabled={busy}
        onClick={rescore}
        className="self-end border border-[#E8E8E3] hover:border-[#111111] text-[#111111] rounded-full text-xs px-3 py-1.5 font-medium transition-colors disabled:opacity-50"
      >
        {busy ? "Rescoring…" : "Save & Rescore"}
      </button>
    </div>
  );
}
