import type { SessionListItem } from "@/lib/types";

// R1: session list with candidate, role, language, competence, recommendation.

export function SessionList({
  sessions,
  selectedId,
  onSelect,
}: {
  sessions: SessionListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {sessions.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onSelect(s.id)}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
              selectedId === s.id ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
            }`}
          >
            <div className="font-medium">{s.candidate?.name ?? "Unknown candidate"}</div>
            <div className="text-xs opacity-70">
              {s.role?.title ?? "—"} · {s.spoken_language} · {s.language_condition}
            </div>
          </button>
        </li>
      ))}
      {sessions.length === 0 && <p className="px-3 py-2 text-sm text-zinc-400">No sessions yet.</p>}
    </ul>
  );
}
