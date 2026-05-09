import { NextRequest, NextResponse } from "next/server";
import type { PostVisitUpdate } from "@/types";

export async function POST(req: NextRequest) {
  const body: PostVisitUpdate = await req.json();

  const backendUrl = process.env.BACKEND_ENGINE_URL;
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/update-csv`, {
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

  return NextResponse.json({ success: true });
}
