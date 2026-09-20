export interface RuleHit {
  id: string;
  label: string;
  category: string;
  weight: number;
  evidence: string;
}

export interface Rule {
  id: string;
  label: string;
  category: string;
  weight: number;
  patterns: RegExp[];
}
