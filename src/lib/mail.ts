/**
 * Outbound mail — Resend, with NO-KEYS MODE. Until RESEND_API_KEY +
 * MAIL_FROM exist (needs the johnelijahmusic.com mailbox/domain verify),
 * every send is a no-op that returns { sent: false } so the booking flow
 * still completes and HQ still records the event.
 *
 * BOOKING_NOTIFY_EMAIL = where new-inquiry alerts go (the band's mailbox).
 */

import { Resend } from "resend";

export function mailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendMail(input: {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<{ sent: boolean; id?: string; error?: string }> {
  if (!mailEnabled()) return { sent: false, error: "mail-not-configured" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: process.env.MAIL_FROM as string,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      text: input.text,
      replyTo: input.replyTo,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true, id: data?.id };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "send-failed" };
  }
}

export function notifyEmail(): string | null {
  return process.env.BOOKING_NOTIFY_EMAIL ?? null;
}
