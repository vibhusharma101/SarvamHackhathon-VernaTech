"use client";

export function FileUploadFallback({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  return (
    <div className="border border-dashed border-[#E8E8E3] bg-[#FFFFFF] p-8 text-center transition-colors hover:border-[#111111]">
      <label className="flex cursor-pointer flex-col items-center gap-3">
        <span className="font-medium text-[#111111]">Upload a WAV recording instead</span>
        <span className="text-xs text-[#5C5C5C]">Click to browse or drag and drop</span>
        <input
          type="file"
          accept="audio/wav"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />
      </label>
    </div>
  );
}
