import type { HarnessPairResult } from "@/lib/types";

// H4 + TRD §7 rule 3: compare competence_mad against run_variance and say
// which one wins, plainly.

export function VarianceNote({ pair }: { pair: HarnessPairResult }) {
  if (pair.competence_mad === null) return null;

  const pooledVariance = ((pair.english_run_variance ?? 0) + (pair.vernacular_run_variance ?? 0)) / 2;
  const withinNoise = pair.competence_mad <= pooledVariance;

  return (
    <p className={`text-xs ${withinNoise ? "text-zinc-500" : "text-amber-700 dark:text-amber-400"}`}>
      {withinNoise
        ? `MAD (${pair.competence_mad.toFixed(2)}) is within scorer run-to-run noise (${pooledVariance.toFixed(2)}).`
        : `MAD (${pair.competence_mad.toFixed(2)}) exceeds scorer run-to-run noise (${pooledVariance.toFixed(2)}) — disclosed, not hidden.`}
    </p>
  );
}
