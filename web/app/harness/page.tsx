"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { HarnessPairResult, SessionListItem } from "@/lib/types";

import { CreatePairForm } from "./components/CreatePairForm";
import { PairedComparison } from "./components/PairedComparison";

export default function HarnessPage() {
  const [pairs, setPairs] = useState<HarnessPairResult[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.getHarnessResults().then(setPairs).catch(() => {});

  useEffect(() => {
    load();
    api.listSessions().then(setSessions).catch(() => {});
  }, []);

  const runHarness = async () => {
    setRunning(true);
    setError(null);
    try {
      // The run response carries noise_verdict / error fields the stored
      // rows don't have, so render it directly rather than re-fetching.
      setPairs(await api.runHarness());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Harness run failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Fairness harness</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Compares each paired profile&apos;s English and vernacular runs. Serial and throttled; sessions
            already scored are read, not re-scored.
          </p>
        </div>
        <button
          type="button"
          disabled={running || pairs.length === 0}
          onClick={runHarness}
          className="shrink-0 rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {running ? "Running (serial, throttled)…" : "Run harness"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <CreatePairForm sessions={sessions} onCreated={load} />

      <div className="flex flex-col gap-4">
        {pairs.map((pair) => (
          <PairedComparison key={pair.id} pair={pair} />
        ))}
        {pairs.length === 0 && !error && (
          <p className="text-sm text-zinc-400">
            No pairs yet. Run the same content as two sessions in different languages, then pair them above.
          </p>
        )}
      </div>
    </main>
  );
}
