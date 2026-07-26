"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { HarnessPairResult } from "@/lib/types";

import { PairedComparison } from "./components/PairedComparison";

export default function HarnessPage() {
  const [pairs, setPairs] = useState<HarnessPairResult[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.getHarnessResults().then(setPairs).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const runHarness = async () => {
    setRunning(true);
    setError(null);
    try {
      await api.runHarness();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Harness run failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Fairness harness</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Batches every seeded English/vernacular pair, serial and throttled.
          </p>
        </div>
        <button
          type="button"
          disabled={running}
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

      <div className="flex flex-col gap-4">
        {pairs.map((pair) => (
          <PairedComparison key={pair.id} pair={pair} />
        ))}
        {pairs.length === 0 && !error && (
          <p className="text-sm text-zinc-400">No harness runs yet.</p>
        )}
      </div>
    </main>
  );
}
