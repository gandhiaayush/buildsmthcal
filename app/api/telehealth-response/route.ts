import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const choice = searchParams.get("choice");
  const patient_id = searchParams.get("patient_id");

  console.log(`[telehealth-response] patient=${patient_id} choice=${choice}`);

  const confirmed = choice === "telehealth";
  const html = confirmed
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Confirmed</title></head><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px 24px;color:#1a1a1a;">
        <div style="max-width:480px;margin:0 auto;">
          <div style="font-size:48px;margin-bottom:16px;">✅</div>
          <h1 style="font-size:24px;font-weight:700;margin:0 0 12px;">Telehealth Confirmed</h1>
          <p style="color:#64748b;">Your telehealth appointment is confirmed. You'll receive a video link shortly before your appointment time.</p>
        </div>
      </body></html>`
    : `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Confirmed</title></head><body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px 24px;color:#1a1a1a;">
        <div style="max-width:480px;margin:0 auto;">
          <div style="font-size:48px;margin-bottom:16px;">👍</div>
          <h1 style="font-size:24px;font-weight:700;margin:0 0 12px;">In-Person Confirmed</h1>
          <p style="color:#64748b;">Great — we'll see you at the clinic. Please arrive 10 minutes early and bring your insurance card.</p>
        </div>
      </body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
