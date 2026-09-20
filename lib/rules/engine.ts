import { RULES } from "./lexicon";
import type { RuleHit } from "./types";

export function runRules(text: string): RuleHit[] {
  const hits: RuleHit[] = [];
  for (const rule of RULES) {
    for (const p of rule.patterns) {
      const m = text.match(p);
      if (m) {
        hits.push({
          id: rule.id,
          label: rule.label,
          category: rule.category,
          weight: rule.weight,
          evidence: m[0].length > 80 ? m[0].slice(0, 80) + "…" : m[0],
        });
        break; // first matching pattern wins per rule
      }
    }
  }
  return hits;
}

export function ruleRisk(hits: RuleHit[]): number {
  return hits.reduce((s, h) => s + h.weight, 0);
}
