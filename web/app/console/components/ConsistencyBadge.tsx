export function ConsistencyBadge({ lowConsistency }: { lowConsistency: boolean }) {
  if (!lowConsistency) return null;
  return (
    <span
      title="Spread of >=2 points (or split status) across the 3 self-consistency runs — see TRD §3.4"
      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    >
      low consistency
    </span>
  );
}
