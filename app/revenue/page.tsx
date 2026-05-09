"use client";

import { useEffect, useState } from "react";
import type { RiskScore, PostVisitUpdate } from "@/types";
import { RevenueChart } from "@/components/RevenueChart";
import { MOCK_APPOINTMENTS, mockRiskScores, MOCK_REVENUE_DATA } from "@/lib/mock-data";
import { formatCurrency, formatTime } from "@/lib/utils";
import { RiskBadge } from "@/components/RiskBadge";
import { TrendingUp, TrendingDown, Target, CheckCircle, XCircle } from "lucide-react";

export default function RevenuePage() {
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [updates, setUpdates] = useState<Record<string, PostVisitUpdate>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("risk-scores");
    setScores(saved ? JSON.parse(saved) : mockRiskScores(MOCK_APPOINTMENTS));
  }, []);

  async function markOutcome(patientId: string, showedUp: boolean) {
    setSubmitting(patientId);
    const update: PostVisitUpdate = {
      patient_id: patientId,
      showed_up: showedUp,
      rescheduled: !showedUp,
    };
    await fetch("/api/update-csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    setUpdates((prev) => ({ ...prev, [patientId]: update }));
    setSubmitting(null);
  }

  const totalRevenueRecovered = MOCK_REVENUE_DATA.reduce(
    (sum, d) => sum + (d.after - d.before),
    0
  );
  const latestNoShowRate = MOCK_REVENUE_DATA[MOCK_REVENUE_DATA.length - 1].noShowRate;
  const baselineNoShowRate = MOCK_REVENUE_DATA[0].noShowRate;
  const reduction = Math.round((1 - latestNoShowRate / baselineNoShowRate) * 100);

  const markedCount = Object.keys(updates).length;
  const showedCount = Object.values(updates).filter((u) => u.showed_up).length;
  const highRiskPredicted = scores.filter((s) => s.risk_level === "high").length;
  const highRiskActualNoShow = Object.entries(updates)
    .filter(([id, u]) => !u.showed_up && scores.find((s) => s.patient_id === id)?.risk_level === "high")
    .length;

  const accuracy =
    markedCount > 0
      ? Math.round(
          (scores
            .filter((s) => updates[s.patient_id])
            .filter((s) => {
              const pred = s.risk_level === "high";
              const actual = !updates[s.patient_id].showed_up;
              return pred === actual;
            }).length /
            markedCount) *
            100
        )
      : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenue Impact Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Before vs. after no-show rates and recovered revenue
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={TrendingUp}
          label="Total Revenue Recovered"
          value={formatCurrency(totalRevenueRecovered)}
          positive
        />
        <StatCard
          icon={TrendingDown}
          label="No-Show Rate Reduction"
          value={`${reduction}%`}
          positive
        />
        <StatCard
          icon={Target}
          label="Current No-Show Rate"
          value={`${Math.round(latestNoShowRate * 100)}%`}
        />
        <StatCard
          icon={CheckCircle}
          label="Model Accuracy"
          value={accuracy !== null ? `${accuracy}%` : "—"}
          sub={accuracy !== null ? `from ${markedCount} marked` : "mark outcomes below"}
        />
      </div>

      {/* Chart */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Revenue Trend (Before vs. After)</h2>
        <RevenueChart />
      </div>

      {/* Post-visit outcome logging */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="font-medium text-gray-700 text-sm">
            Mark Visit Outcomes — Trains Model Accuracy
          </h2>
        </div>
        <div className="divide-y">
          {scores.map((s) => {
            const outcome = updates[s.patient_id];
            return (
              <div key={s.patient_id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <RiskBadge level={s.risk_level} />
                  <div>
                    <p className="font-medium text-sm text-gray-900 truncate">{s.patient_name}</p>
                    <p className="text-xs text-gray-500">{formatTime(s.appointment_time)}</p>
                  </div>
                </div>
                {outcome ? (
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${
                      outcome.showed_up
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {outcome.showed_up ? (
                      <><CheckCircle className="w-3.5 h-3.5" /> Showed up</>
                    ) : (
                      <><XCircle className="w-3.5 h-3.5" /> No-show</>
                    )}
                  </span>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => markOutcome(s.patient_id, true)}
                      disabled={submitting === s.patient_id}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Showed Up
                    </button>
                    <button
                      onClick={() => markOutcome(s.patient_id, false)}
                      disabled={submitting === s.patient_id}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> No-Show
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  positive,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${positive ? "text-green-600" : "text-gray-900"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
