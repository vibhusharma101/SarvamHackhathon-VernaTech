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
  if (!latency) return <p className="text-sm text-[#8A8A8A]">No timed turns yet.</p>;

  return (
    <table className="w-full text-sm text-left">
      <thead>
        <tr className="text-xs uppercase text-[#8A8A8A]">
          <th className="pb-3 font-normal">Hop</th>
          <th className="pb-3 font-normal">Median</th>
          <th className="pb-3 font-normal">Max</th>
          <th className="pb-3 font-normal">n</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#E8E8E3] border-t border-[#E8E8E3]">
        {HOPS.map(({ key, label }) => {
          const hop = latency[key];
          return (
            <tr key={key}>
              <td className="py-3 text-[#111111]">{label}</td>
              <td className="py-3 font-mono text-[#5C5C5C]">{Math.round(hop.median_ms)}ms</td>
              <td className="py-3 font-mono text-[#5C5C5C]">{Math.round(hop.max_ms)}ms</td>
              <td className="py-3 font-mono text-[#8A8A8A]">{hop.n}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
