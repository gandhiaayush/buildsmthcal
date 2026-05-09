"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import type { AppointmentRow, RiskScore } from "@/types";
import { MOCK_APPOINTMENTS, mockRiskScore } from "@/lib/mock-data";
import { isInsuranceAccepted } from "@/lib/insurance-list";
import { formatTime } from "@/lib/utils";
import { RiskBadge } from "@/components/RiskBadge";
import {
  Upload,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Loader2,
  Download,
  FileText,
} from "lucide-react";
import { PatientHealthSheet } from "@/components/PatientHealthSheet";

type PatientState = {
  email: string;
  uploading: boolean;
  riskScore: RiskScore | null;
  telehealthSentAt: string | null;
  voiceQueued: boolean;
};

function isWithin3Hours(appointmentTime: string): boolean {
  const diff = new Date(appointmentTime).getTime() - Date.now();
  return diff >= 0 && diff <= 3 * 60 * 60 * 1000;
}

function initState(patients: AppointmentRow[]): Record<string, PatientState> {
  return Object.fromEntries(
    patients.map((p) => [
      p.patient_id,
      {
        email: p.patient_email ?? "",
        uploading: false,
        riskScore: null,
        telehealthSentAt: null,
        voiceQueued: false,
      },
    ])
  );
}

export default function UploadPage() {
  const [patients, setPatients] = useState<AppointmentRow[]>(MOCK_APPOINTMENTS);
  const [states, setStates] = useState<Record<string, PatientState>>(() =>
    initState(MOCK_APPOINTMENTS)
  );

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [healthSheet, setHealthSheet] = useState<AppointmentRow | null>(null);

  function patch(id: string, update: Partial<PatientState>) {
    setStates((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...update } };
      if ("email" in update) {
        const emails = Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v.email]));
        sessionStorage.setItem("patient-emails", JSON.stringify(emails));
      }
      return next;
    });
  }

  async function handleFile(patient: AppointmentRow, file: File) {
    patch(patient.patient_id, { uploading: true });

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      dynamicTyping: true,
      complete: async (results) => {
        const rows = results.data.filter((r) => r.appointment_time);
        const toScore: AppointmentRow =
          rows.length > 0
            ? {
                patient_id: patient.patient_id,
                patient_name: patient.patient_name,
                appointment_time: String(rows[rows.length - 1].appointment_time ?? ""),
                appointment_type: String(rows[rows.length - 1].appointment_type ?? ""),
                doctor_name: String(rows[rows.length - 1].doctor_name ?? ""),
                insurance_provider: rows[rows.length - 1].insurance_provider
                  ? String(rows[rows.length - 1].insurance_provider)
                  : undefined,
                prior_no_shows:
                  typeof rows[rows.length - 1].prior_no_shows === "number"
                    ? (rows[rows.length - 1].prior_no_shows as number)
                    : undefined,
                confirmed:
                  typeof rows[rows.length - 1].confirmed === "boolean"
                    ? (rows[rows.length - 1].confirmed as boolean)
                    : String(rows[rows.length - 1].confirmed) === "true",
                referral_source: rows[rows.length - 1].referral_source
                  ? String(rows[rows.length - 1].referral_source)
                  : undefined,
              }
            : patient;

        try {
          const res = await fetch("/api/risk-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appointments: [toScore] }),
          });
          const data = await res.json();
          const score: RiskScore = data.scores?.[0] ?? mockRiskScore(toScore);
          patch(patient.patient_id, { riskScore: score, uploading: false });
          setPatients((prev) =>
            prev.map((p) =>
              p.patient_id === patient.patient_id ? { ...p, ...toScore } : p
            )
          );
        } catch {
          patch(patient.patient_id, {
            riskScore: mockRiskScore(toScore),
            uploading: false,
          });
        }
      },
      error: () => patch(patient.patient_id, { uploading: false }),
    });
  }

  async function sendTelehealth(patient: AppointmentRow, email: string) {
    await fetch("/api/telehealth-pivot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patient.patient_id,
        patient_name: patient.patient_name,
        appointment_time: patient.appointment_time,
        patient_email: email,
      }),
    });
    const sentAt = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    patch(patient.patient_id, { telehealthSentAt: sentAt });
  }

  async function triggerVoice(patient: AppointmentRow, level: RiskScore["risk_level"]) {
    await fetch("/api/voice-trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patient.patient_id,
        phone_number: "+15555550100",
        call_type: "reminder",
        risk_level: level,
      }),
    });
    patch(patient.patient_id, { voiceQueued: true });
  }

  function downloadTemplate() {
    const csv = [
      "appointment_time,appointment_type,doctor_name,insurance_provider,prior_no_shows,confirmed,referral_source",
      `${new Date(Date.now() + 2 * 3600000).toISOString()},ultrasound,Dr. Reyes,Aetna,2,false,Dr. Lee`,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patient-appointment-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Upload</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Upload a CSV for each patient to score their no-show risk
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" /> CSV Template
        </button>
      </div>

      <div className="space-y-4">
        {patients.map((patient) => {
          const st = states[patient.patient_id];
          if (!st) return null;

          const insurance = patient.insurance_provider;
          const insuranceOk = insurance ? isInsuranceAccepted(insurance) : false;
          const within3h = isWithin3Hours(patient.appointment_time);
          const telehealthEligible =
            st.riskScore?.risk_level === "high" && !patient.confirmed && within3h;
          const canSendTelehealth =
            telehealthEligible && st.email.trim().length > 0 && !st.telehealthSentAt;

          return (
            <div
              key={patient.patient_id}
              className="bg-white rounded-xl border shadow-sm p-5"
            >
              <div className="flex items-start gap-6 flex-wrap">
                {/* Patient info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <h2 className="font-semibold text-gray-900">{patient.patient_name}</h2>
                      <p className="text-sm text-gray-500">
                        {patient.appointment_type.replace(/_/g, " ")} ·{" "}
                        {patient.doctor_name} · {formatTime(patient.appointment_time)}
                      </p>
                    </div>
                    {st.uploading && (
                      <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                      </span>
                    )}
                    {st.riskScore && !st.uploading && (
                      <RiskBadge
                        level={st.riskScore.risk_level}
                        score={st.riskScore.risk_score}
                      />
                    )}
                  </div>

                  {st.riskScore && st.riskScore.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {st.riskScore.reasons.map((r) => (
                        <span
                          key={r}
                          className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-sm">
                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                    {!insurance ? (
                      <span className="text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> No insurance on file
                      </span>
                    ) : insuranceOk ? (
                      <span className="text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> {insurance} verified
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> {insurance} not accepted
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions panel */}
                <div className="flex flex-col gap-2 w-56 shrink-0">
                  <input
                    ref={(el) => {
                      fileRefs.current[patient.patient_id] = el;
                    }}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(patient, file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => fileRefs.current[patient.patient_id]?.click()}
                    disabled={st.uploading}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {st.riskScore ? "Re-upload CSV" : "Upload CSV"}
                  </button>

                  <button
                    onClick={() => setHealthSheet(patient)}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    View Health Chart
                  </button>

                  <input
                    type="email"
                    value={st.email}
                    onChange={(e) =>
                      patch(patient.patient_id, { email: e.target.value })
                    }
                    placeholder="Patient email for outreach"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {st.telehealthSentAt ? (
                    <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      Telehealth offer sent {st.telehealthSentAt}
                    </div>
                  ) : telehealthEligible ? (
                    <button
                      onClick={() => sendTelehealth(patient, st.email)}
                      disabled={!canSendTelehealth}
                      title={!st.email.trim() ? "Set patient email first" : undefined}
                      className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Mail className="w-4 h-4" /> Telehealth Pivot
                    </button>
                  ) : null}

                  {st.riskScore && (
                    <button
                      onClick={() => triggerVoice(patient, st.riskScore!.risk_level)}
                      disabled={st.voiceQueued}
                      className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      {st.voiceQueued ? "Call Queued" : "Voice Call"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {healthSheet && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setHealthSheet(null)} />
          <PatientHealthSheet appointment={healthSheet} onClose={() => setHealthSheet(null)} />
        </>
      )}
    </div>
  );
}
