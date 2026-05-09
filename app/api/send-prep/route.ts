import { NextRequest, NextResponse } from "next/server";
import type { AppointmentRow } from "@/types";
import { getPrepInstructions } from "@/lib/prep-instructions";
import { buildPrepEmail } from "@/lib/email-templates/prep-email";
import { createGmailTransport, gmailConfigured } from "@/lib/gmail-transport";

export async function POST(req: NextRequest) {
  const {
    patient,
    toEmail,
  }: { patient: AppointmentRow; toEmail: string } = await req.json();

  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Demo Clinic";
  const instructions = getPrepInstructions(patient.appointment_type);
  const email = buildPrepEmail({
    patientName: patient.patient_name,
    appointmentTime: patient.appointment_time,
    appointmentType: patient.appointment_type,
    doctorName: patient.doctor_name,
    instructions,
    clinicName,
  });

  if (gmailConfigured) {
    try {
      const transporter = createGmailTransport();
      await transporter.sendMail({
        from: `${clinicName} <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[send-prep] Gmail error:", message);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

  console.log("[mock] Would send prep email to", toEmail, "subject:", email.subject);
  return NextResponse.json({ success: true, mock: true });
}
