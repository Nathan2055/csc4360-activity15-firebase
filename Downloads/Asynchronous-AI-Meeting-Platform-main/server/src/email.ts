import nodemailer from 'nodemailer';

export interface MailInviteParams {
  to: string;
  meetingSubject: string;
  inviteUrl: string;
}

export interface MailReportParams {
  to: string;
  meetingSubject: string;
  reportUrl: string;
}

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.MAIL_FROM || 'no-reply@a2mp.local';

let transporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter | null {
  try {
    if (!transporter) {
      if (!smtpHost || !smtpUser || !smtpPass) return null; // allow running without email in dev
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
    }
    return transporter;
  } catch (e) {
    return null;
  }
}

export async function sendInviteMail(params: MailInviteParams): Promise<void> {
  const t = getTransporter();
  if (!t) return; // noop in dev
  await t.sendMail({
    from: fromEmail,
    to: params.to,
    subject: `A²MP Invitation: ${params.meetingSubject}`,
    text: `You're invited to contribute to: ${params.meetingSubject}\nSubmit your initial input here: ${params.inviteUrl}`,
    html: `<p>You're invited to contribute to: <b>${params.meetingSubject}</b></p><p>Submit your initial input here: <a href="${params.inviteUrl}">${params.inviteUrl}</a></p>`
  });
}

export async function sendReportMail(params: MailReportParams): Promise<void> {
  const t = getTransporter();
  if (!t) return;
  await t.sendMail({
    from: fromEmail,
    to: params.to,
    subject: `A²MP Report: ${params.meetingSubject}`,
    text: `The meeting has concluded. View the report: ${params.reportUrl}`,
    html: `<p>The meeting has concluded.</p><p>View the report: <a href="${params.reportUrl}">${params.reportUrl}</a></p>`
  });
}
