"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MOCK_APPOINTMENTS } from "@/lib/mock-data";
import { PATIENT_HEALTH } from "@/lib/patient-data";
import { getChargeSchedule, totalBaseCharge } from "@/lib/procedure-charges";
import { getCoverage } from "@/lib/insurance-coverage";
import { getStatuses, setStatus, getCheckins, type PatientStatus } from "@/lib/sync-store";
import { PREP_INSTRUCTIONS } from "@/lib/prep-instructions";
import {
  CheckCircle, Video, ChevronLeft, ChevronRight, Calendar, DollarSign,
  ClipboardList, ChevronDown, ChevronUp, Phone, Heart, Clock, AlertCircle
} from "lucide-react";
import type { AppointmentRow } from "@/types";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const router = useRouter();

  const [appointment, setAppointment] = useState<AppointmentRow | null>(null);
  const [status, setStatusState] = useState<PatientStatus>("pending");
  const [hasCheckin, setHasCheckin] = useState(false);
  const [chargesOpen, setChargesOpen] = useState(false);
  const [prepOpen, setPrepOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("appointments");
    const appts: AppointmentRow[] = saved ? JSON.parse(saved) : MOCK_APPOINTMENTS;
    const found = appts.find((a) => a.patient_id === patientId) ?? null;
    setAppointment(found);

    const statuses = getStatuses();
    const current = statuses[patientId] ?? (found?.confirmed ? "confirmed" : "pending");
    setStatusState(current as PatientStatus);

    const checkins = getCheckins();
    setHasCheckin(!!checkins[patientId]);

    function onStorage(e: StorageEvent) {
      if (e.key === "nsp_patient_statuses") {
        const s = getStatuses();
        setStatusState((s[patientId] ?? "pending") as PatientStatus);
      }
      if (e.key === "nsp_checkin_responses") {
        setHasCheckin(!!getCheckins()[patientId]);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [patientId]);

  function confirm(newStatus: PatientStatus) {
    setConfirming(true);
    setTimeout(() => {
      setStatus(patientId, newStatus);
      setStatusState(newStatus);
      setConfirming(false);
    }, 800);
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <p className="text-gray-500">Appointment not found.</p>
      </div>
    );
  }

  const health = PATIENT_HEALTH[patientId];
  const apptDate = new Date(appointment.appointment_time);
  const schedule = getChargeSchedule(appointment.appointment_type);
  const coverage = getCoverage(appointment.insurance_provider ?? "", appointment.appointment_type);
  const total = totalBaseCharge(schedule.line_items);
  const insAdj = coverage ? Math.round(total * (coverage.coverage_pct / 100)) : 0;
  const patResp = total - insAdj + (coverage?.copay ?? 0);
  const prep = PREP_INSTRUCTIONS[appointment.appointment_type];

  const statusConfig = {
    confirmed: { label: "Confirmed — See you there!", color: "bg-green-500", icon: CheckCircle },
    telehealth: { label: "Telehealth Visit Confirmed", color: "bg-blue-500", icon: Video },
    cancelled: { label: "Appointment Cancelled", color: "bg-red-500", icon: AlertCircle },
    pending: { label: "Awaiting Your Confirmation", color: "bg-amber-500", icon: Clock },
  }[status] ?? { label: "Pending", color: "bg-amber-500", icon: Clock };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="font-bold text-gray-900 leading-tight">My Appointment</p>
            <p className="text-xs text-gray-500">{process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Demo Clinic"}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Status banner */}
        <div className={`rounded-2xl ${statusConfig.color} text-white px-5 py-4 flex items-center gap-3`}>
          <StatusIcon className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-semibold">{statusConfig.label}</p>
            <p className="text-sm opacity-80">
              {apptDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at{" "}
              {apptDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Appointment card */}
        <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 capitalize">{appointment.appointment_type.replace(/_/g, " ")}</p>
              <p className="text-sm text-gray-500">{appointment.doctor_name}</p>
            </div>
          </div>
          <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Patient</p>
              <p className="font-medium text-gray-800">{appointment.patient_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Location</p>
              <p className="font-medium text-gray-800">1200 Health Plaza, SF</p>
            </div>
            {appointment.insurance_provider && (
              <div>
                <p className="text-xs text-gray-400">Insurance</p>
                <p className="font-medium text-gray-800">{appointment.insurance_provider}</p>
              </div>
            )}
            {health?.caregiver && (
              <div>
                <p className="text-xs text-gray-400">Caregiver</p>
                <p className="font-medium text-gray-800 flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-400" /> {health.caregiver.name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons — only show if pending or telehealth available */}
        {(status === "pending" || status === "telehealth" || status === "confirmed") && status !== "confirmed" && (
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="font-semibold text-gray-900 mb-3">Confirm Your Visit</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => confirm("confirmed")}
                disabled={confirming}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-7 h-7 text-green-600" />
                <span className="text-sm font-medium text-green-800">Confirm In-Person</span>
              </button>
              <button
                onClick={() => confirm("telehealth")}
                disabled={confirming}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <Video className="w-7 h-7 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Switch to Telehealth</span>
              </button>
            </div>
            {confirming && (
              <p className="text-center text-sm text-gray-500 mt-3 animate-pulse">Saving your preference…</p>
            )}
          </div>
        )}

        {/* Confirmed state — big green checkmark */}
        {status === "confirmed" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-green-800">You&apos;re confirmed!</p>
            <p className="text-sm text-green-600 mt-1">The clinic has been notified. See you then.</p>
            <button
              onClick={() => confirm("telehealth")}
              className="mt-3 text-xs text-green-600 underline"
            >
              Switch to telehealth instead
            </button>
          </div>
        )}

        {/* Pre-visit check-in CTA */}
        <button
          onClick={() => router.push(`/patient/${patientId}/checkin`)}
          className={`w-full flex items-center justify-between p-5 rounded-2xl border shadow-sm transition-all ${
            hasCheckin
              ? "bg-indigo-50 border-indigo-200"
              : "bg-white hover:border-indigo-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasCheckin ? "bg-indigo-200" : "bg-indigo-100"}`}>
              <ClipboardList className={`w-5 h-5 ${hasCheckin ? "text-indigo-700" : "text-indigo-500"}`} />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">{hasCheckin ? "Pre-Visit Check-In Complete ✓" : "Pre-Visit Check-In"}</p>
              <p className="text-sm text-gray-500">{hasCheckin ? "Your responses are saved" : "Share questions & concerns with your care team"}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* Estimated charges */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <button
            onClick={() => setChargesOpen(!chargesOpen)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Estimated Charges</p>
                <p className="text-sm text-gray-500">
                  Est. your responsibility: <strong className="text-emerald-700">{fmt(patResp)}</strong>
                </p>
              </div>
            </div>
            {chargesOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {chargesOpen && (
            <div className="border-t px-5 pb-5">
              <div className="space-y-2 mt-3">
                {schedule.line_items.map((item) => (
                  <div key={item.code} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.description}</span>
                    <span className="font-medium text-gray-900">{fmt(item.base_charge)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-3 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Billed</span>
                  <span className="font-medium">{fmt(total)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Insurance Adjustment ({coverage?.coverage_pct ?? 0}%)</span>
                  <span>-{fmt(insAdj)}</span>
                </div>
                {(coverage?.copay ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Copay</span>
                    <span>+{fmt(coverage!.copay!)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Your Estimated Responsibility</span>
                  <span className="text-emerald-700">{fmt(patResp)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Estimate only. Final charges depend on insurance adjudication.</p>
            </div>
          )}
        </div>

        {/* Prep instructions */}
        {prep && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <button
              onClick={() => setPrepOpen(!prepOpen)}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">How to Prepare</p>
                  <p className="text-sm text-gray-500">Pre-procedure instructions from your care team</p>
                </div>
              </div>
              {prepOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {prepOpen && (
              <div className="border-t px-5 pb-5 space-y-4">
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">1 Week Before</p>
                  <ul className="space-y-1.5">
                    {prep.one_week_before.map((instruction, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        {instruction}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">2 Days Before</p>
                  <ul className="space-y-1.5">
                    {prep.two_days_before.map((instruction, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                        {instruction}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contact */}
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <p className="font-semibold text-gray-900 mb-3">Need Help?</p>
          <a
            href="tel:5551002000"
            className="flex items-center gap-3 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
              <Phone className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Call the Clinic</p>
              <p className="text-xs text-gray-500">(555) 100-2000 · Mon–Fri 8am–6pm</p>
            </div>
          </a>
        </div>

        <p className="text-center text-xs text-gray-400">
          Staff view: <a href="/" className="underline text-gray-500">Nurse Dashboard →</a>
        </p>
      </div>
    </div>
  );
}
