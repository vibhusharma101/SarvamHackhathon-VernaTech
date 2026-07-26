"use client";

// C2 (TRD/PRD §6.1): plain-language consent to record + screen, purpose
// stated. consent_ts must be written before the mic activates.

export function ConsentGate({ onConsent }: { onConsent: () => void }) {
  return (
    <div className="max-w-md rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">Before we start</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        This is a recorded technical screen. Your voice and answers will be transcribed and scored on
        engineering evidence only — not on how fluently you speak. You can ask for clarification at any
        point at no cost to your score.
      </p>
      <button
        type="button"
        onClick={onConsent}
        className="mt-4 rounded-full bg-black px-5 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        I consent to recording and screening
      </button>
    </div>
  );
}
