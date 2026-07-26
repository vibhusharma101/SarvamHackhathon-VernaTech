"use client";

import { useState } from "react";

import { api } from "@/lib/api";

// R6: reopen a past session and re-score it -> new scoring_pass, prior
// runs retained (TRD §5). Notes live per-criterion in ScoreCard now (tagged
// to a specific criterion_id) — this just fires the rescore with whatever
// the parent currently holds for `notes`.

export function RescoreButton({
  sessionId,
  notes,
  onRescored,
}: {
  sessionId: string;
  notes: Record<string, string>;
  onRescored: () => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api.rescore(sessionId, notes);
          onRescored();
        } finally {
          setBusy(false);
        }
      }}
      className="border border-[#E8E8E3] hover:border-[#111111] text-[#111111] rounded-full text-xs px-3 py-1.5 font-medium transition-colors disabled:opacity-50"
    >
      {busy ? "Rescoring…" : "Save & Rescore"}
    </button>
  );
}
