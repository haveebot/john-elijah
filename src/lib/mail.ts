/**
 * Outbound mail — two transports, both NO-KEYS safe:
 *
 *   1. Google Workspace SMTP (preferred — one mailbox, no third vendor, no DNS work):
 *      SMTP_USER=admin@johnelijahmusic.com  SMTP_PASS=<Google app password>
 *   2. Resend (fallback): RESEND_API_KEY + a verified domain.
 *
 * MAIL_FROM = display identity, e.g. "John Elijah Band <booking@johnelijahmusic.com>".
 * With SMTP the address must be the mailbox or one of its aliases (booking@ is an alias
 * of admin@ under the single-mailbox model). Absent config → { sent:false } and the
 * booking flow still completes; HQ logs "not sent".
 *
 * BOOKING_NOTIFY_EMAIL = where new-inquiry alerts go.
 */

import nodemailer from "nodemailer";
import { Resend } from "resend";

type SendInput = { to: string | string[]; subject: string; text: string; replyTo?: string };
type SendResult = { sent: boolean; id?: string; error?: string; transport?: "smtp" | "resend" };

function smtpEnabled(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);
}
function resendEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export function mailEnabled(): boolean {
  return smtpEnabled() || resendEnabled();
}

export function mailTransportName(): "smtp" | "resend" | null {
  return smtpEnabled() ? "smtp" : resendEnabled() ? "resend" : null;
}

export async function sendMail(input: SendInput): Promise<SendResult> {
  const to = Array.isArray(input.to) ? input.to : [input.to];
  if (smtpEnabled()) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT ?? 465),
        secure: (process.env.SMTP_PORT ?? "465") === "465",
        auth: { user: process.env.SMTP_USER as string, pass: process.env.SMTP_PASS as string },
      });
      const info = await transporter.sendMail({
        from: process.env.MAIL_FROM as string,
        to,
        subject: input.subject,
        text: input.text,
        replyTo: input.replyTo,
      });
      return { sent: true, id: info.messageId, transport: "smtp" };
    } catch (err) {
      return { sent: false, error: err instanceof Error ? err.message : "smtp-failed", transport: "smtp" };
    }
  }
  if (resendEnabled()) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: process.env.MAIL_FROM as string,
        to,
        subject: input.subject,
        text: input.text,
        replyTo: input.replyTo,
      });
      if (error) return { sent: false, error: error.message, transport: "resend" };
      return { sent: true, id: data?.id, transport: "resend" };
    } catch (err) {
      return { sent: false, error: err instanceof Error ? err.message : "send-failed", transport: "resend" };
    }
  }
  return { sent: false, error: "mail-not-configured" };
}

export function notifyEmail(): string | null {
  return process.env.BOOKING_NOTIFY_EMAIL ?? null;
}
