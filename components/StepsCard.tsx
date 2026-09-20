interface StepsCardProps {
  steps: string[];
  verdict: string;
}

export default function StepsCard({ steps, verdict }: StepsCardProps) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 opacity-0 animate-fade-in-up"
      style={{ animationDelay: "240ms" }}
    >
      <h3 className="text-lg font-semibold text-slate-100 mb-3">
        ✅ What to do next
      </h3>
      <ol className="list-decimal list-inside space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="text-sm text-slate-200 leading-relaxed">
            {step}
          </li>
        ))}
      </ol>
      {verdict && (
        <p className="mt-4 text-sm text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
          {verdict}
        </p>
      )}
    </div>
  );
}
