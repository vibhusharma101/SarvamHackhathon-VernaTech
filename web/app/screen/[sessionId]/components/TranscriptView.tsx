"use client";

export interface TranscriptLine {
  turnIdx: number;
  text: string;
  isFinal: boolean;
}

export function TranscriptView({ lines }: { lines: TranscriptLine[] }) {
  return (
    <div className="flex h-80 flex-col gap-3 overflow-y-auto bg-[#FFFFFF] border border-[#E8E8E3] p-6 text-base">
      {lines.length === 0 && (
        <div className="flex h-full items-center justify-center text-[#8A8A8A] italic">
          <p>Transcript will appear here as you speak…</p>
        </div>
      )}
      {lines.map((line) => (
        <p key={line.turnIdx} className={`leading-relaxed ${line.isFinal ? "text-[#111111]" : "text-[#5C5C5C] italic"}`}>
          {line.text}
        </p>
      ))}
    </div>
  );
}
