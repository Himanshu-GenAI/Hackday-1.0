interface TranscriptCardProps {
  transcript: string;
}

export default function TranscriptCard({ transcript }: TranscriptCardProps) {
  if (!transcript || !transcript.trim()) return null;

  return (
    <div
      aria-label="Audio transcription"
      className="rounded-2xl bg-slate-900 border border-slate-800 border-l-4 border-l-violet-500 p-5 opacity-0 animate-fade-in-up"
    >
      <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center gap-2">
        <span>🎙️</span> What we heard
      </h3>
      <blockquote className="text-sm text-slate-300 italic bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 leading-relaxed break-words">
        &ldquo;{transcript}&rdquo;
      </blockquote>
    </div>
  );
}
