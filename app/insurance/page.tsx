"use client";

import { useEffect, useState } from "react";
import type { AppointmentRow, InsuranceStatus } from "@/types";
import { MOCK_APPOINTMENTS } from "@/lib/mock-data";
import { isInsuranceAccepted } from "@/lib/insurance-list";
import { getCoverage, getPlanType, INSURANCE_COVERAGE } from "@/lib/insurance-coverage";
import { PATIENT_HEALTH } from "@/lib/patient-data";
import { formatProcedureName } from "@/lib/prep-instructions";
import {
  CheckCircle, XCircle, AlertCircle, Shield, ChevronDown, ChevronUp,
  Mail, Loader2, AlertTriangle,
} from "lucide-react";

type ExpandedState = Record<string, boolean>;
type EmailState = Record<string, { sending: boolean; sent: boolean; error: string | null }>;

export default function InsurancePage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>(MOCK_APPOINTMENTS);
  const [statuses, setStatuses] = useState<InsuranceStatus[]>([]);
  const [patientEmails, setPatientEmails] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [emailState, setEmailState] = useState<EmailState>({});

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
    const savedEmails = sessionStorage.getItem("patient-emails");
    if (savedEmails) setPatientEmails(JSON.parse(savedEmails));
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function sendNotice(appt: AppointmentRow, status: InsuranceStatus) {
    const email = patientEmails[appt.patient_id] ?? appt.patient_email ?? "";
    if (!email) return;
    setEmailState((prev) => ({ ...prev, [appt.patient_id]: { sending: true, sent: false, error: null } }));
    try {
      const res = await fetch("/api/send-insurance-notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: appt.patient_name,
          patient_email: email,
          insurance_provider: appt.insurance_provider ?? "",
          flag_reason: status.flag_reason ?? "Insurance issue detected",
          procedure: appt.appointment_type,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailState((prev) => ({ ...prev, [appt.patient_id]: { sending: false, sent: true, error: null } }));
      } else {
        setEmailState((prev) => ({ ...prev, [appt.patient_id]: { sending: false, sent: false, error: data.error ?? "Send failed" } }));
      }
    } catch {
      setEmailState((prev) => ({ ...prev, [appt.patient_id]: { sending: false, sent: false, error: "Network error" } }));
    }
  }

  const verified = statuses.filter((s) => s.verified).length;
  const flagged = statuses.filter((s) => !s.verified).length;
  const coverageIssues = appointments.filter((a) => {
    const c = getCoverage(a.insurance_provider, a.appointment_type);
    return !c.covered;
  }).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insurance Pre-Verification</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Provider acceptance, plan type, and procedure-level coverage analysis
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <Stat value={verified} label="Verified" color="green" />
        <Stat value={flagged} label="Not Accepted" color="red" />
        <Stat value={coverageIssues} label="Coverage Gaps" color="amber" />
        <Stat value={statuses.length} label="Total Patients" color="gray" />
      </div>

      {/* Patient rows */}
      <div className="space-y-3">
        {appointments.map((appt, i) => {
          const status = statuses[i];
          if (!status) return null;
          const coverage = getCoverage(appt.insurance_provider, appt.appointment_type);
          const planType = getPlanType(appt.insurance_provider);
          const health = PATIENT_HEALTH[appt.patient_id];
          const email = patientEmails[appt.patient_id] ?? appt.patient_email ?? "";
          const es = emailState[appt.patient_id];
          const isOpen = !!expanded[appt.patient_id];

          const hasCoverageWarning = status.verified && !coverage.covered;
          const hasPriorAuthWarning = status.verified && coverage.covered && coverage.prior_auth_required;

          return (
            <div key={appt.patient_id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              {/* Row header */}
              <button
                onClick={() => toggle(appt.patient_id)}
                className="w-full px-4 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{appt.patient_name}</span>
                    {appt.insurance_provider && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded font-medium">
                        {planType}
                      </span>
                    )}
                    {hasCoverageWarning && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Procedure not covered
                      </span>
                    )}
                    {hasPriorAuthWarning && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded font-medium">
                        ⚠ Prior auth required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {appt.doctor_name} · {formatProcedureName(appt.appointment_type)} · {appt.insurance_provider ?? "No insurance"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!status ? null : status.verified ? (
                    <span className="flex items-center gap-1 text-green-700 text-sm">
                      <CheckCircle className="w-4 h-4" /> Accepted
                    </span>
                  ) : !appt.insurance_provider ? (
                    <span className="flex items-center gap-1 text-gray-500 text-sm">
                      <AlertCircle className="w-4 h-4" /> Missing
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 text-sm">
                      <XCircle className="w-4 h-4" /> Not accepted
                    </span>
                  )}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t bg-gray-50 px-4 py-4 space-y-4">
                  {/* Coverage detail */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Procedure Coverage — {formatProcedureName(appt.appointment_type)}
                    </p>
                    <div className={`rounded-lg border p-3 ${coverage.covered ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {coverage.covered ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`font-semibold text-sm ${coverage.covered ? "text-green-800" : "text-red-800"}`}>
                          {coverage.covered ? `${coverage.coverage_pct}% covered` : "Not covered under this plan"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs text-gray-600 mt-2">
                        <div>
                          <span className="text-gray-400">Coverage</span>
                          <p className="font-medium">{coverage.coverage_pct}%</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Copay</span>
                          <p className="font-medium">{coverage.copay !== undefined ? `$${coverage.copay}` : "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Prior Auth</span>
                          <p className={`font-medium ${coverage.prior_auth_required ? "text-amber-600" : "text-green-600"}`}>
                            {coverage.prior_auth_required ? "Required" : "Not required"}
                          </p>
                        </div>
                      </div>
                      {coverage.notes && (
                        <p className="text-xs text-gray-600 mt-2 italic">{coverage.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Insurance details */}
                  {health && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Plan Details</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <InfoBox label="Member ID" value={health.member_id} />
                        <InfoBox label="Group ID" value={health.group_id} />
                        <InfoBox label="Deductible Met" value={`$${health.deductible_met.toLocaleString()} / $${health.deductible.toLocaleString()}`} />
                        <InfoBox label="OOP Met" value={`$${health.out_of_pocket_met.toLocaleString()} / $${health.out_of_pocket_max.toLocaleString()}`} />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {!status.verified || hasCoverageWarning || hasPriorAuthWarning ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {email ? (
                          es?.sent ? (
                            <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                              <CheckCircle className="w-3.5 h-3.5" /> Insurance notice sent
                            </span>
                          ) : (
                            <button
                              onClick={() => sendNotice(appt, status)}
                              disabled={!!es?.sending}
                              className="flex items-center gap-2 text-sm px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              {es?.sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                              Send Insurance Notice
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-gray-500 italic">
                            Set patient email on Upload tab to send notice
                          </span>
                        )}
                        {es?.error && (
                          <span className="text-xs text-red-600">{es.error}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      No action required — insurance verified and procedure covered
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All accepted providers with plan types */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-blue-500" />
          <h2 className="font-medium text-gray-900">Accepted Providers</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(INSURANCE_COVERAGE).map(([name, data]) => (
            <span key={name} className="flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-800 text-sm rounded-full">
              {name}
              <span className="text-xs text-green-600 opacity-75">({data.plan_type})</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  const colors: Record<string, string> = {
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    gray: "bg-white border-gray-200 text-gray-700",
  };
  const numColors: Record<string, string> = {
    green: "text-green-700",
    red: "text-red-700",
    amber: "text-amber-700",
    gray: "text-gray-900",
  };
  return (
    <div className={`border rounded-xl p-4 text-center ${colors[color]}`}>
      <p className={`text-2xl font-bold ${numColors[color]}`}>{value}</p>
      <p className="text-sm mt-0.5">{label}</p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-800 text-sm truncate">{value}</p>
    </div>
  );
}
