import type { HarnessPairResult } from "@/lib/types";

import { GapHighlight } from "./GapHighlight";
import { VarianceNote } from "./VarianceNote";

// H1/H2/H5: English run vs vernacular run side by side, per-profile MAD,
// proficiency delta — the number that *should* differ.

export function PairedComparison({ pair }: { pair: HarnessPairResult }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">{pair.profile_label}</h3>
        <span className="text-xs text-zinc-400">{pair.runs_per_session} runs/session</span>
      </div>

      {pair.error && (
        <p className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {pair.error}
        </p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-zinc-500">Competence MAD</dt>
          <dd className="font-mono">{pair.competence_mad?.toFixed(2) ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Proficiency delta</dt>
          {/* null means one side had no English to rate — say that rather
              than render a dash that reads like a zero. */}
          <dd className="font-mono">
            {pair.proficiency_delta === null ? (
              <span className="text-xs text-zinc-400">not measurable</span>
            ) : (
              pair.proficiency_delta.toFixed(1)
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">English run variance</dt>
          <dd className="font-mono">{pair.english_run_variance?.toFixed(2) ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Vernacular run variance</dt>
          <dd className="font-mono">{pair.vernacular_run_variance?.toFixed(2) ?? "—"}</dd>
        </div>
      </dl>
      <div className="mt-3">
        <GapHighlight maxObservedGap={pair.max_observed_gap} />
      </div>
      <div className="mt-2 flex flex-col gap-1">
        <VarianceNote pair={pair} />
        {/* TRD §7 rule 1: report the excluded count next to MAD, so a thin
            comparison reads as thin instead of as a confident number. */}
        {pair.excluded_criteria_count > 0 && (
          <p className="text-xs text-zinc-500">
            {pair.excluded_criteria_count} criteri{pair.excluded_criteria_count === 1 ? "on" : "a"} excluded from
            MAD (insufficient evidence in at least one condition).
          </p>
        )}
      </div>
    </div>
  );
}
