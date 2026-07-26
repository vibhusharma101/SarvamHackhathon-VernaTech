import type { LanguageProficiencyResult } from "@/lib/types";

// R4 (TRD §6.2): physically separated from the competence panel, labelled
// "recorded, not scored" — M3 in the PRD.

export function ProficiencyPanel({ proficiency }: { proficiency: LanguageProficiencyResult | null }) {
  return (
    <div className="pt-8 border-t border-[#E8E8E3]">
      <h4 className="text-xs font-mono uppercase tracking-widest text-[#8A8A8A] mb-4">Recorded, not scored</h4>
      {!proficiency ? (
        <p className="text-sm text-[#5C5C5C]">Not yet computed for this session.</p>
      ) : proficiency.english_fluency === null ? (
        // Not a gap to fill in — the candidate produced no English to rate.
        // Showing a number here would be inventing one.
        <div className="flex flex-col gap-2">
          <span className="text-sm text-[#111111]">English fluency: <span className="text-[#8A8A8A] italic">not assessed</span></span>
          {proficiency.disfluency_notes && (
            <p className="text-sm text-[#5C5C5C] pl-3 border-l-2 border-[#E8E8E3]">
              {proficiency.disfluency_notes}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-[#111111]">
            English fluency: <span className="font-mono text-[#5C5C5C] ml-2">{proficiency.english_fluency} / 5</span>
          </span>
          {proficiency.disfluency_notes && (
            <p className="text-sm text-[#5C5C5C] pl-3 border-l-2 border-[#E8E8E3]">
              {proficiency.disfluency_notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
