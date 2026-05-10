"use client";

import { useState, useEffect } from "react";
import { MOCK_APPOINTMENTS } from "@/lib/mock-data";
import { PATIENT_HEALTH } from "@/lib/patient-data";
import { getChargeSchedule, totalBaseCharge, type ChargeLineItem } from "@/lib/procedure-charges";
import { getCoverage } from "@/lib/insurance-coverage";
import { getEditedCharges, saveEditedCharges } from "@/lib/sync-store";
import { FileText, ChevronDown, ChevronUp, Pencil, Check, X, Download, DollarSign } from "lucide-react";
import type { AppointmentRow } from "@/types";

type EditableItem = ChargeLineItem & { editing?: boolean; draft?: string };

type PatientChargeState = {
  expanded: boolean;
  items: EditableItem[];
};

const CATEGORY_COLORS: Record<string, string> = {
  professional: "bg-blue-50 text-blue-700 border-blue-200",
  facility: "bg-purple-50 text-purple-700 border-purple-200",
  ancillary: "bg-amber-50 text-amber-700 border-amber-200",
  medication: "bg-green-50 text-green-700 border-green-200",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function ChargesPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [states, setStates] = useState<Record<string, PatientChargeState>>({});

  useEffect(() => {
    const saved = sessionStorage.getItem("appointments");
    const appts: AppointmentRow[] = saved ? JSON.parse(saved) : MOCK_APPOINTMENTS;
    setAppointments(appts);

    const editedCharges = getEditedCharges();
    const init: Record<string, PatientChargeState> = {};
    appts.forEach((a) => {
      const schedule = getChargeSchedule(a.appointment_type);
      const savedItems = editedCharges[a.patient_id];
      init[a.patient_id] = {
        expanded: false,
        items: savedItems
          ? savedItems.map((i) => ({ ...i } as EditableItem))
          : schedule.line_items.map((i) => ({ ...i } as EditableItem)),
      };
    });
    setStates(init);
  }, []);

  function toggleExpand(id: string) {
    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], expanded: !prev[id].expanded },
    }));
  }

  function startEdit(patientId: string, idx: number) {
    setStates((prev) => {
      const items = [...prev[patientId].items];
      items[idx] = { ...items[idx], editing: true, draft: String(items[idx].base_charge) };
      return { ...prev, [patientId]: { ...prev[patientId], items } };
    });
  }

  function commitEdit(patientId: string, idx: number) {
    setStates((prev) => {
      const items = [...prev[patientId].items];
      const val = parseFloat(items[idx].draft ?? "0");
      items[idx] = { ...items[idx], base_charge: isNaN(val) ? items[idx].base_charge : val, editing: false, draft: undefined };
      saveEditedCharges(patientId, items);
      return { ...prev, [patientId]: { ...prev[patientId], items } };
    });
  }

  function cancelEdit(patientId: string, idx: number) {
    setStates((prev) => {
      const items = [...prev[patientId].items];
      items[idx] = { ...items[idx], editing: false, draft: undefined };
      return { ...prev, [patientId]: { ...prev[patientId], items } };
    });
  }

  function printReport(appt: AppointmentRow) {
    const health = PATIENT_HEALTH[appt.patient_id];
    const items = states[appt.patient_id]?.items ?? [];
    const total = totalBaseCharge(items);
    const coverage = getCoverage(appt.insurance_provider ?? "", appt.appointment_type);
    const insAdj = coverage ? Math.round(total * (coverage.coverage_pct / 100)) : 0;
    const patResp = total - insAdj + (coverage?.copay ?? 0);

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Cost Report — ${appt.patient_name}</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#1a1a1a}
      h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}
      th{background:#f5f5f5}tfoot td{font-weight:bold}
      .summary{margin-top:24px;background:#f9f9f9;padding:16px;border-radius:8px}
      </style></head><body>
      <h1>Cost Estimate Report</h1>
      <p><strong>Patient:</strong> ${appt.patient_name} &nbsp; <strong>ID:</strong> ${appt.patient_id}</p>
      <p><strong>Procedure:</strong> ${appt.appointment_type.replace(/_/g, " ")} &nbsp; <strong>Physician:</strong> ${appt.doctor_name}</p>
      <p><strong>Date:</strong> ${new Date(appt.appointment_time).toLocaleDateString()}</p>
      <table>
        <thead><tr><th>CPT Code</th><th>Description</th><th>Category</th><th>Charge</th></tr></thead>
        <tbody>${items.map((i) => `<tr><td>${i.code}</td><td>${i.description}</td><td>${i.category}</td><td>$${i.base_charge.toLocaleString()}</td></tr>`).join("")}</tbody>
        <tfoot><tr><td colspan="3">Total Billed</td><td>$${total.toLocaleString()}</td></tr></tfoot>
      </table>
      <div class="summary">
        <p>Insurance Adjustment (${coverage?.coverage_pct ?? 0}% coverage): -$${insAdj.toLocaleString()}</p>
        <p>Copay: $${coverage?.copay ?? 0}</p>
        <p><strong>Estimated Patient Responsibility: $${patResp.toLocaleString()}</strong></p>
        <p style="font-size:12px;color:#666;margin-top:8px">This is an estimate only. Final charges may vary based on clinical decisions and insurance adjudication.</p>
      </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  const grandTotal = Object.values(states).reduce(
    (sum, s) => sum + totalBaseCharge(s.items),
    0
  );

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Charges & Cost Reports</h1>
          <p className="text-gray-500 text-sm mt-0.5">Itemized charge schedule per patient · editable · printable</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-gray-500">Total Billed Today</p>
            <p className="text-xl font-bold text-gray-900">{fmt(grandTotal)}</p>
          </div>
        </div>
      </div>

      {appointments.map((appt) => {
        const state = states[appt.patient_id];
        if (!state) return null;
        const health = PATIENT_HEALTH[appt.patient_id];
        const total = totalBaseCharge(state.items);
        const coverage = getCoverage(appt.insurance_provider ?? "", appt.appointment_type);
        const insAdj = coverage ? Math.round(total * (coverage.coverage_pct / 100)) : 0;
        const patResp = total - insAdj + (coverage?.copay ?? 0);

        return (
          <div key={appt.patient_id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Header row */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(appt.patient_id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{appt.patient_name}</p>
                  <p className="text-xs text-gray-500">
                    {appt.appointment_type.replace(/_/g, " ")} · {appt.doctor_name} ·{" "}
                    {new Date(appt.appointment_time).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total Billed</p>
                  <p className="font-bold text-gray-900">{fmt(total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Patient Resp.</p>
                  <p className="font-bold text-indigo-700">{fmt(patResp)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); printReport(appt); }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Report
                </button>
                {state.expanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>

            {/* Expanded detail */}
            {state.expanded && (
              <div className="border-t px-5 py-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b pb-2">
                      <th className="pb-2 font-medium">CPT Code</th>
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium text-right">Charge</th>
                      <th className="pb-2 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {state.items.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-b-0">
                        <td className="py-2.5 text-gray-500 font-mono text-xs">{item.code}</td>
                        <td className="py-2.5 text-gray-900">{item.description}</td>
                        <td className="py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[item.category]}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          {item.editing ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-gray-400">$</span>
                              <input
                                type="number"
                                value={item.draft}
                                onChange={(e) => setStates((prev) => {
                                  const items = [...prev[appt.patient_id].items];
                                  items[idx] = { ...items[idx], draft: e.target.value };
                                  return { ...prev, [appt.patient_id]: { ...prev[appt.patient_id], items } };
                                })}
                                className="w-24 border rounded px-2 py-0.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <button onClick={() => commitEdit(appt.patient_id, idx)} className="text-green-600 hover:text-green-700">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => cancelEdit(appt.patient_id, idx)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-medium">{fmt(item.base_charge)}</span>
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          {!item.editing && (
                            <button
                              onClick={() => startEdit(appt.patient_id, idx)}
                              className="text-gray-300 hover:text-blue-500 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-3 text-sm font-semibold text-gray-700">Total Billed</td>
                      <td className="pt-3 text-right font-bold text-gray-900">{fmt(total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>

                {/* Insurance summary */}
                <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-indigo-500">Insurance</p>
                    <p className="font-semibold text-indigo-900">{appt.insurance_provider ?? "None"}</p>
                    <p className="text-xs text-indigo-600">Coverage: {coverage?.coverage_pct ?? 0}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-500">Insurance Adjustment</p>
                    <p className="font-semibold text-green-700">-{fmt(insAdj)}</p>
                    <p className="text-xs text-indigo-600">Copay: {fmt(coverage?.copay ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-500">Est. Patient Responsibility</p>
                    <p className="text-xl font-bold text-indigo-900">{fmt(patResp)}</p>
                    {health && (
                      <p className="text-xs text-indigo-600">
                        Deductible remaining: {fmt(Math.max(0, health.deductible - health.deductible_met))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {appointments.length === 0 && (
        <div className="bg-white rounded-xl border shadow-sm px-8 py-16 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No appointments loaded. Upload a CSV or create appointments from the Calendar.</p>
        </div>
      )}
    </div>
  );
}
