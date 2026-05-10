"use client";

import { useState, useEffect } from "react";
import { MOCK_APPOINTMENTS, mockRiskScores } from "@/lib/mock-data";
import { HOSPITAL_ROOMS, assignRoom, type HospitalRoom, type EquipmentItem } from "@/lib/hospital-rooms";
import { PatientHealthSheet } from "@/components/PatientHealthSheet";
import type { AppointmentRow, RiskScore } from "@/types";
import {
  Activity, Wrench, CheckCircle, AlertTriangle, Clock,
  Cpu, ZapOff, ChevronDown, ChevronUp, User, Shield,
} from "lucide-react";

const RISK_PILL = {
  high: "bg-red-100 text-red-800 border border-red-300",
  medium: "bg-amber-100 text-amber-800 border border-amber-300",
  low: "bg-green-100 text-green-800 border border-green-300",
  unscored: "bg-gray-100 text-gray-600 border border-gray-200",
};

const EQ_STATUS: Record<EquipmentItem["status"], { icon: React.ElementType; cls: string; label: string }> = {
  available: { icon: CheckCircle, cls: "text-green-500", label: "Available" },
  "in-use": { icon: Activity, cls: "text-blue-500", label: "In Use" },
  maintenance: { icon: Wrench, cls: "text-amber-500", label: "Maintenance" },
};

