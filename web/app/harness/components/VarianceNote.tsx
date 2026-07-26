import type { HarnessPairResult } from "@/lib/types";

export function VarianceNote({ pair }: { pair: HarnessPairResult }) {
  if (pair.competence_mad === null) return null;

  const pooledVariance = ((pair.english_run_variance ?? 0) + (pair.vernacular_run_variance ?? 0)) / 2;
  const withinNoise = pair.competence_mad <= pooledVariance;

  return (
    <p className={`flex items-start gap-2 text-xs leading-relaxed ${withinNoise ? "text-[#5C5C5C]" : "text-[#111111] font-medium"}`}>
      <span className={withinNoise ? "text-[#0A7A53]" : "text-[#C47A10]"}>
        {withinNoise ? "✓" : "⚠"}
      </span>
      <span>
        {withinNoise
          ? `MAD (${pair.competence_mad.toFixed(2)}) is within scorer run-to-run noise (${pooledVariance.toFixed(2)}).`
          : `MAD (${pair.competence_mad.toFixed(2)}) exceeds scorer run-to-run noise (${pooledVariance.toFixed(2)}) — disclosed, not hidden.`}
      </span>
    </p>
  );
}
