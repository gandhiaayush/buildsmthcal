import { NextResponse } from "next/server";
import { createGmailTransport, gmailConfigured } from "@/lib/gmail-transport";
import { friendlyGmailError } from "@/lib/gmail-error";

export async function GET() {
  if (!gmailConfigured) {
    return NextResponse.json({
      ok: false,
      error: "GMAIL_USER or GMAIL_APP_PASSWORD is not set in .env.local",
    });
  }

  try {
    const transporter = createGmailTransport();
    await transporter.verify();
    return NextResponse.json({
      ok: true,
      user: process.env.GMAIL_USER,
      message: "Gmail SMTP connection verified successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json({
      ok: false,
      user: process.env.GMAIL_USER,
      error: friendlyGmailError(err),
      raw: err instanceof Error ? err.message : String(err),
    });
  }
}
