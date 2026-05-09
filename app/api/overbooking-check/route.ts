import { NextRequest, NextResponse } from "next/server";
import type { RiskScore, OverbookingSlot } from "@/types";
import { MOCK_OVERBOOKING_SLOTS } from "@/lib/mock-data";

export async function POST(req: NextRequest) {
  const { date, scores }: { date: string; scores: RiskScore[] } = await req.json();

  const voiceUrl = process.env.VOICE_ENGINE_URL;
  if (voiceUrl) {
    try {
      const res = await fetch(`${voiceUrl}/overbooking-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, scores }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        return NextResponse.json(await res.json());
      }
    } catch {
      // fall through to mock
    }
  }

  const highRiskIds = scores
    .filter((s) => s.risk_level === "high")
    .map((s) => s.patient_id);

  const slots: OverbookingSlot[] = highRiskIds.map((id, i) => ({
    appointment_id: id,
    overbook_recommended: true,
    backup_patient_id: MOCK_OVERBOOKING_SLOTS[i]?.backup_patient_id,
  }));

  return NextResponse.json({ slots });
}
