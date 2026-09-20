"use client";

import { useState, useRef } from "react";
import { SAMPLES } from "@/lib/samples";
import ScoreGauge from "@/components/ScoreGauge";
import FlagCard from "@/components/FlagCard";
import StepsCard from "@/components/StepsCard";
import FamilyNote from "@/components/FamilyNote";
import type { RuleHit } from "@/lib/rules/types";

interface AnalysisResult {
  trust: number;
  band: string;
  scam_type: string;
  flags: RuleHit[];
  verdict: string;
  next_steps: string[];
  family_note: string;
  entities: { upi: string[]; amounts: string[] };
}

const BAND_LABELS: Record<string, string> = {
  safe: "Likely Genuine",
  suspicious: "Suspicious",
  high_risk: "High Risk",
  scam: "Almost Certainly a Scam",
};

const BAND_COLORS: Record<string, string> = {
  safe: "text-green-500",
  suspicious: "text-yellow-500",
  high_risk: "text-orange-500",
  scam: "text-red-500",
};

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Analysis failed");
        return;
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (sampleText: string) => {
    setText(sampleText);
    setResult(null);
    setError(null);
    textareaRef.current?.focus();
  };

  const riskFlags = result?.flags.filter((f) => f.weight > 0) ?? [];
  const legitimacyFlags = result?.flags.filter((f) => f.weight < 0) ?? [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 relative overflow-x-hidden">
      {/* Violet glow background */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-20"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(124,58,237,0.5) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        {/* ── Header ──────────────────────────────────────────── */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            🛡️ ScamShield
          </h1>
          <p className="text-slate-400 text-base mb-3">
            Paste any suspicious message. Get an explainable Trust Score.
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-full px-3 py-1">
            Explainable AI · Privacy-first · Nothing stored
          </span>
        </header>

        {/* ── Sample chips ────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => loadSample(s.text)}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:border-violet-500 hover:text-violet-400 transition-colors cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Input card ──────────────────────────────────────── */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 mb-6">
          <label htmlFor="message-input" className="sr-only">
            Paste suspicious message
          </label>
          <div className="relative">
            <textarea
              id="message-input"
              ref={textareaRef}
              rows={7}
              placeholder="Paste the WhatsApp forward, job offer, email, or SMS here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-slate-100 placeholder:text-slate-500 resize-none focus:outline-none focus:border-violet-500 transition-colors"
            />
            <span className="absolute bottom-3 right-3 text-xs text-slate-600">
              {text.length}
            </span>
          </div>
          <button
            onClick={analyze}
            disabled={!text.trim() || loading}
            className="mt-3 w-full py-2.5 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Analyzing…
              </span>
            ) : (
              "Analyze message"
            )}
          </button>
        </div>

        {/* ── Error ───────────────────────────────────────────── */}
        {error && (
          <div className="rounded-2xl bg-red-950/50 border border-red-800/50 p-4 mb-6 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* ── Skeleton loading ────────────────────────────────── */}
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="w-[130px] h-[130px] rounded-full bg-slate-800" />
              <div className="flex-1 space-y-3 w-full">
                <div className="h-6 bg-slate-800 rounded w-3/4" />
                <div className="h-4 bg-slate-800 rounded w-1/2" />
                <div className="h-3 bg-slate-800 rounded w-1/3" />
              </div>
            </div>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
              <div className="h-4 bg-slate-800 rounded w-full" />
              <div className="h-4 bg-slate-800 rounded w-5/6" />
            </div>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
              <div className="h-4 bg-slate-800 rounded w-2/3" />
              <div className="h-4 bg-slate-800 rounded w-1/2" />
            </div>
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────── */}
        {result && (
          <div className="space-y-4">
            {/* Verdict card */}
            <div
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-col sm:flex-row items-center gap-5 opacity-0 animate-fade-in-up"
            >
              <ScoreGauge trust={result.trust} band={result.band} />
              <div className="flex-1 text-center sm:text-left">
                <p
                  className={`text-2xl font-bold ${BAND_COLORS[result.band] ?? "text-red-500"}`}
                >
                  {BAND_LABELS[result.band] ?? result.band}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Detected type:{" "}
                  <span className="text-slate-200 font-medium">
                    {result.scam_type.replace(/_/g, " ")}
                  </span>
                </p>
                {/* Entity chips */}
                {(result.entities.upi.length > 0 ||
                  result.entities.amounts.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
                    {result.entities.upi.map((u) => (
                      <span
                        key={u}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700"
                      >
                        UPI: {u}
                      </span>
                    ))}
                    {result.entities.amounts.map((a) => (
                      <span
                        key={a}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700"
                      >
                        Amount: {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Flags card */}
            {(riskFlags.length > 0 || legitimacyFlags.length > 0) && (
              <div
                className="rounded-2xl bg-slate-900 border border-slate-800 p-5 opacity-0 animate-fade-in-up"
                style={{ animationDelay: "80ms" }}
              >
                <h3 className="text-lg font-semibold text-slate-100 mb-3">
                  🚩 Red flags ({riskFlags.length}) — every deduction explained
                </h3>
                <div className="space-y-2">
                  {riskFlags.map((flag, i) => (
                    <FlagCard key={`${flag.id}-${i}`} flag={flag} index={i} />
                  ))}
                </div>

                {legitimacyFlags.length > 0 && (
                  <>
                    <h4 className="text-sm font-semibold text-green-400 mt-4 mb-2">
                      ✅ Legitimacy signals
                    </h4>
                    <div className="space-y-2">
                      {legitimacyFlags.map((flag, i) => (
                        <FlagCard
                          key={`${flag.id}-${i}`}
                          flag={flag}
                          index={riskFlags.length + i}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Steps card */}
            <StepsCard
              steps={result.next_steps}
              verdict={result.verdict}
            />

            {/* Family note */}
            <FamilyNote note={result.family_note} />

            {/* ── Phase 2 bonus: Copy report + WhatsApp share ── */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  const report = [
                    `ScamShield Trust Score: ${result.trust}/100 (${BAND_LABELS[result.band]})`,
                    `Type: ${result.scam_type.replace(/_/g, " ")}`,
                    "",
                    "Red flags:",
                    ...result.flags
                      .filter((f) => f.weight > 0)
                      .map((f) => `  [+${f.weight}] ${f.label}: "${f.evidence}"`),
                    ...(legitimacyFlags.length > 0
                      ? [
                          "",
                          "Legitimacy signals:",
                          ...legitimacyFlags.map(
                            (f) => `  [${f.weight}] ${f.label}: "${f.evidence}"`
                          ),
                        ]
                      : []),
                    "",
                    result.verdict,
                  ].join("\n");
                  navigator.clipboard.writeText(report);
                }}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:border-violet-500 hover:text-violet-400 transition-colors cursor-pointer"
              >
                📋 Copy report
              </button>
              {result.family_note && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `🛡️ ScamShield Alert (Trust: ${result.trust}/100)\n\n${result.family_note}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 rounded-xl text-sm font-medium bg-green-900/40 border border-green-700/50 text-green-400 hover:bg-green-900/60 transition-colors text-center"
                >
                  💬 Share on WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="mt-12 text-center text-xs text-slate-500 border-t border-slate-800 pt-6">
          ⚠️ ScamShield is a risk-assistance tool, not a legal authority.
          Scammed? Call{" "}
          <span className="text-slate-300 font-semibold">1930</span> or visit{" "}
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:underline"
          >
            cybercrime.gov.in
          </a>{" "}
          immediately.
        </footer>
      </div>
    </main>
  );
}
