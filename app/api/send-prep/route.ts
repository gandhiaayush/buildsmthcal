import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import type { AppointmentRow } from "@/types";
import { getPrepInstructions } from "@/lib/prep-instructions";
import { buildPrepEmail } from "@/lib/email-templates/prep-email";

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

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    const senderEmail = process.env.EMAIL_SENDER ?? "onboarding@resend.dev";
    const { error } = await resend.emails.send({
      from: `${clinicName} <${senderEmail}>`,
      to: toEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Mock: no API key configured
  console.log("[mock] Would send prep email to", toEmail, "subject:", email.subject);
  return NextResponse.json({ success: true, mock: true });
}
