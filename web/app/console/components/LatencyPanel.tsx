import type { SessionLatency } from "@/lib/types";

// R5 (TRD §6.2 / §8): real measured median/max per hop, n visible — never
// "p95" on a handful of turns.

const HOPS: { key: keyof Omit<SessionLatency, "session_id">; label: string }[] = [
  { key: "speech_end_to_asr_final", label: "ASR" },
  { key: "asr_final_to_llm_first_token", label: "LLM" },
  { key: "llm_first_token_to_tts_first_byte", label: "TTS first byte" },
  { key: "tts_first_byte_to_playback_start", label: "Playback" },
];

export function LatencyPanel({ latency }: { latency: SessionLatency | null }) {
  if (!latency) return <p className="text-sm text-zinc-400">No timed turns yet.</p>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase text-zinc-500">
          <th className="py-1">Hop</th>
          <th className="py-1">Median</th>
          <th className="py-1">Max</th>
          <th className="py-1">n</th>
        </tr>
      </thead>
      <tbody>
        {HOPS.map(({ key, label }) => {
          const hop = latency[key];
          return (
            <tr key={key} className="border-t border-zinc-100 dark:border-zinc-800">
              <td className="py-1">{label}</td>
              <td className="py-1 font-mono">{Math.round(hop.median_ms)}ms</td>
              <td className="py-1 font-mono">{Math.round(hop.max_ms)}ms</td>
              <td className="py-1 text-zinc-500">{hop.n}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
