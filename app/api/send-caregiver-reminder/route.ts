import { NextRequest, NextResponse } from "next/server";
import { createGmailTransport, gmailConfigured } from "@/lib/gmail-transport";
import { friendlyGmailError } from "@/lib/gmail-error";

export async function POST(req: NextRequest) {
  const {
    caregiver_name,
    caregiver_email,
    patient_name,
    appointment_time,
    appointment_type,
    doctor_name,
    clinic_address,
    maps_link,
    custom_note,
  }: {
    caregiver_name: string;
    caregiver_email: string;
    patient_name: string;
    appointment_time: string;
    appointment_type: string;
    doctor_name: string;
    clinic_address: string;
    maps_link: string;
    custom_note?: string;
  } = await req.json();

  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Demo Clinic";
  const apptDate = new Date(appointment_time);
  const procedureDisplay = appointment_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const dateStr = apptDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timeStr = apptDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#be123c;color:white;padding:24px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;font-size:20px;">❤️ Caregiver Reminder</h1>
    <p style="margin:4px 0 0;opacity:0.8;font-size:14px;">${clinicName}</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <p>Hi <strong>${caregiver_name}</strong>,</p>
    <p>This is a reminder from ${clinicName} about an upcoming medical appointment for <strong>${patient_name}</strong>, for whom you are listed as a caregiver.</p>

    <div style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-weight:600;color:#9d174d;">📅 Appointment Details</p>
      <p style="margin:4px 0;color:#831843;"><strong>Patient:</strong> ${patient_name}</p>
      <p style="margin:4px 0;color:#831843;"><strong>Procedure:</strong> ${procedureDisplay}</p>
      <p style="margin:4px 0;color:#831843;"><strong>Physician:</strong> ${doctor_name}</p>
      <p style="margin:4px 0;color:#831843;"><strong>Date:</strong> ${dateStr}</p>
      <p style="margin:4px 0;color:#831843;"><strong>Time:</strong> ${timeStr}</p>
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-weight:600;color:#14532d;">🚗 Transportation & Logistics</p>
      <p style="margin:4px 0;color:#166534;">Please arrange transportation for ${patient_name} to and from their appointment. They should not drive themselves after a medical procedure.</p>
      <p style="margin:8px 0 4px;font-weight:600;color:#14532d;">📍 Clinic Location:</p>
      <p style="margin:4px 0;color:#166534;">${clinic_address}</p>
      <a href="${maps_link}" style="display:inline-block;margin-top:8px;background:#16a34a;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:14px;">Get Directions →</a>
    </div>

    ${custom_note ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 4px;font-weight:600;color:#92400e;">📋 Note from the Care Team</p>
      <p style="margin:0;color:#78350f;">${custom_note}</p>
    </div>
    ` : ""}

    <p>Please ensure ${patient_name} has arranged any necessary time off work, has taken their medications as directed before the appointment, and has someone available for post-procedure recovery if needed.</p>
    <p>If you have any questions, please contact ${clinicName} directly. Thank you for supporting ${patient_name}&apos;s care.</p>
  </div>
</body>
</html>`;

  const text = `Caregiver Reminder — ${clinicName}

Hi ${caregiver_name},

This is a reminder about an upcoming appointment for ${patient_name}.

Appointment: ${procedureDisplay} with ${doctor_name}
Date: ${dateStr} at ${timeStr}
Location: ${clinic_address}

Please arrange transportation for ${patient_name} to and from the appointment.

${custom_note ? `Note from care team: ${custom_note}\n\n` : ""}Questions? Contact ${clinicName}.`;

  if (gmailConfigured) {
    try {
      const transporter = createGmailTransport();
      await transporter.sendMail({
        from: `${clinicName} <${process.env.GMAIL_USER}>`,
        to: caregiver_email,
        subject: `Caregiver Reminder: ${patient_name}'s ${procedureDisplay} — ${dateStr}`,
        html,
        text,
      });
      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      const message = friendlyGmailError(err);
      console.error("[send-caregiver-reminder] error:", message);
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }

  console.log("[mock] Would send caregiver reminder to", caregiver_email);
  return NextResponse.json({ success: true, mock: true });
}
