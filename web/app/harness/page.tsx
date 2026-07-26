"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { HarnessPairResult } from "@/lib/types";

import { PairedComparison } from "./components/PairedComparison";

export default function HarnessPage() {
  const [pairs, setPairs] = useState<HarnessPairResult[]>([]);
  const [running, setRunning] = useState(false);

  const load = () => api.getHarnessResults().then(setPairs).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fairness harness</h1>
        <button
          type="button"
          disabled={running}
          onClick={async () => {
            setRunning(true);
            try {
              await api.runHarness();
              await load();
            } finally {
              setRunning(false);
            }
          }}
          className="rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {running ? "Running (serial, throttled)…" : "Run harness"}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {pairs.map((pair) => (
          <PairedComparison key={pair.id} pair={pair} />
        ))}
        {pairs.length === 0 && <p className="text-sm text-zinc-400">No harness runs yet.</p>}
      </div>
    </main>
  );
}
