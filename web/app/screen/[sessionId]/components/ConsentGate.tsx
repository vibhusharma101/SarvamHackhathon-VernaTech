"use client";

export function ConsentGate({ onConsent }: { onConsent: () => void }) {
  return (
    <div className="w-full bg-[#FFFFFF] border border-[#E8E8E3] p-8">
      <h2 className="font-serif text-2xl text-[#111111]">Before we start</h2>
      <p className="mt-4 text-base leading-relaxed text-[#5C5C5C]">
        This is a recorded technical screen. Your voice and answers will be transcribed and scored on
        <strong className="font-medium text-[#111111]"> engineering evidence only</strong> — not on how fluently you speak. 
        You can ask for clarification at any point at no cost to your score.
      </p>
      <button
        type="button"
        onClick={onConsent}
        className="mt-8 bg-[#0F5D5A] px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0B4B48]"
      >
        I consent to recording and screening
      </button>
    </div>
  );
}
