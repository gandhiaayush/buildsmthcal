export function buildTelehealthEmail(params: {
  patientName: string;
  appointmentTime: string;
  clinicName: string;
  patientId: string;
  baseUrl?: string;
}): { subject: string; html: string; text: string } {
  const { patientName, appointmentTime, clinicName, patientId, baseUrl = "" } = params;

  const apptTime = new Date(appointmentTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const telehealthUrl = `${baseUrl}/api/telehealth-response?choice=telehealth&patient_id=${encodeURIComponent(patientId)}`;
  const inPersonUrl = `${baseUrl}/api/telehealth-response?choice=in_person&patient_id=${encodeURIComponent(patientId)}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#1d4ed8;color:white;padding:24px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;font-size:20px;">${clinicName}</h1>
    <p style="margin:4px 0 0;opacity:0.8;font-size:14px;">Upcoming Appointment</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <p>Hi <strong>${patientName}</strong>,</p>
    <p>We noticed you haven't confirmed your <strong>${apptTime}</strong> appointment today. If it's easier, we can switch you to a telehealth visit instead.</p>
    <div style="margin:28px 0;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
      <a href="${telehealthUrl}" style="background:#1d4ed8;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
        Confirm Telehealth
      </a>
      <a href="${inPersonUrl}" style="background:#f8fafc;color:#1e293b;border:1px solid #e2e8f0;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
        Keep In-Person
      </a>
    </div>
    <p style="color:#64748b;font-size:13px;">If you have questions, contact ${clinicName} directly. Do not reply to this email.</p>
  </div>
</body>
</html>`;

  const text = `Hi ${patientName},

We noticed you haven't confirmed your ${apptTime} appointment today. If it's easier, we can switch you to a telehealth visit instead.

Confirm Telehealth: ${telehealthUrl}
Keep In-Person: ${inPersonUrl}

Questions? Contact ${clinicName}.`;

  return {
    subject: "Your upcoming appointment — a telehealth option is available",
    html,
    text,
  };
}
