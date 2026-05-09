import { NextRequest, NextResponse } from "next/server";
import { buildTelehealthEmail } from "@/lib/email-templates/telehealth-email";
import { createGmailTransport, gmailConfigured } from "@/lib/gmail-transport";

export async function POST(req: NextRequest) {
  const {
    patient_id,
    patient_name,
    appointment_time,
    patient_email,
  }: {
    patient_id: string;
    patient_name: string;
    appointment_time: string;
    patient_email: string;
  } = await req.json();

  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Demo Clinic";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const email = buildTelehealthEmail({
    patientName: patient_name,
    appointmentTime: appointment_time,
    clinicName,
    patientId: patient_id,
    baseUrl,
  });

  if (gmailConfigured) {
    try {
      const transporter = createGmailTransport();
      await transporter.sendMail({
        from: `${clinicName} <${process.env.GMAIL_USER}>`,
        to: patient_email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

  console.log("[mock] Would send telehealth email to", patient_email);
  return NextResponse.json({ success: true, mock: true });
}
