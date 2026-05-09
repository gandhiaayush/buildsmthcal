"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CsvDropzone } from "@/components/CsvDropzone";
import { RiskScoreTable, RiskScoreTableSkeleton } from "@/components/RiskScoreTable";
import type { AppointmentRow, RiskScore } from "@/types";
import { CheckCircle, Download } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentRow[] | null>(null);
  const [scores, setScores] = useState<RiskScore[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleParsed(rows: AppointmentRow[]) {
    setAppointments(rows);
    setScores(null);
    setLoading(true);

    try {
      const res = await fetch("/api/risk-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointments: rows }),
      });
      const data = await res.json();
      setScores(data.scores);
      sessionStorage.setItem("risk-scores", JSON.stringify(data.scores));
      sessionStorage.setItem("appointments", JSON.stringify(rows));
    } catch {
      setScores([]);
    } finally {
      setLoading(false);
    }
  }

  function downloadSampleCsv() {
    const sample = [
      "patient_id,patient_name,appointment_time,appointment_type,doctor_name,insurance_provider,prior_no_shows,confirmed,referral_source",
      `P001,Maria Santos,${new Date(Date.now() + 2 * 3600000).toISOString()},ultrasound,Dr. Reyes,Aetna,2,false,Dr. Lee`,
      `P002,James Okonkwo,${new Date(Date.now() + 3 * 3600000).toISOString()},heart_surgery,Dr. Chen,Medicare,0,true,Dr. Patel`,
      `P003,Sofia Morales,${new Date(Date.now() + 4 * 3600000).toISOString()},brain_surgery,Dr. Williams,Tricare,1,false,`,
      `P004,David Kim,${new Date(Date.now() + 5 * 3600000).toISOString()},appendix_removal,Dr. Reyes,Cigna,0,true,Dr. Adams`,
      `P005,Priya Patel,${new Date(Date.now() + 6 * 3600000).toISOString()},ultrasound,Dr. Chen,,3,false,`,
    ].join("\n");

    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-appointments.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Appointments</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Upload a CSV file to generate risk scores for today's appointments
          </p>
        </div>
        <button
          onClick={downloadSampleCsv}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Sample CSV
        </button>
      </div>

      <CsvDropzone onParsed={handleParsed} />

      {appointments && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-green-700">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Parsed {appointments.length} appointments — analyzing risk scores...
        </div>
      )}

      {loading && <RiskScoreTableSkeleton />}

      {scores && scores.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Risk Scores ({scores.length} appointments)
            </h2>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-blue-600 hover:underline"
            >
              View on Dashboard →
            </button>
          </div>
          <RiskScoreTable scores={scores} />
        </div>
      )}

      {scores && scores.length === 0 && (
        <div className="text-center py-12 text-gray-400">No appointments found in file.</div>
      )}
    </div>
  );
}
