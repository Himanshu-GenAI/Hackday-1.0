interface FamilyNoteProps {
  note: string;
}

export default function FamilyNote({ note }: FamilyNoteProps) {
  if (!note) return null;

  return (
    <div
      className="rounded-2xl bg-violet-950/40 border border-violet-800/40 p-5 opacity-0 animate-fade-in-up"
      style={{ animationDelay: "320ms" }}
    >
      <h3 className="text-lg font-semibold text-violet-300 mb-2">
        👨‍👩‍👧 Forward this to your family
      </h3>
      <p className="text-sm text-slate-200 leading-relaxed">{note}</p>
    </div>
  );
}
