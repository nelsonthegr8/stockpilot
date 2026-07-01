import nodemailer from "nodemailer";

export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transporter = createTransporter();
  await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, html });
}

export async function sendInviteEmail(to: string, token: string, baseUrl: string): Promise<void> {
  const link = `${baseUrl}/invite/${token}`;
  await sendEmail(to, "You're invited to StockPilot", `<p>Click <a href="${link}">here</a> to accept your invitation.</p>`);
}
