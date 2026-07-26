// Typed REST wrappers over the FastAPI contract (TRD §6). Frontend never
// talks to Supabase directly — everything goes through here.

import type {
  CreateSessionRequest,
  CreateSessionResponse,
  HarnessPairResult,
  InterviewStartResponse,
  Scorecard,
  SessionLatency,
  SessionListItem,
  SessionTurn,
  WritebackResult,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createSession: (body: CreateSessionRequest) =>
    request<CreateSessionResponse>("/sessions", { method: "POST", body: JSON.stringify(body) }),

  listSessions: () => request<SessionListItem[]>("/sessions"),

  getScorecard: (sessionId: string) => request<Scorecard>(`/sessions/${sessionId}/scorecard`),

  getLatency: (sessionId: string) => request<SessionLatency>(`/sessions/${sessionId}/latency`),

  getTurns: (sessionId: string) => request<SessionTurn[]>(`/sessions/${sessionId}/turns`),

  startInterview: () => request<InterviewStartResponse>("/interview/start", { method: "POST" }),

  uploadFallbackAudio: async (sessionId: string, file: File) => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/upload`, { method: "POST", body: file });
    if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<{ turn_id: string | null }>;
  },

  score: (sessionId: string) => request<{ scoring_pass_id: string }>(`/sessions/${sessionId}/score`, { method: "POST" }),

  rescore: (sessionId: string) =>
    request<{ scoring_pass_id: string }>(`/sessions/${sessionId}/rescore`, { method: "POST" }),

  writeback: (sessionId: string) => request<WritebackResult>(`/sessions/${sessionId}/writeback`, { method: "POST" }),

  runHarness: (profileLabels?: string[]) =>
    request<HarnessPairResult[]>("/harness/run", {
      method: "POST",
      body: JSON.stringify({ profile_labels: profileLabels ?? null }),
    }),

  getHarnessResults: () => request<HarnessPairResult[]>("/harness/results"),

  resetDemo: () => request<{ status: string }>("/admin/reset", { method: "POST" }),
};
