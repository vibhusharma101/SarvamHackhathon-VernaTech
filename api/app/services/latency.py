"""Per-session latency reporting — median/max only, n visible (TRD §8).
With ~5 turns per session, "p95" is just the max wearing a lab coat; true
pooled p50/p95 belongs to the demo-day-wide endpoint, not this one."""

from statistics import median


def hop_stats(deltas_ms: list[float]) -> dict:
    if not deltas_ms:
        return {"median_ms": 0.0, "max_ms": 0.0, "n": 0}
    return {"median_ms": median(deltas_ms), "max_ms": max(deltas_ms), "n": len(deltas_ms)}


def session_latency(turns: list[dict]) -> dict:
    """turns: rows with t_speech_end, t_asr_final, t_llm_first_token,
    t_tts_first_byte (all timestamps, ms epoch). Missing hops are skipped."""

    def deltas(a_key: str, b_key: str) -> list[float]:
        out = []
        for t in turns:
            a, b = t.get(a_key), t.get(b_key)
            if a is not None and b is not None:
                out.append(b - a)
        return out

    return {
        "speech_end_to_asr_final": hop_stats(deltas("t_speech_end", "t_asr_final")),
        "asr_final_to_llm_first_token": hop_stats(deltas("t_asr_final", "t_llm_first_token")),
        "llm_first_token_to_tts_first_byte": hop_stats(deltas("t_llm_first_token", "t_tts_first_byte")),
        # playback_start is a client-reported timestamp; caller supplies it as t_playback_start on the turn dict if available.
        "tts_first_byte_to_playback_start": hop_stats(deltas("t_tts_first_byte", "t_playback_start")),
    }
