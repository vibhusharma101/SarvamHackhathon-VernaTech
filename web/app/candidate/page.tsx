"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Contract v0: session_id is a client-generated UUID, created once when the
// candidate page loads, put in the URL. This entry route generates it and
// redirects — everything else lives at /candidate/[sessionId].
export default function CandidateEntryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/candidate/${crypto.randomUUID()}`);
  }, [router]);

  return <p className="p-8 text-sm text-zinc-400">Starting session…</p>;
}
