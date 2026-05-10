"use client";

import { useEffect, useState } from "react";
import type { AppointmentRow, RiskScore } from "@/types";
import { MOCK_APPOINTMENTS, mockRiskScore, mockRiskScores } from "@/lib/mock-data";
import { PatientHealthSheet } from "@/components/PatientHealthSheet";
import { CreateAppointmentModal } from "@/components/CreateAppointmentModal";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const HOUR_START = 8;
const HOUR_END = 20;
const PX_PER_HOUR = 80;
const PX_PER_MIN = PX_PER_HOUR / 60;
const DURATION_MIN = 45;
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * PX_PER_HOUR;

type LayoutAppt = {
  appt: AppointmentRow;
  score?: RiskScore;
  col: number;
  totalCols: number;
};

function getWeekDays(anchor: Date): Date[] {
  const d = new Date(anchor);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function topPx(time: string): number {
  const d = new Date(time);
  const mins = (d.getHours() - HOUR_START) * 60 + d.getMinutes();
  return Math.max(0, mins * PX_PER_MIN);
}

function layoutDay(appts: AppointmentRow[], scores: RiskScore[]): LayoutAppt[] {
  const DUR_MS = DURATION_MIN * 60 * 1000;
  const sorted = [...appts].sort(
    (a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()
  );
  const colEnds: number[] = [];
  const placed: LayoutAppt[] = sorted.map((appt) => {
    const start = new Date(appt.appointment_time).getTime();
    const end = start + DUR_MS;
    let col = colEnds.findIndex((t) => t <= start);
    if (col === -1) col = colEnds.length;
    colEnds[col] = end;
    return { appt, score: scores.find((s) => s.patient_id === appt.patient_id), col, totalCols: 0 };
  });
  placed.forEach((item) => {
    const s = new Date(item.appt.appointment_time).getTime();
    const e = s + DUR_MS;
    const concurrent = placed.filter((o) => {
      const os = new Date(o.appt.appointment_time).getTime();
      return os < e && os + DUR_MS > s;
    });
    item.totalCols = Math.max(...concurrent.map((c) => c.col + 1));
  });
  return placed;
}

const RISK_STYLE: Record<string, string> = {
  high: "bg-red-100 border-red-400 text-red-900",
  medium: "bg-amber-100 border-amber-400 text-amber-900",
  low: "bg-green-100 border-green-400 text-green-900",
};

const DOT_STYLE: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-green-500",
};

export default function CalendarPage() {
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [appointments, setAppointments] = useState<AppointmentRow[]>(MOCK_APPOINTMENTS);
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [sheet, setSheet] = useState<AppointmentRow | null>(null);
  const [createModal, setCreateModal] = useState<{ open: boolean; date?: Date }>({ open: false });

  useEffect(() => {
    const savedAppts = sessionStorage.getItem("appointments");
    const appts: AppointmentRow[] = savedAppts ? JSON.parse(savedAppts) : MOCK_APPOINTMENTS;
    setAppointments(appts);
    const savedScores = sessionStorage.getItem("risk-scores");
    setScores(savedScores ? JSON.parse(savedScores) : mockRiskScores(appts));
  }, []);

  const days = getWeekDays(weekAnchor);
  const today = new Date();

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  function handleSaveAppointment(appt: AppointmentRow) {
    const updated = [...appointments, appt];
    setAppointments(updated);
    sessionStorage.setItem("appointments", JSON.stringify(updated));
    const newScore = mockRiskScore(appt);
    const updatedScores = [...scores, newScore];
    setScores(updatedScores);
    sessionStorage.setItem("risk-scores", JSON.stringify(updatedScores));
  }

  function shiftWeek(delta: number) {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() + delta * 7);
    setWeekAnchor(d);
  }

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointment Calendar</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Week view · color = risk level · click any appointment for patient detail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateModal({ open: true })}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" /> New Appointment
          </button>
          <button
            onClick={() => setWeekAnchor(new Date())}
            className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button onClick={() => shiftWeek(-1)} className="p-1.5 border rounded-lg hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => shiftWeek(1)} className="p-1.5 border rounded-lg hover:bg-gray-50">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 ml-1">
            {days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
            {days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Risk legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {(["high", "medium", "low"] as const).map((level) => (
          <span key={level} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${DOT_STYLE[level]}`} />
            {level.charAt(0).toUpperCase() + level.slice(1)} risk
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          Unscored
        </span>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-auto">
        <div className="flex min-w-[720px]">
          {/* Time gutter */}
          <div className="w-14 shrink-0 border-r">
            <div className="h-12 border-b" />
            <div className="relative" style={{ height: TOTAL_HEIGHT }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 flex items-start justify-end pr-2"
                  style={{ top: (h - HOUR_START) * PX_PER_HOUR - 8 }}
                >
                  <span className="text-xs text-gray-400">
                    {h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayAppts = appointments.filter((a) =>
              isSameDay(new Date(a.appointment_time), day)
            );
            const laid = layoutDay(dayAppts, scores);
            const isToday = isSameDay(day, today);

            return (
              <div key={day.toISOString()} className="flex-1 border-r last:border-r-0 min-w-[90px]">
                {/* Day header — click to create appointment on this day */}
                <button
                  onClick={() => setCreateModal({ open: true, date: day })}
                  className={`h-12 border-b flex flex-col items-center justify-center w-full group ${isToday ? "bg-blue-50" : "hover:bg-gray-50"} transition-colors`}
                >
                  <span className={`text-xs font-medium ${isToday ? "text-blue-600" : "text-gray-500"}`}>
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span
                    className={`text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                      isToday ? "bg-blue-600 text-white" : "text-gray-900 group-hover:bg-gray-200"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </button>

                {/* Time grid */}
                <div className="relative" style={{ height: TOTAL_HEIGHT }}>
                  {/* Hour lines */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
                    />
                  ))}

                  {/* Appointments */}
                  {laid.map(({ appt, score, col, totalCols }) => {
                    const level = score?.risk_level ?? "unscored";
                    const style = RISK_STYLE[level] ?? "bg-gray-100 border-gray-300 text-gray-800";
                    const width = `${100 / totalCols}%`;
                    const left = `${(col / totalCols) * 100}%`;
                    const top = topPx(appt.appointment_time);
                    const height = DURATION_MIN * PX_PER_MIN;

                    return (
                      <button
                        key={appt.patient_id}
                        onClick={() => setSheet(appt)}
                        className={`absolute border-l-4 rounded-md px-1.5 py-1 text-left hover:opacity-80 transition-opacity overflow-hidden ${style}`}
                        style={{ top, height: height - 2, width, left, right: 0 }}
                      >
                        <p className="text-xs font-semibold leading-tight truncate">{appt.patient_name}</p>
                        <p className="text-xs opacity-75 truncate">
                          {new Date(appt.appointment_time).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-xs opacity-60 truncate">{appt.appointment_type.replace(/_/g, " ")}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overlay + sheet */}
      {sheet && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSheet(null)}
          />
          <PatientHealthSheet appointment={sheet} onClose={() => setSheet(null)} />
        </>
      )}

      {/* Create appointment modal */}
      {createModal.open && (
        <CreateAppointmentModal
          initialDate={createModal.date}
          onClose={() => setCreateModal({ open: false })}
          onSave={handleSaveAppointment}
        />
      )}
    </div>
  );
}
