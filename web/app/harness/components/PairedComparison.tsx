import type { HarnessPairResult } from "@/lib/types";

import { GapHighlight } from "./GapHighlight";
import { VarianceNote } from "./VarianceNote";

export function PairedComparison({ pair }: { pair: HarnessPairResult }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E8E8E3] p-6 transition-all">
      <div className="flex items-baseline justify-between gap-3 border-b border-[#E8E8E3] pb-4">
        <h3 className="font-serif text-xl text-[#111111]">{pair.profile_label}</h3>
        <span className="font-mono text-xs text-[#5C5C5C]">
          {pair.runs_per_session} runs/session
        </span>
      </div>

      {pair.error && (
        <p className="mt-4 border border-[#E8E8E3] bg-[#FFFFFF] p-3 text-sm text-[#C0392B]">
          {pair.error}
        </p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 text-sm sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <dt className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">Competence MAD</dt>
          <dd className="font-mono text-lg font-medium text-[#111111]">{pair.competence_mad?.toFixed(2) ?? "—"}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">Proficiency delta</dt>
          <dd className="font-mono text-lg font-medium text-[#111111]">
            {pair.proficiency_delta === null ? (
              <span className="text-sm font-sans italic text-[#8A8A8A]">not measurable</span>
            ) : (
              pair.proficiency_delta.toFixed(1)
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">En variance</dt>
          <dd className="font-mono text-lg font-medium text-[#111111]">{pair.english_run_variance?.toFixed(2) ?? "—"}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-mono text-[11px] uppercase tracking-wider text-[#8A8A8A]">Vernacular variance</dt>
          <dd className="font-mono text-lg font-medium text-[#111111]">{pair.vernacular_run_variance?.toFixed(2) ?? "—"}</dd>
        </div>
      </dl>
      
      <div className="mt-6 pt-2">
        <GapHighlight maxObservedGap={pair.max_observed_gap} />
      </div>
      
      <div className="mt-5 flex flex-col gap-2 pt-3 border-t border-[#E8E8E3] text-sm">
        <VarianceNote pair={pair} />
        {pair.excluded_criteria_count > 0 && (
          <p className="text-xs text-[#5C5C5C] flex items-center gap-1.5">
            <span className="text-[#8A8A8A]">ℹ</span>
            {pair.excluded_criteria_count} criteri{pair.excluded_criteria_count === 1 ? "on" : "a"} excluded from
            MAD (insufficient evidence in at least one condition).
          </p>
        )}
      </div>
    </div>
  );
}
