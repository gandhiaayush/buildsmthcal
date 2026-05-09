import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { buildTelehealthEmail } from "@/lib/email-templates/telehealth-email";

export async function POST(req: NextRequest) {
  const {
    patient_name,
    appointment_time,
    patient_email,
  }: { patient_name: string; appointment_time: string; patient_email: string } =
    await req.json();

  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Demo Clinic";
  const email = buildTelehealthEmail({ patientName: patient_name, appointmentTime: appointment_time, clinicName });

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    const senderEmail = process.env.EMAIL_SENDER ?? "onboarding@resend.dev";
    const { error } = await resend.emails.send({
      from: `${clinicName} <${senderEmail}>`,
      to: patient_email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  console.log("[mock] Would send telehealth email to", patient_email);
  return NextResponse.json({ success: true, mock: true });
}
