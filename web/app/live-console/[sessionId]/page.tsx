"use client";

import { use, useEffect, useState } from "react";

import { ConsoleSocket } from "@/lib/intentWs";
import type { IntentBroadcast } from "@/lib/types";

export default function LiveConsolePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [intents, setIntents] = useState<IntentBroadcast[]>([]);

  useEffect(() => {
    const socket = new ConsoleSocket(sessionId);
    socket.onIntent((broadcast) => setIntents((prev) => [...prev, broadcast]));
    return () => socket.close();
  }, [sessionId]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold">Live intent feed</h1>
        <p className="mt-1 text-xs text-zinc-500">
          session {sessionId.slice(0, 8)} — share <code>/candidate/{sessionId}</code> with the candidate
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {intents.map((broadcast) => (
          <div key={broadcast.turn_idx} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{broadcast.intent.action}</span>
              <span className="text-xs text-zinc-500">turn {broadcast.turn_idx}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{broadcast.intent.summary}</p>
            {broadcast.intent.key_entities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {broadcast.intent.key_entities.map((entity) => (
                  <span key={entity} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                    {entity}
                  </span>
                ))}
              </div>
            )}
            <blockquote className="mt-2 border-l-2 border-zinc-300 pl-2 text-xs italic text-zinc-500 dark:border-zinc-700">
              {broadcast.english_text}
            </blockquote>
          </div>
        ))}
        {intents.length === 0 && <p className="text-sm text-zinc-400">Waiting for the candidate to answer…</p>}
      </div>
    </main>
  );
}
