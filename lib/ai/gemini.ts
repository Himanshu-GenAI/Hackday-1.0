import type { RuleHit } from "../rules/types";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const SYSTEM_PROMPT = `You are a senior fraud analyst specializing in scams targeting Indians
(WhatsApp forwards, fake internships, digital arrest, UPI fraud, Hinglish messages).
Rules:
- Only report signals with concrete evidence present in the message. Never invent quotes.
- Each signal weight: 5 (mild) to 25 (strong). Never exceed 25.
- Do not duplicate obvious keyword hits already flagged by the rule engine; focus on tone,
  coercion, vagueness, and channel mismatch.
- If the message appears genuine, set scam_type to "genuine" and return an empty ai_signals array.
- next_steps: 2-4 short, concrete actions. When risk is high, include official reporting:
  call 1930 / visit cybercrime.gov.in.
- family_note: 1-2 simple sentences in easy Hinglish (Latin script) that a parent can understand.
- transcript: for audio input, verbatim transcription of everything said in the audio; for text input, an empty string "".`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    scam_type: {
      type: "STRING",
      enum: [
        "digital_arrest",
        "fake_job",
        "task_scam",
        "investment",
        "kyc_utility",
        "upi_collect",
        "loan_app",
        "voice_clone",
        "fake_support",
        "phishing",
        "unknown",
        "genuine",
      ],
    },
    ai_signals: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          label: { type: "STRING" },
          weight: { type: "NUMBER" },
          evidence: { type: "STRING" },
        },
        required: ["id", "label", "weight", "evidence"],
      },
    },
    verdict: { type: "STRING" },
    next_steps: { type: "ARRAY", items: { type: "STRING" } },
    family_note: { type: "STRING" },
    transcript: { type: "STRING" },
  },
  required: [
    "scam_type",
    "ai_signals",
    "verdict",
    "next_steps",
    "family_note",
    "transcript",
  ],
};

export interface GeminiResult {
  scam_type: string;
  ai_signals: { id: string; label: string; weight: number; evidence: string }[];
  verdict: string;
  next_steps: string[];
  family_note: string;
  transcript: string;
}

export async function analyzeWithGemini(
  text: string,
  ruleLabels: string[]
): Promise<GeminiResult | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const flaggedInfo =
      ruleLabels.length > 0 ? ruleLabels.join("; ") : "nothing";

    const prompt = `${SYSTEM_PROMPT}\n\nRule engine already flagged: ${flaggedInfo}.\n\nMESSAGE TO ANALYZE:\n"""\n${text}\n"""`;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;

    const parsed: GeminiResult = JSON.parse(raw);
    if (!parsed.transcript) {
      parsed.transcript = "";
    }
    return parsed;
  } catch {
    // Graceful degradation — rules-only mode
    return null;
  }
}

export async function analyzeAudioWithGemini(
  base64: string,
  mimeType: string
): Promise<GeminiResult | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const promptText = `${SYSTEM_PROMPT}\n\nFirst transcribe the audio verbatim (it may be Hindi, Hinglish, or English — transcribe exactly what is said, including filler threats/urgency). Then analyze the transcript as the message to analyze, following all the same rules.`;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;

    const parsed: GeminiResult = JSON.parse(raw);
    if (!parsed.transcript) {
      parsed.transcript = "";
    }
    return parsed;
  } catch {
    return null;
  }
}

export function geminiSignalsToHits(
  signals: GeminiResult["ai_signals"]
): RuleHit[] {
  return signals.map((s) => ({
    id: s.id,
    label: s.label,
    category: "ai",
    weight: Number(s.weight),
    evidence: s.evidence.length > 80 ? s.evidence.slice(0, 80) + "…" : s.evidence,
  }));
}
