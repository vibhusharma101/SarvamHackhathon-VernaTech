"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";

export default function CandidateEntryPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      const { session_id } = await api.startInterview(name.trim() || undefined);
      router.replace(`/candidate/${session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start a session.");
      setStarting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] p-8 text-[#111111]">
      {error ? (
        <div className="bg-[#FFFFFF] border border-[#E8E8E3] p-6 text-sm text-[#111111] max-w-md animate-slide-up">
          <p className="font-medium text-[#C0392B] mb-1">Session Error</p>
          Couldn&apos;t start a session: {error}
        </div>
      ) : (
        <div className="flex w-full max-w-sm flex-col items-center gap-6 animate-fade-in">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#5C5C5C]">Technical screen</p>
            <h1 className="mt-2 font-serif text-2xl text-[#111111]">What&apos;s your name?</h1>
            <p className="mt-1 text-sm text-[#5C5C5C]">So the recruiter knows who they&apos;re looking at.</p>
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !starting && start()}
            placeholder="Your full name"
            autoFocus
            className="w-full border border-[#E8E8E3] bg-white px-4 py-3 text-center text-base text-[#111111] outline-none focus:border-[#0F5D5A]"
          />
          <button
            type="button"
            onClick={start}
            disabled={starting}
            className="bg-[#0F5D5A] px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0B4B48] disabled:opacity-50"
          >
            {starting ? "Starting secure session…" : "Begin technical screen"}
          </button>
        </div>
      )}
    </main>
  );
}
