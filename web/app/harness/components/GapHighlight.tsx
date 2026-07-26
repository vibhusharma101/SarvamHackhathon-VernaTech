export function GapHighlight({ maxObservedGap }: { maxObservedGap: number | null }) {
  if (maxObservedGap === null) {
    return <p className="font-mono text-sm text-[#8A8A8A] italic">No comparable criteria across conditions yet.</p>;
  }
  return (
    <div className="bg-[#FFFFFF] border border-[#E8E8E3] p-5">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#5C5C5C]">
        Largest single observed gap
      </p>
      <p className="mt-1 font-serif text-3xl font-medium text-[#C47A10]">
        {maxObservedGap.toFixed(1)} <span className="text-lg text-[#8A8A8A] font-sans">points</span>
      </p>
    </div>
  );
}
