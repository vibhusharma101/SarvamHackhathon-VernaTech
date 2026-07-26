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
      className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
    >
      {busy ? "Rescoring…" : "Rescore"}
    </button>
  );
}
