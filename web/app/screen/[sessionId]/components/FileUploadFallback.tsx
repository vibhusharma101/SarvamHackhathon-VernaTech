"use client";

// C8: upload a pre-recorded WAV instead of live mic. Must hit the same
// api.ts functions as MicCapture — same session creation, same scoring path,
// different input (TRD §9) — so the Hour-6 fallback is free, not a second
// untested code path.

export function FileUploadFallback({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm dark:border-zinc-700">
      <label className="flex cursor-pointer flex-col gap-2">
        <span className="font-medium">Upload a WAV recording instead</span>
        <input
          type="file"
          accept="audio/wav"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />
      </label>
    </div>
  );
}
