import type { SessionTurn } from "@/lib/types";

// Recruiter-facing eval view: original language AND the English gloss the
// scorer actually reads, side by side per turn — so a recruiter can
// manually check whether the translation/intent capture was correct. This
// is the raw material for a future eval set, not a scored view.

export function TranscriptPanel({ turns }: { turns: SessionTurn[] }) {
  if (turns.length === 0) {
    return <p className="text-sm text-zinc-400">No turns recorded for this session yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {turns.map((turn) => (
        <div key={turn.idx} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Turn {turn.idx + 1}
            </span>
            {turn.language_code && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {turn.language_code}
              </span>
            )}
          </div>

          {turn.question && <p className="mt-1 text-sm font-medium">{turn.question}</p>}

          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Original language</p>
              <blockquote className="mt-1 border-l-2 border-zinc-300 pl-2 italic dark:border-zinc-700">
                {turn.original_text || "—"}
              </blockquote>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">English gloss (scorer input)</p>
              <blockquote className="mt-1 border-l-2 border-zinc-300 pl-2 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                {turn.english_text || "—"}
              </blockquote>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
