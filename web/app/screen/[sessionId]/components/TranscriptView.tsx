"use client";

export interface TranscriptLine {
  turnIdx: number;
  text: string;
  isFinal: boolean;
}

export function TranscriptView({ lines }: { lines: TranscriptLine[] }) {
  return (
    <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      {lines.length === 0 && <p className="text-zinc-400">Transcript will appear here as you speak…</p>}
      {lines.map((line) => (
        <p key={line.turnIdx} className={line.isFinal ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 italic"}>
          {line.text}
        </p>
      ))}
    </div>
  );
}
