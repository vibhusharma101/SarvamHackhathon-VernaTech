"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";

export default function CandidateEntryPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .startInterview()
      .then(({ session_id }) => router.replace(`/candidate/${session_id}`))
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't start a session."));
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] p-8 text-[#111111]">
      {error ? (
        <div className="bg-[#FFFFFF] border border-[#E8E8E3] p-6 text-sm text-[#111111] max-w-md animate-slide-up">
          <p className="font-medium text-[#C0392B] mb-1">Session Error</p>
          Couldn&apos;t start a session: {error}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E8E8E3] border-t-[#0F5D5A]" />
          <p className="font-mono text-sm text-[#5C5C5C] tracking-wide">Starting secure session…</p>
        </div>
      )}
    </main>
  );
}
