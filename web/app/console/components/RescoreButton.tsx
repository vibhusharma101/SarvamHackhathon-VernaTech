"use client";

import { useState } from "react";

import { api } from "@/lib/api";

// R6: reopen a past session and re-score it -> new scoring_pass, prior
// runs retained (TRD §5).

export function RescoreButton({ sessionId, onRescored }: { sessionId: string; onRescored: () => void }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api.rescore(sessionId);
          onRescored();
        } finally {
          setBusy(false);
        }
      }}
      className="border border-[#E8E8E3] hover:border-[#111111] text-[#111111] rounded-full text-xs px-3 py-1.5 font-medium transition-colors disabled:opacity-50"
    >
      {busy ? "Rescoring…" : "Rescore"}
    </button>
  );
}
