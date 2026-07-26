import type { Scorecard } from "@/lib/types";

import { ConsistencyBadge } from "./ConsistencyBadge";

// R2 (TRD §6.2): original-language quote and English gloss side by side.
// R3: refusal rendered distinctly from a low score — grey, never red.

export function ScoreCard({ scorecard }: { scorecard: Scorecard }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between pb-2">
        <h3 className="text-xl font-medium text-[#111111]">
          {scorecard.overall !== null ? `${scorecard.overall.toFixed(1)} / 5` : "No scorable criteria yet"}
        </h3>
        <span className="text-xs text-[#8A8A8A]">
          {scorecard.criteria_scored} scored · {scorecard.criteria_insufficient} insufficient evidence
        </span>
      </div>

      {scorecard.criteria.map((c) => (
        <div
          key={c.criterion_id}
          className="rounded-2xl p-6 bg-white border border-[#E8E8E3]"
        >
          {c.status === "scored" ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-6 sm:grid-cols-2">
                <blockquote className="border-l-2 border-[#0F5D5A] pl-4 py-1.5 italic text-[#111111] my-2 bg-transparent">
                  {c.evidence_quote_original ?? "—"}
                </blockquote>
                <blockquote className="border-l-2 border-[#0F5D5A] pl-4 py-1.5 italic text-[#111111] my-2 bg-transparent">
                  {c.evidence_quote_english ?? "—"}
                </blockquote>
              </div>
              <div className="flex items-center justify-between border-t border-[#E8E8E3] pt-4 mt-2">
                <span className="text-sm text-[#111111] font-medium">{c.rubric_criterion?.name ?? c.criterion_id}</span>
                <div className="flex items-center gap-3">
                  <ConsistencyBadge lowConsistency={c.low_consistency} />
                  <span className="font-mono text-[#5C5C5C]">
                    {c.score} / 5
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#111111] font-medium">{c.rubric_criterion?.name ?? c.criterion_id}</span>
                <div className="flex items-center gap-2">
                  <ConsistencyBadge lowConsistency={c.low_consistency} />
                  <span className="text-xs text-[#8A8A8A]">
                    insufficient evidence
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#5C5C5C] italic">{c.reason ?? "No reason recorded."}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
