"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MOCK_APPOINTMENTS } from "@/lib/mock-data";
import { PATIENT_HEALTH } from "@/lib/patient-data";
import { saveCheckin, getCheckins } from "@/lib/sync-store";
import { ChevronLeft, CheckCircle, Heart, Car, ClipboardList, MessageSquare } from "lucide-react";
import type { AppointmentRow } from "@/types";

export default function CheckinPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const router = useRouter();

  const [appointment, setAppointment] = useState<AppointmentRow | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    symptoms: "",
    questions: "",
    transportation_arranged: false,
    fasting_compliant: false,
    emergency_contact_confirmed: false,
    caregiver_joining: false,
  });

  useEffect(() => {
    const saved = sessionStorage.getItem("appointments");
    const appts: AppointmentRow[] = saved ? JSON.parse(saved) : MOCK_APPOINTMENTS;
    setAppointment(appts.find((a) => a.patient_id === patientId) ?? null);

    const existing = getCheckins()[patientId];
    if (existing) {
      setForm({
        symptoms: existing.symptoms,
        questions: existing.questions,
        transportation_arranged: existing.transportation_arranged,
        fasting_compliant: existing.fasting_compliant,
        emergency_contact_confirmed: existing.emergency_contact_confirmed,
        caregiver_joining: existing.caregiver_joining,
      });
      setSubmitted(true);
    }
  }, [patientId]);

  function submit() {
    saveCheckin(patientId, {
      submitted_at: new Date().toISOString(),
      ...form,
    });
    setSubmitted(true);
  }

  const health = PATIENT_HEALTH[patientId];
  const apptDate = appointment ? new Date(appointment.appointment_time) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="font-bold text-gray-900 leading-tight">Pre-Visit Check-In</p>
            <p className="text-xs text-gray-500">{process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Demo Clinic"}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Greeting */}
        <div className="bg-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-5 h-5" />
            <p className="font-semibold">Hi, {appointment?.patient_name?.split(" ")[0] ?? "there"}!</p>
          </div>
          <p className="text-indigo-100 text-sm">
            Help us prepare for your{" "}
            <strong className="text-white">{appointment?.appointment_type.replace(/_/g, " ")}</strong>{" "}
            {apptDate && (
              <>on <strong className="text-white">{apptDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</strong> at{" "}
              <strong className="text-white">{apptDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</strong></>
            )}.
          </p>
        </div>

        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Check-In Received!</p>
              <p className="text-sm text-green-600">Your care team has been notified and will review your responses.</p>
            </div>
          </div>
        )}

        {/* Symptoms / new developments */}
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-indigo-500" />
            <p className="font-semibold text-gray-900">Any new symptoms or changes?</p>
          </div>
          <textarea
            value={form.symptoms}
            onChange={(e) => setForm((f) => ({ ...f, symptoms: e.target.value }))}
            placeholder="e.g. I've had more fatigue this week, mild chest tightness on Tuesday…"
            rows={3}
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
        </div>

        {/* Questions for the doctor */}
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-purple-500" />
            <p className="font-semibold text-gray-900">Questions for your doctor?</p>
          </div>
          <textarea
            value={form.questions}
            onChange={(e) => setForm((f) => ({ ...f, questions: e.target.value }))}
            placeholder="e.g. Can I continue my blood pressure medication? How long is recovery? What should I expect?"
            rows={3}
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          />
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="font-semibold text-gray-900 mb-4">Readiness Checklist</p>
          <div className="space-y-3">
            {[
              {
                key: "transportation_arranged" as const,
                label: "Transportation arranged",
                sub: "You have a ride to and from the appointment",
                icon: Car,
                color: "text-blue-500",
              },
              {
                key: "fasting_compliant" as const,
                label: "Following fasting instructions",
                sub: "You haven't eaten/drunk anything as directed",
                icon: ClipboardList,
                color: "text-amber-500",
              },
              {
                key: "emergency_contact_confirmed" as const,
                label: "Emergency contact confirmed",
                sub: "Someone knows about your appointment today",
                icon: MessageSquare,
                color: "text-green-500",
              },
              ...(health?.caregiver ? [{
                key: "caregiver_joining" as const,
                label: `${health.caregiver.name} will accompany me`,
                sub: `Your caregiver (${health.caregiver.relation}) is joining`,
                icon: Heart,
                color: "text-rose-500",
              }] : []),
            ].map(({ key, label, sub, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  form[key]
                    ? "bg-indigo-50 border-indigo-200"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${form[key] ? "bg-indigo-100" : "bg-white border"}`}>
                  {form[key] ? (
                    <CheckCircle className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <Icon className={`w-4.5 h-4.5 ${color}`} />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium ${form[key] ? "text-indigo-800" : "text-gray-800"}`}>{label}</p>
                  <p className="text-xs text-gray-500">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={submit}
          className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
        >
          {submitted ? (
            <><CheckCircle className="w-5 h-5" /> Update Check-In</>
          ) : (
            <><ClipboardList className="w-5 h-5" /> Submit Check-In</>
          )}
        </button>

        <p className="text-center text-xs text-gray-400">
          Responses are shared with your care team to prepare for your visit.
        </p>
      </div>
    </div>
  );
}
