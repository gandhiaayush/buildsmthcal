import { NextRequest, NextResponse } from "next/server";
import type { AppointmentRow, RiskScore } from "@/types";
import { mockRiskScores } from "@/lib/mock-data";

export async function POST(req: NextRequest) {
  const { appointments }: { appointments: AppointmentRow[] } = await req.json();

  const backendUrl = process.env.BACKEND_ENGINE_URL;
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/risk-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointments }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // fall through to mock
    }
  }

  const scores: RiskScore[] = mockRiskScores(appointments);
  return NextResponse.json({ scores });
}
