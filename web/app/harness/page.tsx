"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      setPairs(await api.runHarness());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Harness run failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 p-8 animate-fade-in bg-[#FAFAF8] min-h-screen text-[#111111]">
      <header className="flex flex-col gap-6 border-b border-[#E8E8E3] pb-8">
        <Link href="/" className="text-sm font-medium text-[#5C5C5C] hover:text-[#111111] w-fit flex items-center gap-2 transition-colors">
          ← Back to home
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif text-[#111111]">Language Consistency Audit</h1>
            <p className="mt-2 text-base text-[#5C5C5C] max-w-2xl">
              Compares each paired profile&apos;s English and vernacular runs. Serial and throttled; sessions
              already scored are read, not re-scored.
            </p>
          </div>
          <button
            type="button"
            disabled={running || pairs.length === 0}
            onClick={runHarness}
            className="shrink-0 rounded bg-[#0F5D5A] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0B4B48] disabled:opacity-50 disabled:hover:bg-[#0F5D5A]"
          >
            {running ? "Running (serial, throttled)…" : "Run harness"}
          </button>
        </div>
      </header>

      {error && (
        <div className="border border-[#E8E8E3] bg-[#FFFFFF] p-4 text-sm text-[#C0392B] animate-slide-up-sm">
          {error}
        </div>
      )}

      <div className="stagger">
        <CreatePairForm sessions={sessions} onCreated={load} />
      </div>

      <div className="flex flex-col gap-6 stagger">
        {pairs.map((pair) => (
          <PairedComparison key={pair.id} pair={pair} />
        ))}
        {pairs.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center border border-[#E8E8E3] bg-[#FFFFFF] p-12 text-center animate-slide-up">
            <h3 className="font-serif text-lg text-[#111111]">No comparison pairs yet</h3>
            <p className="mt-2 text-sm text-[#5C5C5C] max-w-md">
              Run the same content as two sessions in different languages, then pair them above to analyze fairness.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
