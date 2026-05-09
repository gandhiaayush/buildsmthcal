"use client";

import { useEffect, useState } from "react";
import type { AppointmentRow } from "@/types";
import { MOCK_APPOINTMENTS } from "@/lib/mock-data";
import { getPrepInstructions, formatProcedureName } from "@/lib/prep-instructions";
import { PrepTimeline } from "@/components/PrepTimeline";
import { formatTime } from "@/lib/utils";
import { Mail, CheckCircle, Loader2, ChevronRight, AlertCircle } from "lucide-react";

export default function PrepPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>(MOCK_APPOINTMENTS);
  const [selected, setSelected] = useState<AppointmentRow | null>(null);
  const [patientEmails, setPatientEmails] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedAppts = sessionStorage.getItem("appointments");
    const appts: AppointmentRow[] = savedAppts ? JSON.parse(savedAppts) : MOCK_APPOINTMENTS;
    setAppointments(appts);
    setSelected(appts[0] ?? null);

    const savedEmails = sessionStorage.getItem("patient-emails");
    if (savedEmails) {
      setPatientEmails(JSON.parse(savedEmails));
    } else {
      setPatientEmails(
        Object.fromEntries(appts.map((a) => [a.patient_id, a.patient_email ?? ""]))
      );
    }
  }, []);

  const email = selected ? (patientEmails[selected.patient_id] ?? "") : "";

  function setEmail(val: string) {
    if (!selected) return;
    setPatientEmails((prev) => ({ ...prev, [selected.patient_id]: val }));
  }

  async function sendPrep() {
    if (!selected) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/send-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient: selected, toEmail: email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Email failed to send.");
      } else {
        setSent((prev) => ({
          ...prev,
          [selected.patient_id]: email,
        }));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSending(false);
    }
  }

  const instructions = selected ? getPrepInstructions(selected.appointment_type) : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Appointment Prep Push</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Send two-stage preparation instructions to patients before their appointments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient list */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide px-1">Patients</h2>
          <div className="space-y-1">
            {appointments.map((appt) => (
              <button
                key={appt.patient_id}
                onClick={() => { setSelected(appt); setError(null); }}
                className={`w-full text-left px-3 py-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                  selected?.patient_id === appt.patient_id
                    ? "bg-blue-50 border-blue-300 text-blue-900"
                    : "bg-white border-gray-200 hover:bg-gray-50 text-gray-800"
                }`}
              >
                <div>
                  <p className="font-medium text-sm">{appt.patient_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatProcedureName(appt.appointment_type)} · {formatTime(appt.appointment_time)}
                  </p>
                  {patientEmails[appt.patient_id] && (
                    <p className="text-xs text-blue-600 mt-0.5 truncate">
                      {patientEmails[appt.patient_id]}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {sent[appt.patient_id] && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Prep detail + send */}
        <div className="lg:col-span-2 space-y-4">
          {selected && instructions ? (
            <>
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-semibold text-gray-900">{selected.patient_name}</h2>
                    <p className="text-sm text-gray-500">
                      {formatProcedureName(selected.appointment_type)} ·{" "}
                      {selected.doctor_name} · {formatTime(selected.appointment_time)}
                    </p>
                  </div>
                  {sent[selected.patient_id] && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Sent to {sent[selected.patient_id]}
                    </span>
                  )}
                </div>
              </div>

              <PrepTimeline instruction={instructions} />

              {/* Send form */}
              <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
                <h3 className="font-medium text-gray-900 text-sm">Send Prep Email</h3>
                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@example.com"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendPrep}
                    disabled={sending || !email.trim() || !!sent[selected.patient_id]}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    {sent[selected.patient_id] ? "Sent!" : sending ? "Sending…" : "Send"}
                  </button>
                </div>
                {!email.trim() && (
                  <p className="text-xs text-amber-600">
                    No email set — enter one above or set it on the Upload tab first.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white border rounded-xl p-12 text-center text-gray-400">
              Select a patient to preview their prep instructions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
