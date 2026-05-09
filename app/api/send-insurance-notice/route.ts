import { NextRequest, NextResponse } from "next/server";
import { createGmailTransport, gmailConfigured } from "@/lib/gmail-transport";

export async function POST(req: NextRequest) {
  const {
    patient_name,
    patient_email,
    insurance_provider,
    flag_reason,
    procedure,
  }: {
    patient_name: string;
    patient_email: string;
    insurance_provider: string;
    flag_reason: string;
    procedure: string;
  } = await req.json();

  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Demo Clinic";
  const procedureDisplay = procedure.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#0f172a;color:white;padding:24px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;font-size:20px;">${clinicName}</h1>
    <p style="margin:4px 0 0;opacity:0.7;font-size:14px;">Insurance Verification Notice</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <p>Hi <strong>${patient_name}</strong>,</p>
    <p>We are reaching out regarding your upcoming <strong>${procedureDisplay}</strong> appointment.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-weight:600;color:#dc2626;">Insurance Issue Detected</p>
      <p style="margin:8px 0 0;color:#991b1b;">${flag_reason}</p>
      <p style="margin:8px 0 0;color:#991b1b;">Insurance on file: <strong>${insurance_provider || "None"}</strong></p>
    </div>
    <p>Please contact our billing department as soon as possible to resolve this before your appointment. Failure to resolve may result in the appointment being rescheduled or out-of-pocket charges.</p>
    <p style="margin-top:24px;">If you have questions, please call ${clinicName} directly. Do not reply to this email.</p>
  </div>
</body>
</html>`;

  const text = `Hi ${patient_name},

We are reaching out regarding your upcoming ${procedureDisplay} appointment.

Insurance Issue: ${flag_reason}
Insurance on file: ${insurance_provider || "None"}

Please contact our billing department as soon as possible.

Questions? Contact ${clinicName}.`;

  if (gmailConfigured) {
    try {
      const transporter = createGmailTransport();
      await transporter.sendMail({
        from: `${clinicName} <${process.env.GMAIL_USER}>`,
        to: patient_email,
        subject: `Insurance Verification Required — ${procedureDisplay} Appointment`,
        html,
        text,
      });
      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[send-insurance-notice] error:", message);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

  console.log("[mock] Would send insurance notice to", patient_email);
  return NextResponse.json({ success: true, mock: true });
}
