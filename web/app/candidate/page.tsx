"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";

// Creates a real session (candidate + session rows) via POST /interview/start
// and redirects to /candidate/[sessionId] — the fixed 4-question interview.
export default function CandidateEntryPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .startInterview()
      .then(({ session_id }) => router.replace(`/candidate/${session_id}`))
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't start a session."));
  }, [router]);

  if (error) {
    return <p className="p-8 text-sm text-red-500">Couldn&apos;t start a session: {error}</p>;
  }
  return <p className="p-8 text-sm text-zinc-400">Starting session…</p>;
}
