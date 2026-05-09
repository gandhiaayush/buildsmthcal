export function friendlyGmailError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  if (
    msg.includes("534") ||
    msg.includes("Application-specific password") ||
    msg.includes("InvalidSecondFactor")
  ) {
    return (
      "Gmail requires an App Password — not your regular Gmail password. " +
      "Go to myaccount.google.com → Security → 2-Step Verification → App passwords. " +
      'Create one for "Mail" and paste the 16-character code (no spaces) as GMAIL_APP_PASSWORD in .env.local, then restart the server.'
    );
  }

  if (msg.includes("535") || msg.includes("Invalid credentials")) {
    return "Gmail rejected the credentials. Verify GMAIL_USER and GMAIL_APP_PASSWORD are correct in .env.local.";
  }

  if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
    return "Cannot reach Gmail SMTP. Check your internet connection.";
  }

  if (msg.includes("ETIMEDOUT")) {
    return "Connection to Gmail timed out. Check your network or firewall.";
  }

  return msg;
}
