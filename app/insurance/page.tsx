"use client";

import { useEffect, useState } from "react";
import type { AppointmentRow, InsuranceStatus } from "@/types";
import { MOCK_APPOINTMENTS } from "@/lib/mock-data";
import { isInsuranceAccepted } from "@/lib/insurance-list";
import { CheckCircle, XCircle, AlertCircle, Shield } from "lucide-react";

export default function InsurancePage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>(MOCK_APPOINTMENTS);
  const [statuses, setStatuses] = useState<InsuranceStatus[]>([]);

  useEffect(() => {
    const saved = sessionStorage.getItem("appointments");
    const appts: AppointmentRow[] = saved ? JSON.parse(saved) : MOCK_APPOINTMENTS;
    setAppointments(appts);
    setStatuses(
      appts.map((a) => ({
        patient_id: a.patient_id,
        insurance_provider: a.insurance_provider ?? "",
        verified: isInsuranceAccepted(a.insurance_provider),
        flag_reason: !a.insurance_provider
          ? "No insurance on file"
          : !isInsuranceAccepted(a.insurance_provider)
          ? "Insurance not in accepted list"
          : undefined,
      }))
    );
  }, []);

  const verified = statuses.filter((s) => s.verified).length;
  const flagged = statuses.filter((s) => !s.verified).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insurance Pre-Verification</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Cross-referenced against accepted insurance providers
        </p>
      </div>

      {/* Summary banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{verified}</p>
          <p className="text-sm text-green-600 mt-0.5">Verified</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{flagged}</p>
          <p className="text-sm text-red-600 mt-0.5">Flagged</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{statuses.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Total Patients</p>
        </div>
      </div>

      {/* Patient list */}
      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="font-medium text-gray-700 text-sm">Patient Insurance Status</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="px-4 py-3 font-medium text-gray-600">Patient</th>
              <th className="px-4 py-3 font-medium text-gray-600">Doctor</th>
              <th className="px-4 py-3 font-medium text-gray-600">Insurance</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {appointments.map((appt, i) => {
              const status = statuses[i];
              return (
                <tr key={appt.patient_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{appt.patient_name}</td>
                  <td className="px-4 py-3 text-gray-600">{appt.doctor_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {appt.insurance_provider ?? <span className="text-gray-400 italic">Not provided</span>}
                  </td>
                  <td className="px-4 py-3">
                    {!status ? null : status.verified ? (
                      <span className="inline-flex items-center gap-1.5 text-green-700 text-sm">
                        <CheckCircle className="w-4 h-4" /> Verified
                      </span>
                    ) : !appt.insurance_provider ? (
                      <span className="inline-flex items-center gap-1.5 text-gray-500 text-sm">
                        <AlertCircle className="w-4 h-4" /> Missing
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 text-red-600 text-sm group relative cursor-help"
                        title={status.flag_reason}
                      >
                        <XCircle className="w-4 h-4" /> Not accepted
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Accepted list */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-blue-500" />
          <h2 className="font-medium text-gray-900">Accepted Insurance Providers</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {["Aetna", "BlueCross BlueShield", "Cigna", "Humana", "Kaiser", "Medicare", "Medicaid", "UnitedHealthcare"].map((ins) => (
            <span key={ins} className="px-3 py-1 bg-green-50 border border-green-200 text-green-800 text-sm rounded-full">
              {ins}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