function RoomCard({
  room,
  appointments,
  scores,
  onSelectAppt,
}: {
  room: HospitalRoom;
  appointments: AppointmentRow[];
  scores: RiskScore[];
  onSelectAppt: (a: AppointmentRow) => void;
}) {
  const [eqOpen, setEqOpen] = useState(false);

  const apptScore = (a: AppointmentRow) =>
    scores.find((s) => s.patient_id === a.patient_id);

  const maintenanceCount = room.equipment.filter((e) => e.status === "maintenance").length;
  const inUseCount = room.equipment.filter((e) => e.status === "in-use").length;
  const occupancy = appointments.length;
  const utilPct = Math.min(100, Math.round((occupancy / room.capacity) * 100));
  const isFull = occupancy >= room.capacity;

  return (
    <div className={`rounded-2xl border-2 ${room.borderColor} ${room.color} overflow-hidden flex flex-col`}>
      {/* Room header */}
      <div className={`px-5 py-3 border-b-2 ${room.borderColor} flex items-center justify-between`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 tracking-widest">ROOM {room.number}</span>
            {maintenanceCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <AlertTriangle className="w-3 h-3" /> {maintenanceCount} in maintenance
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-900 text-base">{room.name}</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Utilisation</p>
          <p className={`text-lg font-bold ${isFull ? "text-red-600" : "text-gray-900"}`}>
            {utilPct}%
          </p>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="px-5 py-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isFull ? "bg-red-500" : "bg-green-500"}`}
              style={{ width: `${utilPct}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{occupancy}/{room.capacity} slots</span>
        </div>
      </div>

      {/* Appointments */}
      <div className="px-5 pb-3 space-y-2 flex-1">
        {appointments.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            <Clock className="w-6 h-6 mx-auto mb-1 opacity-40" />
            No appointments today
          </div>
        ) : (
          appointments.map((appt) => {
            const score = apptScore(appt);
            const level = score?.risk_level ?? "unscored";
            const time = new Date(appt.appointment_time).toLocaleTimeString("en-US", {
              hour: "numeric", minute: "2-digit",
            });
            return (
              <button
                key={appt.patient_id}
                onClick={() => onSelectAppt(appt)}
                className="w-full flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{appt.patient_name}</p>
                  <p className="text-xs text-gray-500 truncate">{time} · {appt.appointment_type.replace(/_/g, " ")}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${RISK_PILL[level as keyof typeof RISK_PILL]}`}>
                  {score ? `${Math.round(score.risk_score * 100)}%` : "—"}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Equipment toggle */}
      <div className="border-t-2 border-dashed border-current border-opacity-20">
        <button
          onClick={() => setEqOpen(!eqOpen)}
          className="w-full flex items-center justify-between px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Equipment ({room.equipment.length})
            {inUseCount > 0 && (
              <span className="text-xs text-blue-600">{inUseCount} in use</span>
            )}
          </span>
          {eqOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {eqOpen && (
          <div className="px-5 pb-4 space-y-1.5">
            {room.equipment.map((eq) => {
              const cfg = EQ_STATUS[eq.status];
              const Icon = cfg.icon;
              return (
                <div key={eq.id} className="flex items-center gap-2.5 text-sm">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.cls}`} />
                  <span className="flex-1 text-gray-700">{eq.name}</span>
                  <span className={`text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Floor plan SVG ────────────────────────────────────────────────────────────

function FloorPlan({ rooms, occupancies }: { rooms: HospitalRoom[]; occupancies: Record<string, number> }) {
  const colors = ["#e0f2fe", "#fff1f2", "#f5f3ff"];
  const borders = ["#7dd3fc", "#fda4af", "#c4b5fd"];

  return (
    <svg viewBox="0 0 700 200" className="w-full" style={{ maxHeight: 200 }}>
      {/* Outer clinic wall */}
      <rect x="10" y="10" width="680" height="180" rx="10" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      {/* Corridor label */}
      <text x="350" y="180" textAnchor="middle" fontSize="11" fill="#94a3b8" fontFamily="sans-serif">CORRIDOR</text>

      {rooms.map((room, idx) => {
        const x = 30 + idx * 220;
        const occ = occupancies[room.id] ?? 0;
        const pct = occ / room.capacity;
        const statusColor = pct >= 1 ? "#ef4444" : pct >= 0.5 ? "#f59e0b" : "#22c55e";

        return (
          <g key={room.id}>
            <rect x={x} y={20} width={200} height={140} rx="8"
              fill={colors[idx]} stroke={borders[idx]} strokeWidth="2" />
            {/* Room number badge */}
            <rect x={x + 8} y={28} width={44} height={18} rx="4" fill={borders[idx]} />
            <text x={x + 30} y={41} textAnchor="middle" fontSize="10"
              fontWeight="bold" fill="white" fontFamily="sans-serif">
              {room.number}
            </text>
            {/* Room name */}
            <text x={x + 100} y={42} textAnchor="middle" fontSize="11"
              fontWeight="600" fill="#1e293b" fontFamily="sans-serif">
              {room.name}
            </text>
            {/* Occupancy bar */}
            <rect x={x + 12} y={54} width={176} height={8} rx="4" fill="#e2e8f0" />
            <rect x={x + 12} y={54} width={Math.round(176 * pct)} height={8} rx="4" fill={statusColor} />
            <text x={x + 100} y={78} textAnchor="middle" fontSize="10"
              fill="#64748b" fontFamily="sans-serif">
              {occ}/{room.capacity} appointments · {room.equipment.length} equipment items
            </text>
            {/* Equipment dot indicators */}
            {room.equipment.slice(0, 6).map((eq, ei) => {
              const dotColor = eq.status === "available" ? "#22c55e"
                : eq.status === "in-use" ? "#3b82f6" : "#f59e0b";
              return (
                <circle key={eq.id} cx={x + 20 + ei * 22} cy={100} r={7}
                  fill={dotColor} opacity={0.85} />
              );
            })}
            {/* Appointment slots */}
            {Array.from({ length: room.capacity }).map((_, si) => {
              const filled = si < occ;
              return (
                <rect key={si} x={x + 12 + si * (182 / room.capacity)}
                  y={118} width={Math.max(16, 176 / room.capacity - 4)} height={28}
                  rx="4" fill={filled ? borders[idx] : "#f1f5f9"}
                  stroke={borders[idx]} strokeWidth="1" opacity={filled ? 0.9 : 0.5} />
              );
            })}
          </g>
        );
      })}

      {/* Legend */}
      {[{ color: "#22c55e", label: "Available" }, { color: "#3b82f6", label: "In Use" }, { color: "#f59e0b", label: "Maintenance" }].map(({ color, label }, i) => (
        <g key={label}>
          <circle cx={560 + i * 0} cy={170 - i * 0} r={4} fill={color} />
          <text x={568} y={174 - i * 14} fontSize="9" fill="#64748b" fontFamily="sans-serif">{label}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HospitalMapPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [sheet, setSheet] = useState<AppointmentRow | null>(null);
  const [eqEditing, setEqEditing] = useState<Record<string, EquipmentItem["status"]>>({});
  const [rooms, setRooms] = useState(HOSPITAL_ROOMS);

  useEffect(() => {
    const saved = sessionStorage.getItem("appointments");
    const appts: AppointmentRow[] = saved ? JSON.parse(saved) : MOCK_APPOINTMENTS;
    setAppointments(appts);
    const savedScores = sessionStorage.getItem("risk-scores");
    setScores(savedScores ? JSON.parse(savedScores) : mockRiskScores(appts));
  }, []);

  function toggleEquipment(roomId: string, eqId: string, status: EquipmentItem["status"]) {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, equipment: r.equipment.map((e) => e.id === eqId ? { ...e, status } : e) }
          : r
      )
    );
  }

  const apptsByRoom = rooms.reduce<Record<string, AppointmentRow[]>>((acc, room) => {
    acc[room.id] = appointments.filter((a) => room.procedures.includes(a.appointment_type));
    return acc;
  }, {});

  const occupancies = rooms.reduce<Record<string, number>>((acc, r) => {
    acc[r.id] = apptsByRoom[r.id]?.length ?? 0;
    return acc;
  }, {});

  const totalAppts = appointments.length;
  const highRisk = scores.filter((s) => s.risk_level === "high").length;
  const maintenanceItems = rooms.flatMap((r) => r.equipment.filter((e) => e.status === "maintenance"));

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Map</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Floor 1 · 3 rooms · live equipment status · click any appointment to open patient sheet
          </p>
        </div>
        <div className="flex gap-3">
          {[
            { label: "Appointments", value: totalAppts, color: "text-gray-900" },
            { label: "High Risk", value: highRisk, color: "text-red-600" },
            { label: "Maintenance", value: maintenanceItems.length, color: "text-amber-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border rounded-xl px-4 py-2.5 text-center min-w-[90px]">
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance alert */}
      {maintenanceItems.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium">Equipment requiring attention:</p>
            <p className="text-amber-700 mt-0.5">
              {maintenanceItems.map((e) => e.name).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Floor plan SVG */}
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Floor Plan — Demo Clinic · Level 1</p>
        <FloorPlan rooms={rooms} occupancies={occupancies} />
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Equipment available</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> In use</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Maintenance</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-300 inline-block" /> Filled slot</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Empty slot</span>
        </div>
      </div>

      {/* Room cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            appointments={apptsByRoom[room.id] ?? []}
            scores={scores}
            onSelectAppt={setSheet}
          />
        ))}
      </div>

      {/* Equipment status table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Cpu className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">All Equipment — Status Control</h2>
          <span className="text-xs text-gray-400 ml-auto">Click status badge to toggle</span>
        </div>
        <div className="divide-y">
          {rooms.map((room) =>
            room.equipment.map((eq) => {
              const STATUS_OPTIONS: EquipmentItem["status"][] = ["available", "in-use", "maintenance"];
              const cfg = EQ_STATUS[eq.status];
              const Icon = cfg.icon;
              return (
                <div key={eq.id} className="flex items-center px-5 py-3 hover:bg-gray-50">
                  <div className="w-28 shrink-0">
                    <span className="text-xs font-medium text-gray-500">Room {room.number}</span>
                  </div>
                  <Icon className={`w-4 h-4 ${cfg.cls} mr-3 shrink-0`} />
                  <p className="flex-1 text-sm text-gray-900">{eq.name}</p>
                  <div className="flex items-center gap-1">
                    {STATUS_OPTIONS.map((s) => {
                      const isCurrent = eq.status === s;
                      const colors: Record<typeof s, string> = {
                        available: "bg-green-100 text-green-700 border-green-300",
                        "in-use": "bg-blue-100 text-blue-700 border-blue-300",
                        maintenance: "bg-amber-100 text-amber-700 border-amber-300",
                      };
                      return (
                        <button
                          key={s}
                          onClick={() => toggleEquipment(room.id, eq.id, s)}
                          className={`text-xs px-2 py-1 rounded-lg border font-medium transition-all ${
                            isCurrent ? colors[s] : "text-gray-400 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {sheet && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSheet(null)} />
          <PatientHealthSheet appointment={sheet} onClose={() => setSheet(null)} />
        </>
      )}
    </div>
  );
}
