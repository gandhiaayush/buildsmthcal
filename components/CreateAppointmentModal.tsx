"use client";

import { useState, useRef, useEffect } from "react";
import type { AppointmentRow } from "@/types";
import { PATIENT_HEALTH } from "@/lib/patient-data";
import { MOCK_APPOINTMENTS } from "@/lib/mock-data";
import { mockRiskScore } from "@/lib/mock-data";
import { X, Search, User, CheckCircle } from "lucide-react";

const DOCTORS = ["Dr. Reyes", "Dr. Chen", "Dr. Williams", "Dr. Adams", "Dr. Patel", "Dr. Lee"];

const PROCEDURE_OPTIONS = [
  { value: "ultrasound", label: "Ultrasound" },
  { value: "appendix_removal", label: "Appendix Removal" },
  { value: "heart_surgery", label: "Heart Surgery" },
  { value: "brain_surgery", label: "Brain Surgery" },
  { value: "consultation", label: "Consultation" },
  { value: "blood_work", label: "Blood Work" },
  { value: "physical_exam", label: "Physical Exam" },
  { value: "mri_scan", label: "MRI Scan" },
  { value: "ct_scan", label: "CT Scan" },
  { value: "echocardiogram", label: "Echocardiogram" },
];

type PatientResult = {
  patient_id: string;
  patient_name: string;
  member_id: string;
  insurance_provider?: string;
  insurance_type: string;
  dob: string;
  age: number;
};

function searchPatients(query: string): PatientResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();

  return Object.values(PATIENT_HEALTH)
    .filter(
      (h) =>
        MOCK_APPOINTMENTS.find((a) => a.patient_id === h.patient_id)?.patient_name
          .toLowerCase()
          .includes(q) ||
        h.member_id.toLowerCase().includes(q) ||
        h.patient_id.toLowerCase().includes(q)
    )
    .map((h) => {
      const appt = MOCK_APPOINTMENTS.find((a) => a.patient_id === h.patient_id);
      return {
        patient_id: h.patient_id,
        patient_name: appt?.patient_name ?? h.patient_id,
        member_id: h.member_id,
        insurance_provider: appt?.insurance_provider,
        insurance_type: h.insurance_type,
        dob: h.dob,
        age: h.age,
      };
    });
}

interface Props {
  initialDate?: Date;
  onClose: () => void;
  onSave: (appt: AppointmentRow) => void;
}

export function CreateAppointmentModal({ initialDate, onClose, onSave }: Props) {
  const today = initialDate ?? new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const defaultTime = "09:00";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [selected, setSelected] = useState<PatientResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [apptType, setApptType] = useState("ultrasound");
  const [doctor, setDoctor] = useState(DOCTORS[0]);
  const [referralSource, setReferralSource] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setResults(searchPatients(query));
    setShowDropdown(query.trim().length > 0);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectPatient(p: PatientResult) {
    setSelected(p);
    setQuery(p.patient_name);
    setShowDropdown(false);
  }

  function clearPatient() {
    setSelected(null);
    setQuery("");
  }

  function handleSave() {
    if (!selected) return;
    const apptTime = new Date(`${date}T${time}:00`).toISOString();
    const newAppt: AppointmentRow = {
      patient_id: selected.patient_id,
      patient_name: selected.patient_name,
      appointment_time: apptTime,
      appointment_type: apptType,
      doctor_name: doctor,
      insurance_provider: selected.insurance_provider,
      confirmed,
      referral_source: referralSource || undefined,
      prior_no_shows: MOCK_APPOINTMENTS.find((a) => a.patient_id === selected.patient_id)?.prior_no_shows,
    };
    onSave(newAppt);
    onClose();
  }

  const canSave = !!selected && !!date && !!time && !!apptType && !!doctor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">New Appointment</h2>
            <p className="text-xs text-gray-500 mt-0.5">Search by patient name or member ID</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Patient search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Patient</label>
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); if (selected) setSelected(null); }}
                  onFocus={() => query.trim() && setShowDropdown(true)}
                  placeholder="Search name or member ID…"
                  className="w-full pl-9 pr-9 border rounded-lg py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selected && (
                  <button onClick={clearPatient} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg overflow-hidden">
                  {results.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400">No patients found</div>
                  ) : (
                    results.map((p) => (
                      <button
                        key={p.patient_id}
                        onClick={() => selectPatient(p)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{p.patient_name}</p>
                          <p className="text-xs text-gray-500">
                            {p.member_id} · DOB {p.dob} (age {p.age}) · {p.insurance_provider ?? "No insurance"}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected patient card */}
            {selected && (
              <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900 text-sm">{selected.patient_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-700">
                  <span>Member ID: <strong>{selected.member_id}</strong></span>
                  <span>Age: <strong>{selected.age}</strong></span>
                  <span>DOB: <strong>{selected.dob}</strong></span>
                  <span>Insurance: <strong>{selected.insurance_provider ?? "None"} ({selected.insurance_type})</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Date & time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Procedure type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Procedure Type</label>
            <select
              value={apptType}
              onChange={(e) => setApptType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {PROCEDURE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Attending Physician</label>
            <select
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {DOCTORS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Referral source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Referral Source <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
              placeholder="e.g. Dr. Smith"
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Confirmed toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setConfirmed((v) => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors ${confirmed ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${confirmed ? "translate-x-5" : "translate-x-1"}`}
              />
            </button>
            <label className="text-sm text-gray-700">Mark as confirmed</label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            Risk score will be auto-estimated from patient history
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors font-medium"
            >
              Schedule Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
