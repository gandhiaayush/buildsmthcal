"use client";

import { useEffect, useState } from "react";
import type { RiskScore, PostVisitUpdate } from "@/types";
import { RevenueChart } from "@/components/RevenueChart";
import { MOCK_APPOINTMENTS, mockRiskScores, MOCK_REVENUE_DATA } from "@/lib/mock-data";
import { formatCurrency, formatTime } from "@/lib/utils";
import { RiskBadge } from "@/components/RiskBadge";
import {
  TrendingUp, TrendingDown, Target, CheckCircle, XCircle,
  DollarSign, BarChart2, Users,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const AVG_VISIT = Number(process.env.NEXT_PUBLIC_AVG_VISIT_VALUE ?? 250);

const PROCEDURE_BREAKDOWN = [
  { name: "Heart Surgery", count: 3, avg_value: 18000, no_shows: 1 },
  { name: "Brain Surgery", count: 2, avg_value: 22000, no_shows: 1 },
  { name: "Appendix Removal", count: 4, avg_value: 8500, no_shows: 0 },
  { name: "Ultrasound", count: 8, avg_value: 400, no_shows: 2 },
];

const DOCTOR_BREAKDOWN = [
  { name: "Dr. Reyes", appointments: 5, no_shows: 2, revenue: 42000 },
  { name: "Dr. Chen", appointments: 4, no_shows: 1, revenue: 91600 },
  { name: "Dr. Williams", appointments: 2, no_shows: 1, revenue: 44000 },
  { name: "Dr. Adams", appointments: 1, no_shows: 0, revenue: 8500 },
];

const INSURANCE_MIX = [
  { name: "Medicare", patients: 2, no_show_rate: 0.0 },
  { name: "Aetna", patients: 3, no_show_rate: 0.33 },
  { name: "Cigna", patients: 2, no_show_rate: 0.0 },
  { name: "Tricare", patients: 1, no_show_rate: 0.5 },
  { name: "No Insurance", patients: 1, no_show_rate: 1.0 },
];

export default function RevenuePage() {
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [updates, setUpdates] = useState<Record<string, PostVisitUpdate>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [projectionPct, setProjectionPct] = useState(30);

  useEffect(() => {
    const saved = sessionStorage.getItem("risk-scores");
    setScores(saved ? JSON.parse(saved) : mockRiskScores(MOCK_APPOINTMENTS));
  }, []);

  async function markOutcome(patientId: string, showedUp: boolean) {
    setSubmitting(patientId);
    const update: PostVisitUpdate = { patient_id: patientId, showed_up: showedUp, rescheduled: !showedUp };
    await fetch("/api/update-csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    setUpdates((prev) => ({ ...prev, [patientId]: update }));
    setSubmitting(null);
  }

  const totalRevenueRecovered = MOCK_REVENUE_DATA.reduce((s, d) => s + (d.after - d.before), 0);
  const latestRate = MOCK_REVENUE_DATA[MOCK_REVENUE_DATA.length - 1].noShowRate;
  const baselineRate = MOCK_REVENUE_DATA[0].noShowRate;
  const reduction = Math.round((1 - latestRate / baselineRate) * 100);

  const markedCount = Object.keys(updates).length;
  const accuracy =
    markedCount > 0
      ? Math.round(
          (scores
            .filter((s) => updates[s.patient_id])
            .filter((s) => (s.risk_level === "high") === !updates[s.patient_id].showed_up)
            .length /
            markedCount) *
            100
        )
      : null;

  const highRisk = scores.filter((s) => s.risk_level === "high").length;
  const monthlyRevenue = PROCEDURE_BREAKDOWN.reduce((s, p) => s + p.count * p.avg_value, 0);
  const projectedSaving = Math.round(monthlyRevenue * latestRate * (projectionPct / 100));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revenue Impact Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          No-show reduction analysis, procedure breakdown, and recovery projections
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Revenue Recovered (6mo)" value={formatCurrency(totalRevenueRecovered)} positive />
        <StatCard icon={TrendingDown} label="No-Show Rate Reduced" value={`${reduction}%`} positive />
        <StatCard icon={Target} label="Current No-Show Rate" value={`${Math.round(latestRate * 100)}%`} />
        <StatCard
          icon={CheckCircle}
          label="Model Accuracy"
          value={accuracy !== null ? `${accuracy}%` : "—"}
          sub={accuracy !== null ? `${markedCount} marked` : "mark outcomes below"}
        />
      </div>

      {/* Main chart */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Revenue Trend — Before vs. After AI Outreach</h2>
        <RevenueChart />
        <p className="text-xs text-gray-400 mt-3">
          "Before" baseline: clinic average prior to AI-assisted outreach. "After" reflects appointments that were
          converted from predicted no-shows via prep push, telehealth pivot, and voice reminders.
        </p>
      </div>

      {/* Procedure breakdown */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-blue-500" />
          <h2 className="font-semibold text-gray-900">Revenue by Procedure Type</h2>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {PROCEDURE_BREAKDOWN.map((p) => {
            const totalRevenue = p.count * p.avg_value;
            const lostRevenue = p.no_shows * p.avg_value;
            return (
              <div key={p.name} className="flex items-center gap-4">
                <div className="w-36 shrink-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.count} appts · {p.no_shows} no-show{p.no_shows !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex-1 relative h-7 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-lg flex items-center justify-end pr-2"
                    style={{ width: `${Math.min(100, (totalRevenue / 180000) * 100)}%` }}
                  >
                    {totalRevenue > 20000 && (
                      <span className="text-xs font-medium text-white">{formatCurrency(totalRevenue)}</span>
                    )}
                  </div>
                  {p.no_shows > 0 && (
                    <div
                      className="absolute right-0 top-0 h-full bg-red-400 rounded-r-lg flex items-center justify-end pr-2"
                      style={{ width: `${(lostRevenue / totalRevenue) * 100}%` }}
                    >
                      <span className="text-xs font-medium text-white">{formatCurrency(lostRevenue)} lost</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">Blue = collected revenue. Red overlay = no-show losses.</p>
      </div>

      {/* Doctor breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-purple-500" />
            <h2 className="font-semibold text-gray-900">By Physician</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b">
                <th className="pb-2 font-medium">Doctor</th>
                <th className="pb-2 font-medium text-right">Appts</th>
                <th className="pb-2 font-medium text-right">No-shows</th>
                <th className="pb-2 font-medium text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {DOCTOR_BREAKDOWN.map((d) => (
                <tr key={d.name}>
                  <td className="py-2 font-medium text-gray-800">{d.name}</td>
                  <td className="py-2 text-right text-gray-600">{d.appointments}</td>
                  <td className="py-2 text-right text-red-500">{d.no_shows}</td>
                  <td className="py-2 text-right text-gray-800">{formatCurrency(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Insurance mix */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-green-500" />
            <h2 className="font-semibold text-gray-900">No-Show Rate by Insurance</h2>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={INSURANCE_MIX} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${Math.round(v * 100)}%`} />
              <Bar dataKey="no_show_rate" radius={[4, 4, 0, 0]}>
                {INSURANCE_MIX.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.no_show_rate > 0.4 ? "#ef4444" : entry.no_show_rate > 0.2 ? "#f59e0b" : "#22c55e"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Projection calculator */}
      <div className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
        <h2 className="font-semibold text-gray-900">Impact Projection Calculator</h2>
        <p className="text-sm text-gray-500">
          Current no-show rate is <strong>{Math.round(latestRate * 100)}%</strong>. Monthly procedure revenue at risk:
          {" "}<strong>{formatCurrency(Math.round(monthlyRevenue * latestRate))}</strong>.
          Drag to see projected recovery.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Reduce no-shows by</span>
            <span className="font-bold text-blue-700 text-lg">{projectionPct}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={90}
            step={5}
            value={projectionPct}
            onChange={(e) => setProjectionPct(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-500 font-medium">Monthly Recovery</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(projectedSaving)}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-xs text-green-500 font-medium">Annual Recovery</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(projectedSaving * 12)}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <p className="text-xs text-purple-500 font-medium">New No-Show Rate</p>
              <p className="text-xl font-bold text-purple-700">
                {Math.max(0, Math.round(latestRate * (1 - projectionPct / 100) * 100))}%
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Based on average procedure revenue of {formatCurrency(Math.round(monthlyRevenue / PROCEDURE_BREAKDOWN.reduce((s, p) => s + p.count, 0)))} per visit.
          Projections are estimates — actual results vary by clinic type and outreach effectiveness.
        </p>
      </div>

      {/* Post-visit outcome logger */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="font-medium text-gray-700 text-sm">Mark Visit Outcomes — Trains Model Accuracy</h2>
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
                  <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${
                    outcome.showed_up
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {outcome.showed_up ? <><CheckCircle className="w-3.5 h-3.5" /> Showed up</> : <><XCircle className="w-3.5 h-3.5" /> No-show</>}
                  </span>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => markOutcome(s.patient_id, true)} disabled={submitting === s.patient_id}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Showed Up
                    </button>
                    <button onClick={() => markOutcome(s.patient_id, false)} disabled={submitting === s.patient_id}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
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

function StatCard({ icon: Icon, label, value, sub, positive }: {
  icon: React.ElementType; label: string; value: string; sub?: string; positive?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${positive ? "text-green-600" : "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
