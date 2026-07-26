"use client";

import { use, useEffect, useState } from "react";

import { ConsoleSocket } from "@/lib/intentWs";
import type { FeatureResult, IntentBroadcast } from "@/lib/types";

const FEATURE_ICON: Record<FeatureResult["status"], string> = {
  yes: "✓",
  no: "✗",
  not_addressed: "–",
};

const FEATURE_COLOR: Record<FeatureResult["status"], string> = {
  yes: "text-[#0A7A53]",
  no: "text-[#C0392B]",
  not_addressed: "text-[#8A8A8A]",
};

export default function LiveConsolePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [intents, setIntents] = useState<IntentBroadcast[]>([]);

  useEffect(() => {
    const socket = new ConsoleSocket(sessionId);
    socket.onIntent((broadcast) => setIntents((prev) => [...prev, broadcast]));
    return () => socket.close();
  }, [sessionId]);

  const latest = intents[intents.length - 1];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 bg-[#FAFAF8] p-8 text-[#111111] animate-fade-in min-h-screen">
      <header className="flex flex-col gap-2 border-b border-[#E8E8E3] pb-6">
        <h1 className="font-serif text-3xl font-medium text-[#111111]">Live Evidence Feed</h1>
        <p className="text-sm text-[#5C5C5C]">
          Session <code className="font-mono">{sessionId.slice(0, 8)}</code> 
          — Share <span className="font-mono text-xs underline underline-offset-2 text-[#0F5D5A]">/candidate/{sessionId}</span> with the candidate
        </p>
      </header>

      {latest && (
        <div className="flex items-center justify-between bg-[#FFFFFF] border border-[#E8E8E3] p-5 animate-slide-up-sm">
          <span
            className={`px-4 py-1.5 text-sm font-semibold tracking-wide border ${
              latest.session_verdict.overall_verdict === "advance"
                ? "border-[#E8E8E3] text-[#0A7A53]"
                : "border-[#E8E8E3] text-[#5C5C5C]"
            }`}
          >
            {latest.session_verdict.overall_verdict === "advance" ? "Verdict: Advance" : "Verdict: Pending / Do not advance"}
          </span>
          <span className="font-mono text-sm font-medium text-[#111111]">
            {latest.session_verdict.categories_passed} / {latest.session_verdict.categories_total} <span className="text-[#5C5C5C] font-sans font-normal text-xs uppercase tracking-wider">Categories Passed</span>
          </span>
        </div>
      )}

      <div className="flex flex-col gap-6 stagger">
        {intents.map((broadcast) => (
          <article key={broadcast.turn_idx} className="bg-[#FFFFFF] border border-[#E8E8E3] p-6 transition-colors hover:border-[#111111]">
            <header className="flex items-start justify-between border-b border-[#E8E8E3] pb-4">
              <div className="flex flex-col gap-1.5">
                <span className="font-serif text-lg font-medium text-[#111111]">{broadcast.intent.action}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center border border-[#E8E8E3] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#5C5C5C]">
                    {broadcast.intent.category}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border border-[#E8E8E3] ${
                      broadcast.category_verdict.verdict === "pass"
                        ? "text-[#0A7A53]"
                        : "text-[#C0392B]"
                    }`}
                  >
                    {broadcast.category_verdict.verdict} — {broadcast.category_verdict.features_yes}/{broadcast.category_verdict.features.length} confirmed
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs font-medium text-[#8A8A8A]">Turn {broadcast.turn_idx}</span>
            </header>
            
            <div className="mt-4">
              <p className="text-sm leading-relaxed text-[#5C5C5C]">{broadcast.intent.summary}</p>
              
              {broadcast.intent.key_entities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {broadcast.intent.key_entities.map((entity) => (
                    <span key={entity} className="border border-[#E8E8E3] px-2 py-1 font-mono text-xs text-[#111111]">
                      {entity}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <ul className="mt-5 flex flex-col gap-2 pt-4 border-t border-[#E8E8E3] text-sm">
              {broadcast.category_verdict.features.map((feature) => (
                <li key={feature.id} className="flex items-start gap-3">
                  <span className={`mt-0.5 font-bold ${FEATURE_COLOR[feature.status]}`}>
                    {FEATURE_ICON[feature.status]}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium text-[#111111]">{feature.id}</span>
                    {feature.evidence_quote && (
                      <span className="text-[#111111] italic mt-1 border-l-2 border-[#0F5D5A] pl-3 py-1">
                        &ldquo;{feature.evidence_quote}&rdquo;
                      </span>
                    )}
                    {!feature.evidence_quote && feature.improvement_note && (
                      <span className="text-[#5C5C5C] text-xs mt-1">Note: {feature.improvement_note}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-col gap-3 border-t border-[#E8E8E3] pt-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#5C5C5C] font-semibold border border-[#E8E8E3] px-1.5 py-0.5">
                  {broadcast.language_code}
                </span>
                <p className="text-sm text-[#111111]">{broadcast.original_text}</p>
              </div>
              <blockquote className="text-sm italic text-[#5C5C5C]">
                {broadcast.english_text}
              </blockquote>
            </div>
          </article>
        ))}
        {intents.length === 0 && (
          <div className="flex flex-col items-center justify-center bg-[#FFFFFF] border border-[#E8E8E3] py-16 text-center animate-pulse">
            <p className="font-serif text-lg text-[#5C5C5C]">Waiting for the candidate to provide evidence…</p>
          </div>
        )}
      </div>
    </main>
  );
}
