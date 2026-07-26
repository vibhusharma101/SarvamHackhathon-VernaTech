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
    <div className="flex flex-wrap gap-4" role="radiogroup" aria-label="Choose screen language">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          role="radio"
          aria-checked={value === lang.code}
          onClick={() => onChange(lang.code)}
          className={`rounded-full border px-6 py-2.5 text-sm font-medium transition-colors ${
            value === lang.code
              ? "border-[#0F5D5A] bg-[#0F5D5A] text-[#FFFFFF]"
              : "border-[#E8E8E3] bg-[#FFFFFF] text-[#5C5C5C] hover:border-[#111111] hover:text-[#111111]"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
