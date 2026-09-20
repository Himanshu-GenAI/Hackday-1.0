import { NextRequest, NextResponse } from "next/server";
import { runRules, ruleRisk } from "@/lib/rules/engine";
import { extractUrls, extractUpiHandles, extractAmounts } from "@/lib/checks/entities";
import { checkDomain } from "@/lib/checks/rdap";
import { analyzeWithGemini, analyzeAudioWithGemini, geminiSignalsToHits } from "@/lib/ai/gemini";
import type { RuleHit } from "@/lib/rules/types";

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getBand(trust: number): string {
  if (trust >= 75) return "safe";
  if (trust >= 50) return "suspicious";
  if (trust >= 25) return "high_risk";
  return "scam";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string | undefined = body?.text;
    const audio: string | undefined = body?.audio;
    const mimeType: string | undefined = body?.mimeType;

    // Empty body (no text AND no audio) → 400
    if (!audio && (!text || !text.trim())) {
      return NextResponse.json({ error: "Nothing to analyze" }, { status: 400 });
    }

    if (audio) {
      // ── Audio branch ──────────────────────────────────────────
      let cleanBase64 = audio;
      if (cleanBase64.includes("base64,")) {
        cleanBase64 = cleanBase64.split("base64,")[1];
      }
      const mime = mimeType || "audio/ogg";

      // a. Call analyzeAudioWithGemini. If null → 502
      const ai = await analyzeAudioWithGemini(cleanBase64, mime);
      if (!ai) {
        return NextResponse.json(
          { error: "Audio analysis failed. Try pasting the text instead." },
          { status: 502 }
        );
      }

      const transcript = ai.transcript || "";

      // b. Run the EXISTING rule engine on the returned transcript
      const ruleHits = runRules(transcript);

      // c. Extract URLs from the transcript and run existing RDAP checks (max 3, parallel)
      const urls = extractUrls(transcript).slice(0, 3);
      const upi = extractUpiHandles(transcript);
      const amounts = extractAmounts(transcript);

      const domainResults = (
        await Promise.all(urls.map((u) => checkDomain(u)))
      ).filter((d) => d !== null);

      // d. Fuse scores exactly like the text path
      const aiHits: RuleHit[] = geminiSignalsToHits(ai.ai_signals);

      const domainFlags: RuleHit[] = domainResults
        .filter((d) => d.weight > 0)
        .map((d) => ({
          id: "domain_age",
          label: d.note,
          category: "live",
          weight: d.weight,
          evidence: d.domain,
        }));

      const domainWeight = domainResults.reduce((s, d) => s + d.weight, 0);
      const aiWeight = aiHits.reduce((s, h) => s + h.weight, 0);
      const raw = ruleRisk(ruleHits) + domainWeight + aiWeight;
      const risk = clamp(raw, 3, 100);
      const trust = 100 - risk;
      const band = getBand(trust);

      const flags = [...ruleHits, ...aiHits, ...domainFlags].sort(
        (a, b) => Math.abs(b.weight) - Math.abs(a.weight)
      );

      const scam_type = ai.scam_type ?? "unknown";
      const verdict = ai.verdict ?? "Analysis complete.";
      const next_steps = ai.next_steps ?? [
        "Verify the sender through official channels before acting.",
        "Never pay any fee to receive a job, prize, or refund.",
        "Report scams: call 1930 or visit cybercrime.gov.in",
      ];
      const family_note = ai.family_note ?? "";

      // e. Response = same shape as text path + one new field: "transcript"
      return NextResponse.json({
        trust,
        band,
        scam_type,
        flags,
        verdict,
        next_steps,
        family_note,
        transcript,
        entities: { upi, amounts },
      });
    }

    // ── Text branch (audio is absent) ─────────────────────────
    const messageText = text as string;

    // ── Layer 1: Rule engine ──────────────────────────────────
    const ruleHits = runRules(messageText);

    // ── Entity extraction ─────────────────────────────────────
    const urls = extractUrls(messageText).slice(0, 3);
    const upi = extractUpiHandles(messageText);
    const amounts = extractAmounts(messageText);

    // ── Layer 2: RDAP domain-age checks (parallel) ────────────
    const domainResults = (
      await Promise.all(urls.map((u) => checkDomain(u)))
    ).filter((d) => d !== null);

    // ── Layer 3: Gemini AI analysis ───────────────────────────
    const ai = await analyzeWithGemini(
      messageText,
      ruleHits.map((h) => h.label)
    );

    // ── Fuse AI signals into RuleHit[] ────────────────────────
    const aiHits: RuleHit[] = ai ? geminiSignalsToHits(ai.ai_signals) : [];

    // ── Domain flags (only those with weight > 0) ─────────────
    const domainFlags: RuleHit[] = domainResults
      .filter((d) => d.weight > 0)
      .map((d) => ({
        id: "domain_age",
        label: d.note,
        category: "live",
        weight: d.weight,
        evidence: d.domain,
      }));

    // ── Score fusion ──────────────────────────────────────────
    const domainWeight = domainResults.reduce((s, d) => s + d.weight, 0);
    const aiWeight = aiHits.reduce((s, h) => s + h.weight, 0);
    const raw = ruleRisk(ruleHits) + domainWeight + aiWeight;
    const risk = clamp(raw, 3, 100);
    const trust = 100 - risk;
    const band = getBand(trust);

    // ── Merge & sort all flags by |weight| descending ─────────
    const flags = [...ruleHits, ...aiHits, ...domainFlags].sort(
      (a, b) => Math.abs(b.weight) - Math.abs(a.weight)
    );

    // ── Scam type + verdict + next_steps + family_note ────────
    const scam_type = ai?.scam_type ?? "unknown";
    const verdict =
      ai?.verdict ?? "Rule-based analysis only (AI layer unavailable).";
    const next_steps = ai?.next_steps ?? [
      "Verify the sender through official channels before acting.",
      "Never pay any fee to receive a job, prize, or refund.",
      "Report scams: call 1930 or visit cybercrime.gov.in",
    ];
    const family_note = ai?.family_note ?? "";

    return NextResponse.json({
      trust,
      band,
      scam_type,
      flags,
      verdict,
      next_steps,
      family_note,
      transcript: "",
      entities: { upi, amounts },
    });
  } catch {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
