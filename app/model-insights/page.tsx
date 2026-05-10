"use client";

import { useEffect, useState } from "react";
import { MOCK_APPOINTMENTS, mockRiskScores } from "@/lib/mock-data";
import { PATIENT_HEALTH } from "@/lib/patient-data";
import type { AppointmentRow, RiskScore } from "@/types";
import {
  Brain, TrendingUp, AlertTriangle, Shield, Zap,
  BarChart2, ChevronRight, CheckCircle, Info,
} from "lucide-react";

type ModelStats = {
  n_outcomes: number;
  accuracy: number;
  auc: number | null;
  ppo_alpha: number;
  ppo_beta: number;
  ppo_updates: number;
  no_show_rate: number;
  false_negative_rate: number;
  message?: string;
};

type FeatureImportance = { feature: string; importance: number };

type OverbookRec = {
  expected_no_shows: number;
  recommended_overbook: number;
  safety_factor: number;
  day_of_week: string;
  high_risk_count: number;
  high_risk_patients: any[];
  slots: any[];
  surgical_warning: string | null;
  total_appointments: number;
};

type InterventionResult = {
  patient_name: string;
  patient_id: string;
  risk_score: number;
  priority: string;
  interventions: { name: string; expected_reduction_pct: number; cost: string; evidence: string }[];
  estimated_reduction_pct: number;
  estimated_final_risk: number;
};

const PRIORITY_PILL: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  low: "bg-green-100 text-green-800 border-green-300",
};

const COST_PILL: Record<string, string> = {
  low: "text-green-600",
  medium: "text-amber-600",
  high: "text-red-600",
};

