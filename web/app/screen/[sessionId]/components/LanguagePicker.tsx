"use client";

import type { SpokenLanguage } from "@/lib/types";

const LANGUAGES: { code: SpokenLanguage; label: string }[] = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "te-IN", label: "తెలుగు" },
];

export function LanguagePicker({
  value,
  onChange,
}: {
  value: SpokenLanguage | null;
  onChange: (lang: SpokenLanguage) => void;
}) {
  return (
    <div className="flex gap-3" role="radiogroup" aria-label="Choose screen language">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          role="radio"
          aria-checked={value === lang.code}
          onClick={() => onChange(lang.code)}
          className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
            value === lang.code
              ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
              : "border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
