"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MorningBriefCard } from "@/components/MorningBriefCard";
import { RiskScoreTable } from "@/components/RiskScoreTable";
import { PatientCard } from "@/components/PatientCard";
import { MOCK_APPOINTMENTS, mockRiskScores } from "@/lib/mock-data";
import { isInsuranceAccepted } from "@/lib/insurance-list";
import type { RiskScore, InsuranceStatus } from "@/types";
import { Upload, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [brief, setBrief] = useState<any>(null);
  const [selectedScore, setSelectedScore] = useState<RiskScore | null>(null);
  const [telehealthSent, setTelehealthSent] = useState<Set<string>>(new Set());
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Demo Clinic";
  const avgVisitValue = Number(process.env.NEXT_PUBLIC_AVG_VISIT_VALUE ?? 250);

  useEffect(() => {
    const saved = sessionStorage.getItem("risk-scores");
    if (saved) {
      const parsed = JSON.parse(saved);
      setScores(parsed);
      fetchBrief(parsed);
    } else {
      const demo = mockRiskScores(MOCK_APPOINTMENTS);
      setScores(demo);
      fetchBrief(demo);
    }
  }, []);

  async function fetchBrief(s: RiskScore[]) {
    const res = await fetch("/api/morning-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores: s }),
    });
    const data = await res.json();
    setBrief(data);
  }

  const selectedAppt = MOCK_APPOINTMENTS.find(
    (a) => a.patient_id === selectedScore?.patient_id
  );

  const insuranceStatuses: InsuranceStatus[] = MOCK_APPOINTMENTS.map((a) => ({
    patient_id: a.patient_id,
    insurance_provider: a.insurance_provider ?? "",
    verified: isInsuranceAccepted(a.insurance_provider),
    flag_reason: !a.insurance_provider
      ? "No insurance on file"
      : !isInsuranceAccepted(a.insurance_provider)
      ? "Insurance not in accepted list"
      : undefined,
  }));

  async function sendTelehealth(score: RiskScore) {
    await fetch("/api/telehealth-pivot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_name: score.patient_name,
        appointment_time: score.appointment_time,
        patient_email: "patient@demo.com",
      }),
    });
    setTelehealthSent((prev) => new Set(Array.from(prev).concat(score.patient_id)));
  }

  const highRisk = scores.filter((s) => s.risk_level === "high");
  const revenueAtRisk = highRisk.length * avgVisitValue;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {clinicName} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <Upload className="w-4 h-4" /> Upload CSV
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Appointments", value: scores.length, color: "text-gray-900" },
          { label: "High Risk", value: highRisk.length, color: "text-red-600" },
          { label: "Revenue at Risk", value: formatCurrency(revenueAtRisk), color: "text-red-600" },
          {
            label: "Model Confidence",
            value: scores.length > 0
              ? `${Math.round((scores.reduce((s, r) => s + r.confidence, 0) / scores.length) * 100)}%`
              : "—",
            color: "text-green-600",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Morning brief */}
      {brief && <MorningBriefCard data={brief} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Today's Appointments</h2>
            <Link href="/upload" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Upload new <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <RiskScoreTable
            scores={scores}
            onSelectPatient={setSelectedScore}
            selectedId={selectedScore?.patient_id}
          />
        </div>

        {/* Patient card */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">
            {selectedScore ? "Patient Detail" : "Select a Patient"}
          </h2>
          {selectedScore && selectedAppt ? (
            <PatientCard
              appointment={selectedAppt}
              riskScore={selectedScore}
              insuranceStatus={insuranceStatuses.find(
                (i) => i.patient_id === selectedScore.patient_id
              )}
              telehealthSent={telehealthSent.has(selectedScore.patient_id)}
              onSendTelehealth={
                selectedScore.risk_level === "high"
                  ? () => sendTelehealth(selectedScore)
                  : undefined
              }
              onTriggerVoice={async () => {
                await fetch("/api/voice-trigger", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    patient_id: selectedScore.patient_id,
                    phone_number: "+15555550100",
                    call_type: "reminder",
                    risk_level: selectedScore.risk_level,
                  }),
                });
              }}
            />
          ) : (
            <div className="rounded-xl border bg-white p-8 text-center text-gray-400 text-sm">
              Click a row to view patient details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
