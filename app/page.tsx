"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MorningBriefCard } from "@/components/MorningBriefCard";
import { RiskScoreTable } from "@/components/RiskScoreTable";
import { PatientCard } from "@/components/PatientCard";
import { MOCK_APPOINTMENTS, mockRiskScores } from "@/lib/mock-data";
import { isInsuranceAccepted } from "@/lib/insurance-list";
import type { RiskScore, InsuranceStatus, AppointmentRow } from "@/types";
import { Upload, ArrowRight, Heart, ClipboardList, MessageSquare } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PATIENT_HEALTH } from "@/lib/patient-data";
import { getCheckins, getStatuses, getCaregiverSent } from "@/lib/sync-store";
import { CaregiverModal } from "@/components/CaregiverModal";

function isWithin3Hours(appointmentTime: string): boolean {
  const diff = new Date(appointmentTime).getTime() - Date.now();
  return diff >= 0 && diff <= 3 * 60 * 60 * 1000;
}

export default function DashboardPage() {
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [brief, setBrief] = useState<any>(null);
  const [selectedScore, setSelectedScore] = useState<RiskScore | null>(null);
  const [patientEmails, setPatientEmails] = useState<Record<string, string>>(() =>
    Object.fromEntries(MOCK_APPOINTMENTS.map((p) => [p.patient_id, p.patient_email ?? ""]))
  );
  const [telehealthSentAt, setTelehealthSentAt] = useState<Record<string, string>>({});
  const [checkins, setCheckins] = useState<Record<string, any>>({});
  const [patientStatuses, setPatientStatuses] = useState<Record<string, string>>({});
  const [caregiverSent, setCaregiverSent] = useState<string[]>([]);
  const [caregiverModal, setCaregiverModal] = useState<AppointmentRow | null>(null);

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

    function refreshSync() {
      setCheckins(getCheckins());
      setPatientStatuses(getStatuses());
      setCaregiverSent(getCaregiverSent());
    }
    refreshSync();
    window.addEventListener("storage", refreshSync);
    return () => window.removeEventListener("storage", refreshSync);
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
    const email = patientEmails[score.patient_id] ?? "";
    await fetch("/api/telehealth-pivot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: score.patient_id,
        patient_name: score.patient_name,
        appointment_time: score.appointment_time,
        patient_email: email || "patient@demo.com",
      }),
    });
    const sentAt = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    setTelehealthSentAt((prev) => ({ ...prev, [score.patient_id]: sentAt }));
  }

  const highRisk = scores.filter((s) => s.risk_level === "high");
  const revenueAtRisk = highRisk.length * avgVisitValue;

  const canSendTelehealth = (score: RiskScore) => {
    const appt = MOCK_APPOINTMENTS.find((a) => a.patient_id === score.patient_id);
    return (
      score.risk_level === "high" &&
      !appt?.confirmed &&
      isWithin3Hours(score.appointment_time) &&
      !!patientEmails[score.patient_id]?.trim() &&
      !telehealthSentAt[score.patient_id]
    );
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {clinicName} ·{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
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
            value:
              scores.length > 0
                ? `${Math.round(
                    (scores.reduce((s, r) => s + r.confidence, 0) / scores.length) * 100
                  )}%`
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

      {/* Caregiver alerts */}
      {(() => {
        const caregiverAppts = MOCK_APPOINTMENTS.filter((a) => PATIENT_HEALTH[a.patient_id]?.needs_caregiver_loop);
        if (caregiverAppts.length === 0) return null;
        return (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-rose-500" />
              <p className="font-semibold text-rose-900 text-sm">Caregiver Loop Required</p>
              <span className="text-xs bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">{caregiverAppts.length} patient{caregiverAppts.length > 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2">
              {caregiverAppts.map((appt) => {
                const cg = PATIENT_HEALTH[appt.patient_id]?.caregiver;
                const sent = caregiverSent.includes(appt.patient_id);
                return (
                  <div key={appt.patient_id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-rose-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{appt.patient_name}</p>
                      <p className="text-xs text-gray-500">
                        Caregiver: {cg?.name ?? "on file"} ({cg?.relation}) · {appt.appointment_type.replace(/_/g, " ")}
                      </p>
                    </div>
                    {sent ? (
                      <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                        <Heart className="w-3 h-3" /> Sent
                      </span>
                    ) : (
                      <button
                        onClick={() => setCaregiverModal(appt)}
                        className="text-xs px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
                      >
                        Notify Caregiver
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Check-in responses */}
      {Object.keys(checkins).length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-indigo-500" />
            <p className="font-semibold text-indigo-900 text-sm">Pre-Visit Check-In Responses</p>
            <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">{Object.keys(checkins).length} submitted</span>
          </div>
          <div className="space-y-2">
            {Object.entries(checkins).map(([pid, checkin]: [string, any]) => {
              const appt = MOCK_APPOINTMENTS.find((a) => a.patient_id === pid);
              if (!appt) return null;
              const status = patientStatuses[pid] ?? (appt.confirmed ? "confirmed" : "pending");
              return (
                <div key={pid} className="bg-white rounded-lg px-3 py-3 border border-indigo-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-gray-900">{appt.patient_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      status === "confirmed" ? "bg-green-100 text-green-700" :
                      status === "telehealth" ? "bg-blue-100 text-blue-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {status}
                    </span>
                  </div>
                  {checkin.symptoms && (
                    <div className="flex items-start gap-1.5 text-xs text-gray-600 mb-1">
                      <span className="text-red-400">⚕</span>
                      <span><strong>Symptoms:</strong> {checkin.symptoms}</span>
                    </div>
                  )}
                  {checkin.questions && (
                    <div className="flex items-start gap-1.5 text-xs text-gray-600">
                      <MessageSquare className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                      <span><strong>Questions:</strong> {checkin.questions}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {checkin.transportation_arranged && <span className="text-green-600">🚗 Ride arranged</span>}
                    {checkin.caregiver_joining && <span className="text-rose-600">❤️ Caregiver joining</span>}
                    {!checkin.transportation_arranged && <span className="text-red-500">⚠ No ride arranged</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Today's Appointments</h2>
            <Link
              href="/upload"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
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
              patientEmail={patientEmails[selectedScore.patient_id]}
              onEmailChange={(email) =>
                setPatientEmails((prev) => ({ ...prev, [selectedScore.patient_id]: email }))
              }
              telehealthSentAt={telehealthSentAt[selectedScore.patient_id] ?? null}
              onSendTelehealth={
                canSendTelehealth(selectedScore)
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
      {caregiverModal && (
        <CaregiverModal
          appointment={caregiverModal}
          onClose={() => {
            setCaregiverModal(null);
            setCaregiverSent(getCaregiverSent());
          }}
        />
      )}
    </div>
  );
}
