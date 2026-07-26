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
  yes: "text-emerald-600 dark:text-emerald-400",
  no: "text-red-600 dark:text-red-400",
  not_addressed: "text-zinc-400",
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
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold">Live intent feed</h1>
        <p className="mt-1 text-xs text-zinc-500">
          session {sessionId.slice(0, 8)} — share <code>/candidate/{sessionId}</code> with the candidate
        </p>
      </div>

      {latest && (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              latest.session_verdict.overall_verdict === "advance"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {latest.session_verdict.overall_verdict === "advance" ? "Advance" : "Do not advance (yet)"}
          </span>
          <span className="text-xs text-zinc-500">
            {latest.session_verdict.categories_passed} / {latest.session_verdict.categories_total} categories passed
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {intents.map((broadcast) => (
          <div key={broadcast.turn_idx} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{broadcast.intent.action}</span>
              <span className="text-xs text-zinc-500">turn {broadcast.turn_idx}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block rounded-full bg-black px-2 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-black">
                {broadcast.intent.category}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  broadcast.category_verdict.verdict === "pass"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                }`}
              >
                {broadcast.category_verdict.verdict.toUpperCase()} — {broadcast.category_verdict.features_yes}/
                {broadcast.category_verdict.features.length} confirmed
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{broadcast.intent.summary}</p>
            {broadcast.intent.key_entities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {broadcast.intent.key_entities.map((entity) => (
                  <span key={entity} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                    {entity}
                  </span>
                ))}
              </div>
            )}

            <ul className="mt-3 flex flex-col gap-1 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
              {broadcast.category_verdict.features.map((feature) => (
                <li key={feature.id} className="flex items-start gap-2">
                  <span className={`font-semibold ${FEATURE_COLOR[feature.status]}`}>
                    {FEATURE_ICON[feature.status]}
                  </span>
                  <div>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{feature.id}</span>
                    {feature.evidence_quote && (
                      <span className="text-zinc-500"> — "{feature.evidence_quote}"</span>
                    )}
                    {!feature.evidence_quote && feature.improvement_note && (
                      <span className="text-zinc-400"> — {feature.improvement_note}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-col gap-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-800">
                  {broadcast.language_code}
                </span>
                <p className="text-xs text-zinc-500">{broadcast.original_text}</p>
              </div>
              <blockquote className="border-l-2 border-zinc-300 pl-2 text-xs italic text-zinc-500 dark:border-zinc-700">
                {broadcast.english_text}
              </blockquote>
            </div>
          </div>
        ))}
        {intents.length === 0 && <p className="text-sm text-zinc-400">Waiting for the candidate to answer…</p>}
      </div>
    </main>
  );
}
