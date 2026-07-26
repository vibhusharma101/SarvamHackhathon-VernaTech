"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Scorecard, SessionLatency, SessionListItem, SessionTurn } from "@/lib/types";

import { LatencyPanel } from "./components/LatencyPanel";
import { ProficiencyPanel } from "./components/ProficiencyPanel";
import { RescoreButton } from "./components/RescoreButton";
import { ScoreCard } from "./components/ScoreCard";
import { SessionList } from "./components/SessionList";
import { TranscriptPanel } from "./components/TranscriptPanel";

const POLL_MS = 2000; // TRD §1: poll, don't reach for Supabase realtime today.

export default function ConsolePage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [latency, setLatency] = useState<SessionLatency | null>(null);
  const [turns, setTurns] = useState<SessionTurn[]>([]);

  useEffect(() => {
    const poll = () => api.listSessions().then(setSessions).catch(() => {});
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const loadDetail = useCallback((sessionId: string) => {
    setSelectedId(sessionId);
    // Turns exist as soon as the candidate answers a question — scoring
    // only lands once all 4 are in, so these are independent, not chained.
    api.getScorecard(sessionId).then(setScorecard).catch(() => setScorecard(null));
    api.getLatency(sessionId).then(setLatency).catch(() => setLatency(null));
    api.getTurns(sessionId).then(setTurns).catch(() => setTurns([]));
  }, []);

  return (
    <main className="mx-auto flex max-w-5xl gap-8 p-8">
      <aside className="w-64 shrink-0">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Sessions</h2>
        <SessionList sessions={sessions} selectedId={selectedId} onSelect={loadDetail} />
      </aside>

      <section className="flex-1">
        {selectedId ? (
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">Scorecard</h1>
              <RescoreButton sessionId={selectedId} onRescored={() => loadDetail(selectedId)} />
            </div>

            {scorecard ? (
              <>
                <ScoreCard scorecard={scorecard} />
                <ProficiencyPanel proficiency={scorecard.language_proficiency} />
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Latency</h4>
                  <LatencyPanel latency={latency} />
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-400">
                Not scored yet — the candidate may still be mid-interview, or scoring hasn&apos;t run.
              </p>
            )}

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Transcript — original language vs. English gloss
              </h4>
              <TranscriptPanel turns={turns} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Select a session to view its scorecard.</p>
        )}
      </section>
    </main>
  );
}
