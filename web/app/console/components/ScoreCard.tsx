import type { Scorecard } from "@/lib/types";

import { ConsistencyBadge } from "./ConsistencyBadge";

// R3: refusal rendered distinctly from a low score — grey, never red.
//
// R2 originally called for the original-language quote next to the English
// gloss, but that's never populated — the scorer only ever sees the English
// gloss and quotes from that, so evidence_quote_original is permanently
// null. Showing just the one real quote instead of a dash placeholder for
// data that doesn't exist.
//
// Each criterion carries its own recruiter note (tagged to that specific
// criterion_id, not the whole session) — persisted and reused on every
// future rescore. See app/routers/scoring.py's rescore endpoint.

export function ScoreCard({
  scorecard,
  notes,
  onNoteChange,
}: {
  scorecard: Scorecard;
  notes: Record<string, string>;
  onNoteChange: (criterionId: string, note: string) => void;
}) {
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
              <blockquote className="border-l-2 border-[#0F5D5A] pl-4 py-1.5 italic text-[#111111] my-2 bg-transparent">
                {c.evidence_quote_english ?? "—"}
              </blockquote>
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

          <textarea
            value={notes[c.criterion_id] ?? ""}
            onChange={(e) => onNoteChange(c.criterion_id, e.target.value)}
            placeholder={`Tag a note to "${c.rubric_criterion?.name ?? "this criterion"}" — e.g. something the candidate clarified about it after the interview.`}
            rows={2}
            className="mt-4 w-full resize-none border border-[#E8E8E3] bg-[#FAFAF8] px-3 py-2 text-xs text-[#111111] outline-none focus:border-[#0F5D5A]"
          />
        </div>
      ))}
    </div>
  );
}
