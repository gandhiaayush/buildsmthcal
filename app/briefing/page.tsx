"use client";

import { useEffect, useState } from "react";
import type { RiskScore, AppointmentRow, InsuranceStatus } from "@/types";
import { MorningBriefCard } from "@/components/MorningBriefCard";
import { RiskBadge } from "@/components/RiskBadge";
import { MOCK_APPOINTMENTS, mockRiskScores } from "@/lib/mock-data";
import { isInsuranceAccepted } from "@/lib/insurance-list";
import { formatTime, formatCurrency } from "@/lib/utils";
import { AlertTriangle, Shield, GitBranch, DollarSign } from "lucide-react";

export default function BriefingPage() {
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>(MOCK_APPOINTMENTS);
  const [brief, setBrief] = useState<any>(null);
  const avgVisitValue = Number(process.env.NEXT_PUBLIC_AVG_VISIT_VALUE ?? 250);

  useEffect(() => {
    const savedScores = sessionStorage.getItem("risk-scores");
    const savedAppts = sessionStorage.getItem("appointments");
    const appts: AppointmentRow[] = savedAppts ? JSON.parse(savedAppts) : MOCK_APPOINTMENTS;
    const sc: RiskScore[] = savedScores ? JSON.parse(savedScores) : mockRiskScores(appts);
    setAppointments(appts);
    setScores(sc);

    fetch("/api/morning-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores: sc }),
    })
      .then((r) => r.json())
      .then(setBrief);
  }, []);

  const insuranceIssues = appointments.filter((a) => !isInsuranceAccepted(a.insurance_provider));
  const referralGaps = appointments.filter((a) => !a.referral_source).length;
  const highRisk = scores.filter((s) => s.risk_level === "high");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Morning Staff Briefing</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Daily summary to prepare your team before the first patient arrives
        </p>
      </div>

      {brief && <MorningBriefCard data={brief} />}

      {/* Action items */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ActionCard
          icon={AlertTriangle}
          title="High-Risk Patients"
          count={highRisk.length}
          color="red"
          items={highRisk.map((s) => ({
            label: s.patient_name,
            sub: formatTime(s.appointment_time),
          }))}
        />
        <ActionCard
          icon={Shield}
          title="Insurance Issues"
          count={insuranceIssues.length}
          color="amber"
          items={insuranceIssues.map((a) => ({
            label: a.patient_name,
            sub: a.insurance_provider ?? "No insurance",
          }))}
        />
        <ActionCard
          icon={GitBranch}
          title="Referral Gaps"
          count={referralGaps}
          color="blue"
          items={appointments
            .filter((a) => !a.referral_source)
            .map((a) => ({ label: a.patient_name, sub: "No referral source" }))}
        />
      </div>

      {/* Revenue estimate */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <h3 className="font-medium text-gray-900">Revenue Estimate</h3>
        </div>
        <p className="text-sm text-gray-600">
          With <strong>{highRisk.length}</strong> high-risk patients and an average visit value of{" "}
          <strong>{formatCurrency(avgVisitValue)}</strong>, you have{" "}
          <strong className="text-red-600">{formatCurrency(highRisk.length * avgVisitValue)}</strong> at risk today.
        </p>
      </div>

      {/* Full risk list */}
      {scores.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-medium text-gray-700 text-sm">Full Schedule Risk Overview</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Patient</th>
                <th className="px-4 py-3 font-medium text-gray-600">Time</th>
                <th className="px-4 py-3 font-medium text-gray-600">Risk</th>
                <th className="px-4 py-3 font-medium text-gray-600">Top Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...scores]
                .sort((a, b) => b.risk_score - a.risk_score)
                .map((s) => (
                  <tr key={s.patient_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.patient_name}</td>
                    <td className="px-4 py-3 text-gray-600">{formatTime(s.appointment_time)}</td>
                    <td className="px-4 py-3">
                      <RiskBadge level={s.risk_level} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.reasons[0] ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  count,
  color,
  items,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  color: "red" | "amber" | "blue";
  items: { label: string; sub: string }[];
}) {
  const styles = {
    red: { border: "border-red-200 bg-red-50", header: "text-red-700", count: "text-red-700" },
    amber: { border: "border-amber-200 bg-amber-50", header: "text-amber-700", count: "text-amber-700" },
    blue: { border: "border-blue-200 bg-blue-50", header: "text-blue-700", count: "text-blue-700" },
  }[color];

  return (
    <div className={`rounded-xl border p-4 ${styles.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 font-medium text-sm ${styles.header}`}>
          <Icon className="w-4 h-4" />
          {title}
        </div>
        <span className={`text-xl font-bold ${styles.count}`}>{count}</span>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.slice(0, 4).map((item) => (
            <li key={item.label} className="text-sm text-gray-700">
              <span className="font-medium">{item.label}</span>
              <span className="text-gray-500"> · {item.sub}</span>
            </li>
          ))}
          {items.length > 4 && (
            <li className="text-xs text-gray-400">+{items.length - 4} more</li>
          )}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">None — all clear!</p>
      )}
    </div>
  );
}
