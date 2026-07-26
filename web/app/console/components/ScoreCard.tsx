import type { Scorecard } from "@/lib/types";

import { ConsistencyBadge } from "./ConsistencyBadge";

// R2 (TRD §6.2): original-language quote and English gloss side by side.
// R3: refusal rendered distinctly from a low score — grey, never red.

export function ScoreCard({ scorecard }: { scorecard: Scorecard }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">
          {scorecard.overall !== null ? `${scorecard.overall.toFixed(1)} / 5` : "No scorable criteria yet"}
        </h3>
        <span className="text-xs text-zinc-500">
          {scorecard.criteria_scored} scored · {scorecard.criteria_insufficient} insufficient evidence
        </span>
      </div>

      {scorecard.criteria.map((c) => (
        <div
          key={c.criterion_id}
          className={`rounded-lg border p-4 ${
            c.status === "insufficient_evidence"
              ? "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
              : "border-zinc-200 dark:border-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{c.rubric_criterion?.name ?? c.criterion_id}</span>
            <div className="flex items-center gap-2">
              <ConsistencyBadge lowConsistency={c.low_consistency} />
              {c.status === "scored" ? (
                <span className="font-mono text-sm">{c.score}/5</span>
              ) : (
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  insufficient evidence
                </span>
              )}
            </div>
          </div>

          {c.status === "scored" ? (
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <blockquote className="border-l-2 border-zinc-300 pl-2 italic dark:border-zinc-700">
                {c.evidence_quote_original ?? "—"}
              </blockquote>
              <blockquote className="border-l-2 border-zinc-300 pl-2 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                {c.evidence_quote_english ?? "—"}
              </blockquote>
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">{c.reason ?? "No reason recorded."}</p>
          )}
        </div>
      ))}
    </div>
  );
}
