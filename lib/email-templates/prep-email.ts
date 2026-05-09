import type { PrepInstruction } from "@/types";

export function buildPrepEmail(params: {
  patientName: string;
  appointmentTime: string;
  appointmentType: string;
  doctorName: string;
  instructions: PrepInstruction;
  clinicName: string;
}): { subject: string; html: string; text: string } {
  const { patientName, appointmentTime, appointmentType, doctorName, instructions, clinicName } = params;

  const apptDate = new Date(appointmentTime).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const apptTime = new Date(appointmentTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const procedureDisplay = appointmentType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const oneWeekList = instructions.one_week_before
    .map((i) => `<li style="margin-bottom:8px;">${i}</li>`)
    .join("");
  const twoDayList = instructions.two_days_before
    .map((i) => `<li style="margin-bottom:8px;">${i}</li>`)
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1a1a1a; max-width:600px; margin:0 auto; padding:24px;">
  <div style="background:#0f172a; color:white; padding:24px; border-radius:12px 12px 0 0;">
    <h1 style="margin:0; font-size:20px;">${clinicName}</h1>
    <p style="margin:4px 0 0; opacity:0.7; font-size:14px;">Appointment Preparation Instructions</p>
  </div>
  <div style="border:1px solid #e2e8f0; border-top:none; padding:24px; border-radius:0 0 12px 12px;">
    <p>Hi <strong>${patientName}</strong>,</p>
    <p>You have an upcoming <strong>${procedureDisplay}</strong> appointment with <strong>${doctorName}</strong> on:</p>
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:16px 0; text-align:center;">
      <strong style="font-size:18px;">${apptDate} at ${apptTime}</strong>
    </div>
    <p>Please follow these preparation instructions to ensure your appointment goes smoothly:</p>

    <h2 style="color:#0f172a; font-size:16px; margin-top:24px;">One Week Before</h2>
    <ul style="padding-left:20px; line-height:1.6;">${oneWeekList}</ul>

    <h2 style="color:#0f172a; font-size:16px; margin-top:24px;">Two Days Before</h2>
    <ul style="padding-left:20px; line-height:1.6;">${twoDayList}</ul>

    <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;"/>
    <p style="color:#64748b; font-size:13px;">Questions? Contact ${clinicName}. Do not reply to this email.</p>
  </div>
</body>
</html>`;

  const text = `Hi ${patientName},

You have an upcoming ${procedureDisplay} appointment with ${doctorName} on ${apptDate} at ${apptTime}.

ONE WEEK BEFORE:
${instructions.one_week_before.map((i) => `• ${i}`).join("\n")}

TWO DAYS BEFORE:
${instructions.two_days_before.map((i) => `• ${i}`).join("\n")}

Questions? Contact ${clinicName}.`;

  return {
    subject: `Appointment Prep: ${procedureDisplay} on ${apptDate}`,
    html,
    text,
  };
}
