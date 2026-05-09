import { NextRequest, NextResponse } from "next/server";
import type { RiskScore } from "@/types";

export async function POST(req: NextRequest) {
  const { scores }: { scores: RiskScore[] } = await req.json();

  const avgVisitValue = Number(process.env.NEXT_PUBLIC_AVG_VISIT_VALUE ?? 250);
  const highRisk = scores.filter((s) => s.risk_level === "high");
  const mediumRisk = scores.filter((s) => s.risk_level === "medium");
  const lowRisk = scores.filter((s) => s.risk_level === "low");

  return NextResponse.json({
    date: new Date().toISOString(),
    total_appointments: scores.length,
    high_risk_count: highRisk.length,
    medium_risk_count: mediumRisk.length,
    low_risk_count: lowRisk.length,
    revenue_at_risk: highRisk.length * avgVisitValue,
    avg_risk_score:
      scores.length > 0
        ? parseFloat(
            (scores.reduce((sum, s) => sum + s.risk_score, 0) / scores.length).toFixed(2)
          )
        : 0,
  });
}
