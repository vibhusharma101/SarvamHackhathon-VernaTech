import type { LanguageProficiencyResult } from "@/lib/types";

// R4 (TRD §6.2): physically separated from the competence panel, labelled
// "recorded, not scored" — M3 in the PRD.

export function ProficiencyPanel({ proficiency }: { proficiency: LanguageProficiencyResult | null }) {
  return (
    <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Recorded, not scored</h4>
      {!proficiency ? (
        <p className="mt-2 text-sm text-zinc-400">Not yet computed for this session.</p>
      ) : proficiency.english_fluency === null ? (
        // Not a gap to fill in — the candidate produced no English to rate.
        // Showing a number here would be inventing one.
        <div className="mt-2 text-sm">
          <span className="text-zinc-500">English fluency: not assessed</span>
          {proficiency.disfluency_notes && (
            <p className="mt-1 text-xs text-zinc-400">{proficiency.disfluency_notes}</p>
          )}
        </div>
      ) : (
        <div className="mt-2 text-sm">
          <span>English fluency: {proficiency.english_fluency}/5</span>
          {proficiency.disfluency_notes && (
            <p className="mt-1 text-xs text-zinc-500">{proficiency.disfluency_notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
