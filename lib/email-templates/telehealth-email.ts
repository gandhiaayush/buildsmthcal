export function buildTelehealthEmail(params: {
  patientName: string;
  appointmentTime: string;
  clinicName: string;
}): { subject: string; html: string; text: string } {
  const { patientName, appointmentTime, clinicName } = params;
  const apptDate = new Date(appointmentTime).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const apptTime = new Date(appointmentTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#1a1a1a; max-width:600px; margin:0 auto; padding:24px;">
  <div style="background:#1d4ed8; color:white; padding:24px; border-radius:12px 12px 0 0;">
    <h1 style="margin:0; font-size:20px;">${clinicName}</h1>
    <p style="margin:4px 0 0; opacity:0.8; font-size:14px;">Telehealth Option Available</p>
  </div>
  <div style="border:1px solid #e2e8f0; border-top:none; padding:24px; border-radius:0 0 12px 12px;">
    <p>Hi <strong>${patientName}</strong>,</p>
    <p>We noticed you haven't confirmed your <strong>${apptDate} at ${apptTime}</strong> appointment.</p>
    <p>A same-day <strong>telehealth option</strong> is available if you're unable to come in person. You can meet with your doctor virtually from home.</p>
    <div style="margin:24px 0; text-align:center;">
      <a href="#" style="background:#1d4ed8; color:white; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px;">
        Confirm Telehealth Appointment
      </a>
    </div>
    <p style="color:#64748b; font-size:13px;">If you plan to attend in person, no action is needed — just show up at the scheduled time.</p>
    <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;"/>
    <p style="color:#64748b; font-size:13px;">Questions? Contact ${clinicName}. Do not reply to this email.</p>
  </div>
</body>
</html>`;

  const text = `Hi ${patientName},

We noticed you haven't confirmed your ${apptDate} at ${apptTime} appointment.

A same-day telehealth option is available if you're unable to come in person.

If you plan to attend in person, no action is needed.

Questions? Contact ${clinicName}.`;

  return {
    subject: `Action needed: Confirm your ${apptDate} appointment`,
    html,
    text,
  };
}
