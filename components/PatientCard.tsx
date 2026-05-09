"use client";

import { useState } from "react";
import type { AppointmentRow, RiskScore, InsuranceStatus } from "@/types";
import { RiskBadge } from "./RiskBadge";
import { formatTime } from "@/lib/utils";
import { Phone, Mail, Shield, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface PatientCardProps {
  appointment: AppointmentRow;
  riskScore?: RiskScore;
  insuranceStatus?: InsuranceStatus;
  patientEmail?: string;
  onEmailChange?: (email: string) => void;
  telehealthSentAt?: string | null;
  onSendTelehealth?: () => Promise<void>;
  onTriggerVoice?: () => Promise<void>;
}

export function PatientCard({
  appointment,
  riskScore,
  insuranceStatus,
  patientEmail,
  onEmailChange,
  telehealthSentAt,
  onSendTelehealth,
  onTriggerVoice,
}: PatientCardProps) {
  const [loading, setLoading] = useState<"telehealth" | "voice" | null>(null);

  const handleTelehealth = async () => {
    if (!onSendTelehealth) return;
    setLoading("telehealth");
    await onSendTelehealth();
    setLoading(null);
  };

  const handleVoice = async () => {
    if (!onTriggerVoice) return;
    setLoading("voice");
    await onTriggerVoice();
    setLoading(null);
  };

  return (
    <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">{appointment.patient_name}</h3>
          <p className="text-sm text-gray-500">
            {formatTime(appointment.appointment_time)} · {appointment.doctor_name}
          </p>
        </div>
        {riskScore && <RiskBadge level={riskScore.risk_level} score={riskScore.risk_score} />}
      </div>

      {/* Insurance status */}
      {insuranceStatus && (
        <div className="flex items-center gap-1.5 text-sm">
          <Shield className="w-3.5 h-3.5 text-gray-400" />
          {insuranceStatus.verified ? (
            <span className="text-green-700 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> {appointment.insurance_provider} verified
            </span>
          ) : (
            <span className="text-red-600 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              {insuranceStatus.flag_reason ?? "Insurance issue"}
            </span>
          )}
        </div>
      )}

      {/* Reasons */}
      {riskScore && riskScore.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {riskScore.reasons.map((r) => (
            <span key={r} className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Patient email input */}
      {onEmailChange !== undefined && (
        <input
          type="email"
          value={patientEmail ?? ""}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="Patient email for outreach"
          className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {/* Telehealth sent badge */}
      {telehealthSentAt ? (
        <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          Telehealth offer sent {telehealthSentAt}
        </div>
      ) : null}

      {/* Actions */}
      {(onSendTelehealth || onTriggerVoice) && (
        <div className="flex gap-2 pt-1">
          {onSendTelehealth && !telehealthSentAt && (
            <button
              onClick={handleTelehealth}
              disabled={loading !== null}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              {loading === "telehealth" ? "Sending..." : "Telehealth Offer"}
            </button>
          )}
          {onTriggerVoice && (
            <button
              onClick={handleVoice}
              disabled={loading !== null}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              {loading === "voice" ? "Queuing..." : "Voice Call"}
            </button>
          )}
        </div>
      )}

      {/* No insurance warning */}
      {!insuranceStatus && !appointment.insurance_provider && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <AlertCircle className="w-3.5 h-3.5" /> No insurance on file
        </div>
      )}
    </div>
  );
}
