import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildBranding,
  buildBrandedEmailShell,
  escapeHtml,
  loadSystemSettings,
  sendSmtpEmail,
} from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  type?: string;
  pageUrl?: string;
  metadata?: Record<string, string | null | undefined>;
  sendConfirmation?: boolean;
}

const buildResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const normalizeText = (value: unknown) => String(value ?? "").trim();

const titleCase = (value: string) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const formatDateTime = () =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: "UTC",
  }).format(new Date());

const buildDetailRow = (label: string, value: string) => `
  <tr>
    <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:180px;font-weight:600;color:#111827;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#374151;">${value}</td>
  </tr>
`;

const buildAdminEmailHtml = ({
  siteName,
  name,
  email,
  subject,
  message,
  inquiryType,
  submittedAt,
}: {
  siteName: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  inquiryType: string;
  submittedAt: string;
}) =>
  buildBrandedEmailShell({
    eyebrow: `${siteName} Contact Desk`,
    title: "New Contact Us Submission",
    body: `
      <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello Admin,</p>
      <p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:1.7;">
        A new contact request has been submitted through your website. The sender details and message are included below.
      </p>
      <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          ${buildDetailRow("Full Name", escapeHtml(name))}
          ${buildDetailRow("Email Address", `<a href="mailto:${escapeHtml(email)}" style="color:#4f46e5;text-decoration:none;">${escapeHtml(email)}</a>`)}
          ${buildDetailRow("Inquiry Type", escapeHtml(inquiryType))}
          ${buildDetailRow("Subject", escapeHtml(subject))}
          ${buildDetailRow("Submitted At", escapeHtml(submittedAt))}
        </table>
      </div>
      <div style="margin:24px 0;padding:22px;border-radius:12px;background:#ffffff;border:1px solid #e5e7eb;">
        <p style="margin:0 0 12px;color:#111827;font-size:16px;font-weight:600;">Message</p>
        <p style="margin:0;color:#374151;font-size:15px;line-height:1.8;white-space:normal;">${escapeHtml(message).replaceAll("\n", "<br />")}</p>
      </div>
      <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">
        You can reply directly to this email to respond to ${escapeHtml(name)}.
      </p>
    `,
  });

const buildConfirmationEmailHtml = ({
  siteName,
  name,
  subject,
  message,
  inquiryType,
  submittedAt,
}: {
  siteName: string;
  name: string;
  subject: string;
  message: string;
  inquiryType: string;
  submittedAt: string;
}) =>
  buildBrandedEmailShell({
    eyebrow: `${siteName} Support`,
    title: "We Received Your Message",
    body: `
      <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello ${escapeHtml(name)},</p>
      <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.7;">
        Thank you for contacting ${escapeHtml(siteName)}. This is a confirmation that your message has been received and shared with our team.
      </p>
      <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          ${buildDetailRow("Inquiry Type", escapeHtml(inquiryType))}
          ${buildDetailRow("Subject", escapeHtml(subject))}
          ${buildDetailRow("Submitted At", escapeHtml(submittedAt))}
        </table>
      </div>
      <div style="margin:24px 0;padding:22px;border-radius:12px;background:#ffffff;border:1px solid #e5e7eb;">
        <p style="margin:0 0 12px;color:#111827;font-size:16px;font-weight:600;">Your Message</p>
        <p style="margin:0;color:#374151;font-size:15px;line-height:1.8;">${escapeHtml(message).replaceAll("\n", "<br />")}</p>
      </div>
      <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">
        Our team will review your inquiry and get back to you as soon as possible.
      </p>
    `,
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const payload: ContactRequest = await req.json();
    const name = normalizeText(payload.name);
    const email = normalizeText(payload.email);
    const subject = normalizeText(payload.subject);
    const message = normalizeText(payload.message);
    const inquiryType = titleCase(normalizeText(payload.type) || "general");
    const pageUrl = normalizeText(payload.pageUrl);
    const sendConfirmation = payload.sendConfirmation !== false;

    if (!name || !email || !subject || !message) {
      return buildResponse(400, {
        success: false,
        error: "Name, email, subject, and message are required.",
      });
    }

    if (!isValidEmail(email)) {
      return buildResponse(400, {
        success: false,
        error: "Please provide a valid email address.",
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const settings = await loadSystemSettings(supabase);
    const branding = buildBranding(settings, pageUrl);
    const recipientEmail = normalizeText(settings.primary_email);

    if (!recipientEmail) {
      throw new Error("Primary admin email is not configured in system settings");
    }

    const submittedAt = formatDateTime();
    const adminHtml = buildAdminEmailHtml({
      siteName: branding.siteName,
      name,
      email,
      subject,
      message,
      inquiryType,
      submittedAt,
    });

    await sendSmtpEmail({
      to: recipientEmail,
      subject: `New Contact Us Submission: ${subject}`,
      html: adminHtml,
      siteName: branding.siteName,
      fromEmail: normalizeText(settings.smtp_username),
      replyTo: email,
    });

    let confirmationWarning: string | null = null;

    if (sendConfirmation) {
      try {
        const confirmationHtml = buildConfirmationEmailHtml({
          siteName: branding.siteName,
          name,
          subject,
          message,
          inquiryType,
          submittedAt,
        });

        await sendSmtpEmail({
          to: email,
          subject: `We received your message - ${branding.siteName}`,
          html: confirmationHtml,
          siteName: branding.siteName,
          fromEmail: normalizeText(settings.smtp_username),
        });
      } catch (confirmationError) {
        console.warn("Contact confirmation email failed:", confirmationError);
        confirmationWarning = "Your message was delivered, but the confirmation email could not be sent.";
      }
    }

    return buildResponse(200, {
      success: true,
      message: "Your message has been sent successfully.",
      confirmationSent: sendConfirmation && !confirmationWarning,
      warning: confirmationWarning,
    });
  } catch (error) {
    console.error("Contact email error:", error);

    return buildResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
