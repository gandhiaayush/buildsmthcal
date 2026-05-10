"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MOCK_APPOINTMENTS } from "@/lib/mock-data";
import { PATIENT_HEALTH } from "@/lib/patient-data";
import { getStatuses } from "@/lib/sync-store";
import { Activity, ChevronRight, CheckCircle, Clock, Video, AlertCircle } from "lucide-react";
import type { AppointmentRow } from "@/types";

const STATUS_UI = {
  confirmed: { label: "Confirmed", color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle },
  telehealth: { label: "Telehealth", color: "text-blue-600 bg-blue-50 border-blue-200", icon: Video },
  cancelled: { label: "Cancelled", color: "text-red-600 bg-red-50 border-red-200", icon: AlertCircle },
  pending: { label: "Awaiting Confirmation", color: "text-amber-600 bg-amber-50 border-amber-200", icon: Clock },
};

export default function PatientPortalPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = sessionStorage.getItem("appointments");
    setAppointments(saved ? JSON.parse(saved) : MOCK_APPOINTMENTS);
    setStatuses(getStatuses());

    function onStorage(e: StorageEvent) {
      if (e.key === "nsp_patient_statuses") setStatuses(getStatuses());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg leading-tight">Patient Portal</p>
            <p className="text-xs text-gray-500">{process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Demo Clinic"}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Appointments</h1>
        <p className="text-gray-500 text-sm mb-6">Select your profile to view details, confirm, or check in.</p>

        <div className="space-y-3">
          {appointments.map((appt) => {
            const health = PATIENT_HEALTH[appt.patient_id];
            const statusKey = (statuses[appt.patient_id] ?? (appt.confirmed ? "confirmed" : "pending")) as keyof typeof STATUS_UI;
            const statusInfo = STATUS_UI[statusKey] ?? STATUS_UI.pending;
            const StatusIcon = statusInfo.icon;
            const apptDate = new Date(appt.appointment_time);

            return (
              <button
                key={appt.patient_id}
                onClick={() => router.push(`/patient/${appt.patient_id}`)}
                className="w-full bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4 hover:shadow-md hover:border-blue-200 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {appt.patient_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{appt.patient_name}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {apptDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at{" "}
                    {apptDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} ·{" "}
                    {appt.appointment_type.replace(/_/g, " ")}
                  </p>
                  <span className={`inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusInfo.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            );
          })}
        </div>

        <div className="mt-8 bg-blue-600 rounded-2xl p-5 text-white text-center">
          <p className="font-semibold text-sm mb-1">Need help?</p>
          <p className="text-blue-100 text-sm">Call us at (555) 100-2000 · Mon–Fri 8am–6pm</p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          This is a demo portal. Staff view: <a href="/" className="underline text-gray-500">Nurse Dashboard →</a>
        </p>
      </div>
    </div>
  );
}
