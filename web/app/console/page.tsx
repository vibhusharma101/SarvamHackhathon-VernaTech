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
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] animate-fade-in">
      <header className="border-b border-[#E8E8E3] bg-[#FAFAF8] px-8 py-5">
        <div className="mx-auto flex max-w-6xl items-center gap-6">
          <a href="/" className="text-[#5C5C5C] hover:text-[#111111] text-sm transition-colors">
            &larr; Back
          </a>
          <h1 className="text-xl font-medium text-[#111111]">Recruiter Console</h1>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl gap-8 p-8 items-start">
        <aside className="w-80 shrink-0">
          <h2 className="mb-4 text-xs font-mono uppercase tracking-widest text-[#8A8A8A]">Sessions</h2>
          <SessionList sessions={sessions} selectedId={selectedId} onSelect={loadDetail} />
        </aside>

        <section className="flex-1">
          {selectedId ? (
            <div className="flex flex-col gap-10 animate-slide-up-sm stagger">
              <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E3]">
                <h2 className="text-2xl font-medium text-[#111111]">Scorecard</h2>
                <RescoreButton sessionId={selectedId} onRescored={() => loadDetail(selectedId)} />
              </div>

              {scorecard ? (
                <div className="flex flex-col gap-10">
                  <ScoreCard scorecard={scorecard} />
                  <ProficiencyPanel proficiency={scorecard.language_proficiency} />
                  <div className="pt-8 border-t border-[#E8E8E3]">
                    <h4 className="text-xs font-mono tracking-widest uppercase text-[#8A8A8A] mb-4">Latency Measures</h4>
                    <LatencyPanel latency={latency} />
                  </div>
                </div>
              ) : (
                <div className="p-8 border border-[#E8E8E3] bg-white rounded-xl text-center">
                  <p className="text-[#5C5C5C] text-sm">
                    Not scored yet — the candidate may still be mid-interview, or scoring hasn&apos;t run.
                  </p>
                </div>
              )}

              <div className="border-t border-[#E8E8E3] pt-10">
                <h4 className="mb-6 text-xs font-mono tracking-widest uppercase text-[#8A8A8A]">
                  Transcript — original language vs. English gloss
                </h4>
                <TranscriptPanel turns={turns} />
              </div>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center gap-4">
              <p className="text-[#5C5C5C] text-sm">Select a session from the sidebar to view its scorecard.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
