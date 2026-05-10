"use client";

import { useState } from "react";
import { X, Heart, Phone, Mail, MapPin, Car, Calendar, CheckCircle, Loader2 } from "lucide-react";
import type { AppointmentRow } from "@/types";
import { PATIENT_HEALTH } from "@/lib/patient-data";
import { markCaregiverSent } from "@/lib/sync-store";

interface Props {
  appointment: AppointmentRow;
  onClose: () => void;
}

export function CaregiverModal({ appointment, onClose }: Props) {
  const health = PATIENT_HEALTH[appointment.patient_id];
  const caregiver = health?.caregiver;
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [customNote, setCustomNote] = useState("");

  const apptDate = new Date(appointment.appointment_time);
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Demo Clinic";
  const clinicAddress = "1200 Health Plaza, Suite 400, San Francisco, CA 94103";
  const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(clinicAddress)}`;

  async function sendReminder() {
    if (!caregiver?.email) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/send-caregiver-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caregiver_name: caregiver.name,
          caregiver_email: caregiver.email,
          patient_name: appointment.patient_name,
          appointment_time: appointment.appointment_time,
          appointment_type: appointment.appointment_type,
          doctor_name: appointment.doctor_name,
          clinic_address: clinicAddress,
          maps_link: mapsLink,
          custom_note: customNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        markCaregiverSent(appointment.patient_id);
        setSent(true);
      } else {
        setError(data.error ?? "Failed to send.");
      }
    } catch {
      setError("Network error — could not reach server.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Caregiver Loop</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-rose-100 text-sm mt-0.5">
            Notify {caregiver?.name ?? "caregiver"} about {appointment.patient_name}&apos;s appointment
          </p>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Patient info */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
            <p className="font-semibold text-gray-800">{appointment.patient_name}</p>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>
                {apptDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at{" "}
                {apptDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-gray-400 text-xs">Procedure:</span>
              <span className="capitalize">{appointment.appointment_type.replace(/_/g, " ")}</span>
              <span className="text-gray-400">·</span>
              <span>{appointment.doctor_name}</span>
            </div>
          </div>

          {/* Caregiver info */}
          {caregiver ? (
            <div className="border border-rose-200 bg-rose-50 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-semibold text-rose-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                {caregiver.name}
                <span className="font-normal text-rose-600 text-xs">({caregiver.relation})</span>
              </p>
              <div className="flex items-center gap-2 text-rose-700">
                <Phone className="w-3.5 h-3.5 text-rose-400" />
                {caregiver.phone}
              </div>
              <div className="flex items-center gap-2 text-rose-700">
                <Mail className="w-3.5 h-3.5 text-rose-400" />
                {caregiver.email}
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl p-4 text-sm text-gray-500">
              No caregiver on file for this patient.
            </div>
          )}

          {/* What the email includes */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Email will include:</p>
            <div className="space-y-2 text-sm text-gray-600">
              {[
                { icon: Calendar, text: "Appointment date, time, and doctor" },
                { icon: Car, text: "Reminder to arrange transportation / be the designated driver" },
                { icon: MapPin, text: `Clinic address with Google Maps link` },
                { icon: Heart, text: "Post-procedure recovery care notes" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-2.5">
                  <Icon className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Custom note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Custom note to caregiver <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Please remind patient to fast for 12 hours before the procedure."
              rows={3}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          {sent ? (
            <span className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <CheckCircle className="w-4 h-4" /> Reminder sent to {caregiver?.name}
            </span>
          ) : (
            <button
              onClick={sendReminder}
              disabled={sending || !caregiver?.email}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-40 transition-colors font-medium"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send Caregiver Reminder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
