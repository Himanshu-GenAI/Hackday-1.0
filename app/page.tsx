"use client";

import { useState, useRef } from "react";
import { SAMPLES } from "@/lib/samples";
import ScoreGauge from "@/components/ScoreGauge";
import FlagCard from "@/components/FlagCard";
import StepsCard from "@/components/StepsCard";
import FamilyNote from "@/components/FamilyNote";
import TranscriptCard from "@/components/TranscriptCard";
import type { RuleHit } from "@/lib/rules/types";

interface AnalysisResult {
  trust: number;
  band: string;
  scam_type: string;
  flags: RuleHit[];
  verdict: string;
  next_steps: string[];
  family_note: string;
  transcript?: string;
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
  const [activeTab, setActiveTab] = useState<"text" | "audio">("text");
  const [text, setText] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | undefined) => {
    setError(null);
    if (!file) return;

    // Validate type
    const validTypes = [
      "audio/ogg",
      "audio/oga",
      "audio/mp3",
      "audio/mpeg",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/m4a",
      "audio/mp4",
      "audio/aac",
      "audio/webm",
      "audio/flac",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExts = ["ogg", "oga", "mp3", "wav", "m4a", "aac", "webm", "flac"];

    if (
      !file.type.startsWith("audio/") &&
      !validTypes.includes(file.type) &&
      (!ext || !validExts.includes(ext))
    ) {
      setError("Please upload a valid audio file (.ogg, .mp3, .wav, .m4a).");
      return;
    }

    // Validate size: 15 MB limit
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum audio file size is 15 MB.`
      );
      return;
    }

    setAudioFile(file);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.includes("base64,") ? res.split("base64,")[1] : res;
      setAudioBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeAudio = () => {
    setAudioFile(null);
    setAudioBase64(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const analyze = async () => {
    if (activeTab === "text" && !text.trim()) return;
    if (activeTab === "audio" && !audioBase64) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const payload =
        activeTab === "audio"
          ? {
              audio: audioBase64,
              mimeType: audioFile?.type || "audio/ogg",
            }
          : { text };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
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
    setActiveTab("text");
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

        {/* ── Segmented Tab Control ───────────────────────────── */}
        <div
          role="tablist"
          aria-label="Input mode"
          className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl mb-4 w-full max-w-xs mx-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "text"}
            onClick={() => setActiveTab("text")}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${
              activeTab === "text"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📝 Paste text
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "audio"}
            onClick={() => setActiveTab("audio")}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${
              activeTab === "audio"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🎙️ Voice note
          </button>
        </div>

        {/* ── Input card ──────────────────────────────────────── */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 mb-6">
          {activeTab === "text" ? (
            <>
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
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700/80 rounded-xl bg-slate-950/40 text-center">
              <input
                id="voice-file-input"
                ref={fileInputRef}
                type="file"
                accept="audio/*,.ogg,.oga,.mp3,.wav,.m4a"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleFileSelect(file);
                }}
              />
              {!audioFile ? (
                <>
                  <label
                    htmlFor="voice-file-input"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 border-violet-500 text-violet-400 hover:bg-violet-500/10 hover:border-violet-400 transition-colors cursor-pointer"
                  >
                    <span>🎙️</span> Choose audio file
                  </label>
                  <p className="text-xs text-slate-400 mt-3 max-w-sm leading-relaxed">
                    Forward the WhatsApp voice note to yourself, save it, upload here (.ogg, .mp3, .wav, .m4a — max 15 MB)
                  </p>
                </>
              ) : (
                <div className="w-full">
                  <div className="inline-flex items-center gap-2 max-w-full bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-full text-xs text-slate-200">
                    <span className="truncate">
                      🎙️ {audioFile.name} · {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    <button
                      type="button"
                      onClick={removeAudio}
                      aria-label="Remove audio file"
                      className="text-slate-400 hover:text-red-400 font-bold ml-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  {audioUrl && (
                    <audio
                      controls
                      src={audioUrl}
                      className="w-full mt-3 h-9 rounded-lg"
                      preload="metadata"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={analyze}
            disabled={
              loading ||
              (activeTab === "text" && !text.trim()) ||
              (activeTab === "audio" && !audioBase64)
            }
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
                {activeTab === "audio" ? "Transcribing & analyzing…" : "Analyzing…"}
              </span>
            ) : (
              activeTab === "audio" ? "Analyze voice note" : "Analyze message"
            )}
          </button>
        </div>

        {/* ── Error ───────────────────────────────────────────── */}
        {error && (
          <div
            role="alert"
            className="rounded-2xl bg-red-950/50 border border-red-800/50 p-4 mb-6 text-sm text-red-300 flex items-start justify-between gap-3 animate-fade-in-up"
          >
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="text-red-400 hover:text-red-200 text-xs px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
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
            {/* Transcript card */}
            {result.transcript && (
              <TranscriptCard transcript={result.transcript} />
            )}

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
                    ...(result.transcript
                      ? ["", `Transcript: "${result.transcript}"`]
                      : []),
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
