"use client";

import { useState } from "react";
import type { AppointmentRow } from "@/types";
import { PATIENT_HEALTH } from "@/lib/patient-data";
import { getCoverage, getPlanType } from "@/lib/insurance-coverage";
import { formatProcedureName } from "@/lib/prep-instructions";
import {
  X,
  User,
  Heart,
  Pill,
  AlertTriangle,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PatientHealthSheetProps {
  appointment: AppointmentRow;
  onClose: () => void;
}

const SEVERITY_COLOR = {
  mild: "bg-yellow-50 text-yellow-700 border-yellow-200",
  moderate: "bg-orange-50 text-orange-700 border-orange-200",
  severe: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_COLOR = {
  active: "bg-red-50 text-red-700",
  monitoring: "bg-blue-50 text-blue-700",
  resolved: "bg-green-50 text-green-700",
};

export function PatientHealthSheet({ appointment, onClose }: PatientHealthSheetProps) {
  const health = PATIENT_HEALTH[appointment.patient_id];
  const [showVisits, setShowVisits] = useState(false);

  const coverage = getCoverage(appointment.insurance_provider, appointment.appointment_type);
  const planType = getPlanType(appointment.insurance_provider);

  if (!health) {
    return (
      <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l z-50 flex flex-col">
        <SheetHeader name={appointment.patient_name} onClose={onClose} />
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No health record found for this patient
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-white shadow-2xl border-l z-50 flex flex-col overflow-hidden">
      <SheetHeader name={appointment.patient_name} onClose={onClose} />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Demographics */}
        <section className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Patient Profile</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <InfoRow label="DOB" value={`${health.dob} (age ${health.age})`} />
            <InfoRow label="Gender" value={health.gender} />
            <InfoRow label="Blood Type" value={health.blood_type} />
            <InfoRow label="Phone" value={health.phone} />
          </div>
          {health.allergies.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="text-xs font-medium text-red-600">Allergies:</span>
              <span className="text-xs text-red-700">{health.allergies.join(", ")}</span>
            </div>
          )}
          {health.allergies.length === 0 && (
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs text-green-700">No known allergies</span>
            </div>
          )}
        </section>

        {/* Insurance coverage */}
        <section className="border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b">
            <Shield className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Insurance Coverage</h3>
            {appointment.insurance_provider && (
              <span className="ml-auto text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                {planType}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <InfoRow label="Provider" value={appointment.insurance_provider ?? "None"} />
              <InfoRow label="Member ID" value={health.member_id} />
              <InfoRow label="Group ID" value={health.group_id} />
              <InfoRow label="Plan Type" value={planType} />
            </div>

            {/* Deductible bar */}
            {health.deductible > 0 && (
              <div className="space-y-1.5 mt-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Deductible: ${health.deductible_met.toLocaleString()} / ${health.deductible.toLocaleString()}</span>
                  <span>{Math.round((health.deductible_met / health.deductible) * 100)}% met</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, (health.deductible_met / health.deductible) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Out-of-Pocket: ${health.out_of_pocket_met.toLocaleString()} / ${health.out_of_pocket_max.toLocaleString()}</span>
                  <span>{Math.round((health.out_of_pocket_met / health.out_of_pocket_max) * 100)}% met</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${Math.min(100, (health.out_of_pocket_met / health.out_of_pocket_max) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Procedure coverage */}
            <div className={`rounded-lg border p-3 mt-1 ${coverage.covered ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center gap-2 mb-1.5">
                {coverage.covered ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={`font-medium text-sm ${coverage.covered ? "text-green-800" : "text-red-800"}`}>
                  {formatProcedureName(appointment.appointment_type)}:{" "}
                  {coverage.covered ? `${coverage.coverage_pct}% covered` : "Not covered"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600 ml-6">
                {coverage.copay !== undefined && (
                  <span>Copay: ${coverage.copay}</span>
                )}
                <span>Prior auth: {coverage.prior_auth_required ? "⚠️ Required" : "✓ Not required"}</span>
              </div>
              {coverage.notes && (
                <p className="text-xs text-gray-600 mt-1.5 ml-6 italic">{coverage.notes}</p>
              )}
            </div>
          </div>
        </section>

        {/* Active conditions */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-red-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Active Conditions</h3>
          </div>
          <div className="space-y-2">
            {health.conditions.map((c) => (
              <div key={c.icd10} className="flex items-start justify-between gap-3 bg-white border rounded-lg px-3 py-2.5">
                <div>
                  <p className="font-medium text-sm text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">ICD-10: {c.icd10} · Since {c.diagnosed}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs px-2 py-0.5 border rounded-full font-medium ${STATUS_COLOR[c.status]}`}>
                    {c.status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 border rounded-full ${SEVERITY_COLOR[c.severity]}`}>
                    {c.severity}
                  </span>
                </div>
              </div>
            ))}
            {health.conditions.length === 0 && (
              <p className="text-sm text-gray-400 italic">No active conditions on file</p>
            )}
          </div>
        </section>

        {/* Medications */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Pill className="w-4 h-4 text-purple-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Current Medications</h3>
          </div>
          <div className="space-y-2">
            {health.medications.map((m) => (
              <div key={m.name} className="bg-white border rounded-lg px-3 py-2.5 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-sm text-gray-900">{m.name} <span className="font-normal text-gray-500">{m.dosage}</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.frequency} · {m.prescribing_doctor}</p>
                </div>
              </div>
            ))}
            {health.medications.length === 0 && (
              <p className="text-sm text-gray-400 italic">No medications on file</p>
            )}
          </div>
        </section>

        {/* Prior visits */}
        <section>
          <button
            onClick={() => setShowVisits((v) => !v)}
            className="flex items-center justify-between w-full mb-3"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 text-sm">Visit History ({health.prior_visits.length})</h3>
            </div>
            {showVisits ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {showVisits && (
            <div className="space-y-2">
              {health.prior_visits.map((v, i) => (
                <div key={i} className="bg-white border rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium text-sm text-gray-900">{v.type}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">{v.date}</span>
                      {v.showed_up ? (
                        <span className="text-xs text-green-600 flex items-center gap-0.5">
                          <CheckCircle className="w-3 h-3" /> Showed
                        </span>
                      ) : (
                        <span className="text-xs text-red-600 flex items-center gap-0.5">
                          <XCircle className="w-3 h-3" /> No-show
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{v.doctor} · {v.notes}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SheetHeader({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b bg-white shrink-0">
      <div>
        <h2 className="font-semibold text-gray-900">{name}</h2>
        <p className="text-xs text-gray-500">Health Record</p>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400">{label}: </span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}
