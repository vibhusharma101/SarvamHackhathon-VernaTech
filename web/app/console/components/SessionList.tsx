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
            className={`w-full text-left transition-colors px-4 py-3 rounded-lg ${
              selectedId === s.id
                ? "border-l-2 border-[#0F5D5A] bg-[#EAF6F4]/40 text-[#111111]"
                : "border-l-2 border-transparent bg-transparent text-[#5C5C5C] hover:bg-[#F5F5F2]"
            }`}
          >
            <div className={`font-medium ${selectedId === s.id ? "text-[#111111]" : "text-[#111111]"}`}>
              {s.candidate?.name ?? "Unknown candidate"}
            </div>
            <div className={`text-xs mt-1 ${selectedId === s.id ? "text-[#0F5D5A]" : "text-[#8A8A8A]"}`}>
              {s.role?.title ?? "—"} · {s.spoken_language} · {s.language_condition}
            </div>
          </button>
        </li>
      ))}
      {sessions.length === 0 && <p className="p-3 text-sm text-[#8A8A8A]">No sessions yet.</p>}
    </ul>
  );
}
