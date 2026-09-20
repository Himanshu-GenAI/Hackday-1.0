"use client";

import { useEffect, useState } from "react";

const BAND_COLORS: Record<string, string> = {
  safe: "#22c55e",
  suspicious: "#eab308",
  high_risk: "#f97316",
  scam: "#ef4444",
};

interface ScoreGaugeProps {
  trust: number;
  band: string;
}

export default function ScoreGauge({ trust, band }: ScoreGaugeProps) {
  const [offset, setOffset] = useState(339.292);
  const circumference = 2 * Math.PI * 54; // ≈ 339.292
  const color = BAND_COLORS[band] ?? "#ef4444";

  useEffect(() => {
    // Small delay to trigger CSS transition from full to target
    const timer = setTimeout(() => {
      setOffset(circumference * (1 - trust / 100));
    }, 50);
    return () => clearTimeout(timer);
  }, [trust, circumference]);

  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      <svg
        width={130}
        height={130}
        viewBox="0 0 120 120"
        aria-label={`Trust score ${trust} out of 100`}
        role="img"
      >
        {/* Track circle */}
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="#1e293b"
          strokeWidth="10"
        />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 900ms ease-out",
            transform: "rotate(-90deg)",
            transformOrigin: "center",
          }}
        />
        {/* Score number */}
        <text
          x="60"
          y="56"
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize="28"
          fontWeight="bold"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        >
          {trust}
        </text>
        {/* Caption */}
        <text
          x="60"
          y="78"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#94a3b8"
          fontSize="10"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        >
          trust score
        </text>
      </svg>
    </div>
  );
}