export default function ModelInsightsPage() {
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [features, setFeatures] = useState<FeatureImportance[]>([]);
  const [overbookRec, setOverbookRec] = useState<OverbookRec | null>(null);
  const [interventions, setInterventions] = useState<InterventionResult[]>([]);
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [backendLive, setBackendLive] = useState<boolean | null>(null);

  useEffect(() => {
    const savedScores = sessionStorage.getItem("risk-scores");
    const savedAppts = sessionStorage.getItem("appointments");
    const appts: AppointmentRow[] = savedAppts ? JSON.parse(savedAppts) : MOCK_APPOINTMENTS;
    const sc: RiskScore[] = savedScores ? JSON.parse(savedScores) : mockRiskScores(appts);
    setScores(sc);

    // Hit backend for live data
    (async () => {
      try {
        const health = await fetch("http://localhost:8000/health").then((r) => r.json());
        setBackendLive(true);

        const [statsRes, featRes] = await Promise.all([
          fetch("http://localhost:8000/model/stats").then((r) => r.json()),
          fetch("http://localhost:8000/model/features").then((r) => r.json()),
        ]);
        setStats(statsRes);
        setFeatures(featRes.importance?.slice(0, 10) ?? []);

        // Overbooking recommendation
        const obRes = await fetch("http://localhost:8000/overbooking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scores: sc }),
        }).then((r) => r.json());
        setOverbookRec(obRes);

        // Per-patient interventions (top 5 by risk)
        const sorted = [...sc].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);
        const invResults = await Promise.all(
          sorted.map(async (s) => {
            const appt = appts.find((a) => a.patient_id === s.patient_id);
            const health = PATIENT_HEALTH[s.patient_id];
            const invRes = await fetch("http://localhost:8000/interventions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                patient: {
                  ...(health ?? {}),
                  prior_no_shows: appt?.prior_no_shows ?? 0,
                  distance_miles: health ? (Math.abs(health.member_id.charCodeAt(0)) % 15) + 2 : 5,
                  lead_time_days: 14,
                },
                appointment: appt ?? {},
                risk_score: s.risk_score,
              }),
            }).then((r) => r.json());
            return { patient_name: s.patient_name, patient_id: s.patient_id, risk_score: s.risk_score, ...invRes };
          })
        );
        setInterventions(invResults);
      } catch {
        setBackendLive(false);
      }
    })();
  }, []);

  const maxImportance = features[0]?.importance ?? 1;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Model Insights</h1>
          <p className="text-gray-500 text-sm mt-0.5">PPO-enhanced risk scoring · feature importance · overbooking engine</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${
          backendLive === true ? "bg-green-50 text-green-700 border-green-200"
          : backendLive === false ? "bg-red-50 text-red-700 border-red-200"
          : "bg-gray-50 text-gray-500 border-gray-200"
        }`}>
          <span className={`w-2 h-2 rounded-full ${backendLive ? "bg-green-500 animate-pulse" : backendLive === false ? "bg-red-500" : "bg-gray-400"}`} />
          {backendLive === true ? "Backend live" : backendLive === false ? "Backend offline (mock mode)" : "Connecting…"}
        </div>
      </div>

      {/* Model architecture card */}
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-indigo-300" />
          <h2 className="font-semibold text-lg">Model Architecture</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            { title: "Base Model", detail: "Gradient Boosting Classifier", note: "200 estimators, depth 4, subsample 0.8" },
            { title: "PPO Adapter", detail: "Linear (α, β) on log-odds", note: "σ(α + β·logit(base_prob)) — online updates" },
            { title: "Features", detail: "27-dimensional input", note: "Age, race (SDOH), distance, history, timing, insurance, severity" },
          ].map(({ title, detail, note }) => (
            <div key={title} className="bg-white/10 rounded-xl p-4">
              <p className="text-indigo-300 text-xs font-semibold uppercase tracking-wide">{title}</p>
              <p className="text-white font-medium mt-1">{detail}</p>
              <p className="text-indigo-200 text-xs mt-1">{note}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-white/5 rounded-xl p-4 text-xs text-indigo-200 space-y-1 font-mono">
          <p className="text-indigo-100 font-semibold not-italic text-sm mb-2">PPO Clipped Objective</p>
          <p>r(θ) = π_θ(a|s) / π_old(a|s)</p>
          <p>L_CLIP = E[min(r(θ)·A,  clip(r(θ), 1–ε, 1+ε)·A)]</p>
          <p>ε = 0.20 · updated on each logged patient outcome</p>
        </div>
      </div>

      {/* Live PPO stats */}
      {stats && !stats.message && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "PPO Updates", value: stats.ppo_updates, color: "text-indigo-700" },
            { label: "Outcomes Logged", value: stats.n_outcomes, color: "text-gray-900" },
            { label: "Accuracy", value: stats.accuracy ? `${Math.round(stats.accuracy * 100)}%` : "—", color: "text-green-700" },
            { label: "AUC-ROC", value: stats.auc ?? "—", color: "text-blue-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {stats?.message && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          {stats.message} Log patient outcomes from the Update CSV tab to start PPO learning.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Feature importance */}
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-gray-900">Feature Importance (Top 10)</h2>
          </div>
          {features.length === 0 ? (
            <p className="text-gray-400 text-sm">Connect backend to load feature importance.</p>
          ) : (
            <div className="space-y-2.5">
              {features.map((f, idx) => (
                <div key={f.feature}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{f.feature}</span>
                    <span className="text-gray-500 font-mono text-xs">{(f.importance * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${(f.importance / maxImportance) * 100}%`,
                               opacity: 1 - idx * 0.08 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-4">
            Race/ethnicity used only as SDOH access-barrier proxy. Model audited for disparate impact.
          </p>
        </div>

        {/* Overbooking recommendation */}
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h2 className="font-semibold text-gray-900">Overbooking Recommendation</h2>
          </div>
          {overbookRec ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-600">Expected No-Shows</p>
                  <p className="text-2xl font-bold text-emerald-800">{overbookRec.expected_no_shows}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-600">Recommended Extra Slots</p>
                  <p className="text-2xl font-bold text-blue-800">{overbookRec.recommended_overbook}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Safety factor ({overbookRec.day_of_week})</span>
                  <span className="font-medium">{(overbookRec.safety_factor * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Total appointments</span>
                  <span className="font-medium">{overbookRec.total_appointments}</span>
                </div>
                <div className="flex justify-between">
                  <span>High-risk patients</span>
                  <span className="font-medium text-red-600">{overbookRec.high_risk_count}</span>
                </div>
              </div>
              {overbookRec.surgical_warning && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                  {overbookRec.surgical_warning}
                </div>
              )}
              {overbookRec.recommended_overbook === 0 && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  No overbooking needed — risk scores are low.
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Connect backend to get live overbooking recommendation.</p>
          )}
        </div>
      </div>

      {/* Intervention recommendations */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" />
          <h2 className="font-semibold text-gray-900">Evidence-Based Intervention Plan</h2>
          <span className="ml-auto text-xs text-gray-400">Top 5 by risk score</span>
        </div>
        {interventions.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            Connect backend to generate intervention recommendations.
          </div>
        ) : (
          <div className="divide-y">
            {interventions.map((inv) => (
              <div key={inv.patient_id} className="px-5 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-sm text-gray-600">
                    {inv.patient_name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">{inv.patient_name}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className="text-sm text-gray-500">Risk: {Math.round(inv.risk_score * 100)}%</span>
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="text-sm text-green-700 font-medium">
                      after interventions: {Math.round(inv.estimated_final_risk * 100)}%
                    </span>
                  </div>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_PILL[inv.priority]}`}>
                    {inv.priority}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {inv.interventions?.slice(0, 4).map((action: any) => (
                    <div key={action.id} className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 text-xs">
                      <p className="font-medium text-indigo-800">{action.name}</p>
                      <p className="text-indigo-500">−{action.expected_reduction_pct}% · cost: <span className={COST_PILL[action.cost]}>{action.cost}</span></p>
                    </div>
                  ))}
                  {inv.interventions?.length > 4 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 flex items-center">
                      +{inv.interventions.length - 4} more
                    </div>
                  )}
                </div>
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
                  Combined estimated reduction: <strong>{inv.estimated_reduction_pct}%</strong>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Race/bias disclaimer */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm text-slate-600">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-slate-700">Bias & Fairness Notice</p>
            <p className="mt-1">Race/ethnicity is included as a Social Determinant of Health (SDOH) proxy — it captures documented access barriers (transportation, insurance gaps, work flexibility) not inherent patient behavior. The model is audited for disparate impact: if false-negative rates differ significantly across groups, the PPO adapter calibrates to reduce that gap. Do not use these scores to deny care or deprioritize any patient group.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
