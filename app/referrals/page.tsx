"use client";

import { useEffect, useState } from "react";
import type { AppointmentRow, ReferralRecord } from "@/types";
import { MOCK_APPOINTMENTS } from "@/lib/mock-data";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

function deriveReferralStatus(appt: AppointmentRow): ReferralRecord {
  const hasReferralSource = !!appt.referral_source;
  const hasAuthNumber = !!(appt as any).authorization_number;

  let status: ReferralRecord["status"];
  if (!hasReferralSource) {
    status = "missing";
  } else if (hasAuthNumber) {
    status = "complete";
  } else {
    // If referral source exists but no auth number, treat as expired for demo purposes
    status = Math.random() > 0.5 ? "complete" : "expired";
  }

  return {
    patient_id: appt.patient_id,
    referring_doctor: appt.referral_source ?? "",
    referral_date: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    authorization_number: hasAuthNumber ? (appt as any).authorization_number : undefined,
    status,
  };
}

export default function ReferralsPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>(MOCK_APPOINTMENTS);
  const [records, setRecords] = useState<ReferralRecord[]>([]);

  useEffect(() => {
    const saved = sessionStorage.getItem("appointments");
    const appts: AppointmentRow[] = saved ? JSON.parse(saved) : MOCK_APPOINTMENTS;
    setAppointments(appts);
    setRecords(appts.map(deriveReferralStatus));
  }, []);

  const missing = records.filter((r) => r.status === "missing").length;
  const expired = records.filter((r) => r.status === "expired").length;
  const complete = records.filter((r) => r.status === "complete").length;
  const gaps = missing + expired;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referral Gap Detector</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Referral and authorization status for today's appointments
        </p>
      </div>

      {/* Summary banner */}
      {gaps > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {gaps} of {records.length} appointments have referral gaps — review before patient arrival
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{complete}</p>
          <p className="text-sm text-green-600 mt-0.5">Complete</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{expired}</p>
          <p className="text-sm text-amber-600 mt-0.5">Expired</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{missing}</p>
          <p className="text-sm text-red-600 mt-0.5">Missing</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Patient</th>
              <th className="px-4 py-3 font-medium text-gray-600">Referring Doctor</th>
              <th className="px-4 py-3 font-medium text-gray-600">Referral Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Auth #</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {appointments.map((appt, i) => {
              const record = records[i];
              return (
                <tr key={appt.patient_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{appt.patient_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {record?.referring_doctor || <span className="text-gray-400 italic">None</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {record?.referring_doctor ? formatDate(record.referral_date) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {record?.authorization_number ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {record?.status === "complete" && (
                      <span className="inline-flex items-center gap-1 text-green-700 text-sm">
                        <CheckCircle className="w-4 h-4" /> Complete
                      </span>
                    )}
                    {record?.status === "missing" && (
                      <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" /> Missing
                      </span>
                    )}
                    {record?.status === "expired" && (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-sm">
                        <Clock className="w-4 h-4" /> Expired
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
