"use client";

import type { RiskScore } from "@/types";
import { RiskBadge } from "./RiskBadge";
import { riskRowColor, formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface RiskScoreTableProps {
  scores: RiskScore[];
  onSelectPatient?: (score: RiskScore) => void;
  selectedId?: string;
}

export function RiskScoreTable({ scores, onSelectPatient, selectedId }: RiskScoreTableProps) {
  const sorted = [...scores].sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="px-4 py-3 font-medium text-gray-600">Patient</th>
            <th className="px-4 py-3 font-medium text-gray-600">Time</th>
            <th className="px-4 py-3 font-medium text-gray-600">Risk</th>
            <th className="px-4 py-3 font-medium text-gray-600">Confidence</th>
            <th className="px-4 py-3 font-medium text-gray-600">Reasons</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((score) => (
            <tr
              key={score.patient_id}
              onClick={() => onSelectPatient?.(score)}
              className={cn(
                "transition-colors",
                riskRowColor(score.risk_level),
                onSelectPatient && "cursor-pointer hover:brightness-95",
                selectedId === score.patient_id && "ring-2 ring-inset ring-blue-400"
              )}
            >
              <td className="px-4 py-3 font-medium text-gray-900">{score.patient_name}</td>
              <td className="px-4 py-3 text-gray-600">{formatTime(score.appointment_time)}</td>
              <td className="px-4 py-3">
                <RiskBadge level={score.risk_level} score={score.risk_score} />
              </td>
              <td className="px-4 py-3 text-gray-600">{Math.round(score.confidence * 100)}%</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {score.reasons.map((r) => (
                    <span
                      key={r}
                      className="px-1.5 py-0.5 bg-white/70 border rounded text-xs text-gray-700"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RiskScoreTableSkeleton() {
  return (
    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
      <div className="p-4 border-b bg-gray-50">
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="px-4 py-3 border-b flex gap-4">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
      <p className="px-4 py-3 text-sm text-gray-400 animate-pulse">Analyzing appointments...</p>
    </div>
  );
}
