import { NextRequest, NextResponse } from "next/server";
import type { VoiceTriggerRequest } from "@/types";

export async function POST(req: NextRequest) {
  const body: VoiceTriggerRequest = await req.json();

  const voiceUrl = process.env.VOICE_ENGINE_URL;
  if (voiceUrl) {
    try {
      const res = await fetch(`${voiceUrl}/voice-trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        return NextResponse.json(await res.json());
      }
    } catch {
      // fall through to mock
    }
  }

  return NextResponse.json({
    call_sid: `mock-${body.patient_id}-${Date.now()}`,
    status: "queued",
  });
}
