import nodemailer from "nodemailer";

// Simple SMTP transport configurable via env. For local dev, we fall back to JSON transport.
export async function sendInvitationEmail(to: string, subject: string, url: string) {
  const transport = createTransport();
  const info = await transport.sendMail({
    from: process.env.MAIL_FROM || "a2mp@example.com",
    to,
    subject: `Invitation: ${subject}`,
    text: `You've been invited to contribute initial input for the meeting: ${subject}.\n\nOpen your unique link: ${url}`
  });
  if (process.env.NODE_ENV !== "production") {
    console.log("Email sent (dev):", JSON.stringify(info, null, 2));
  }
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    return nodemailer.createTransport({ host, port, auth: { user, pass } });
  }
  // Fallback: JSON transport logs emails instead of sending, suitable for dev
  return nodemailer.createTransport({ jsonTransport: true });
}
