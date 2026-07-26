import type { HarnessPairResult } from "@/lib/types";

import { GapHighlight } from "./GapHighlight";
import { VarianceNote } from "./VarianceNote";

// H1/H2/H5: English run vs vernacular run side by side, per-profile MAD,
// proficiency delta — the number that *should* differ.

export function PairedComparison({ pair }: { pair: HarnessPairResult }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="font-semibold">{pair.profile_label}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-zinc-500">Competence MAD</dt>
          <dd className="font-mono">{pair.competence_mad?.toFixed(2) ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Proficiency delta</dt>
          <dd className="font-mono">{pair.proficiency_delta?.toFixed(1) ?? "—"}</dd>
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
      <div className="mt-2">
        <VarianceNote pair={pair} />
      </div>
    </div>
  );
}
