// H3: largest single observed gap shown prominently — displayed, not
// buried, even if unflattering (TRD §7 rule 2).

export function GapHighlight({ maxObservedGap }: { maxObservedGap: number | null }) {
  if (maxObservedGap === null) {
    return <p className="text-sm text-zinc-400">No comparable criteria across conditions yet.</p>;
  }
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
        Largest single observed gap
      </p>
      <p className="mt-1 text-2xl font-semibold">{maxObservedGap.toFixed(1)} points</p>
    </div>
  );
}
