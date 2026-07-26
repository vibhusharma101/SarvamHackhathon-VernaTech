export function ConsistencyBadge({ lowConsistency }: { lowConsistency: boolean }) {
  if (!lowConsistency) return null;
  return (
    <span
      title="Spread of >=2 points (or split status) across the 3 self-consistency runs — see TRD §3.4"
      className="rounded-full border border-[#C47A10]/30 bg-transparent px-2 py-0.5 text-xs text-[#C47A10]"
    >
      low consistency
    </span>
  );
}
