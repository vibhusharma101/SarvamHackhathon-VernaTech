"use client";

import { useState } from "react";

import { api } from "@/lib/api";
import type { SessionListItem } from "@/lib/types";

// Pairs two existing sessions as one profile. The equivalence claim — that
// both sessions carry the SAME engineering content in different languages —
// is the operator's, not something the API can verify. Said plainly in the
// UI because the entire comparison is meaningless otherwise.

function sessionLabel(s: SessionListItem) {
  const name = s.candidate?.name ?? "Unknown";
  return `${name} · ${s.spoken_language} · ${s.id.slice(0, 8)}`;
}

export function CreatePairForm({
  sessions,
  onCreated,
}: {
  sessions: SessionListItem[];
  onCreated: () => void;
}) {
  const [label, setLabel] = useState("");
  const [englishId, setEnglishId] = useState("");
  const [vernacularId, setVernacularId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = label.trim() && englishId && vernacularId && englishId !== vernacularId && !busy;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.createHarnessPair({
        profile_label: label.trim(),
        english_session_id: englishId,
        vernacular_session_id: vernacularId,
      });
      setLabel("");
      setEnglishId("");
      setVernacularId("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the pair.");
    } finally {
      setBusy(false);
    }
  };

  const selectClass =
    "w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700";

  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
      <h3 className="text-sm font-semibold">Pair two sessions</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Both sessions must contain the same engineering content, answered in different languages. Nothing
        checks that for you — if the content differs, the comparison means nothing.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Profile label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="P1 — Mahesh"
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">English-condition session</span>
          <select value={englishId} onChange={(e) => setEnglishId(e.target.value)} className={selectClass}>
            <option value="">Select…</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {sessionLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Vernacular-condition session</span>
          <select
            value={vernacularId}
            onChange={(e) => setVernacularId(e.target.value)}
            className={selectClass}
          >
            <option value="">Select…</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {sessionLabel(s)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={submit}
        className="mt-3 rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-zinc-700"
      >
        {busy ? "Creating…" : "Create pair"}
      </button>
    </div>
  );
}
