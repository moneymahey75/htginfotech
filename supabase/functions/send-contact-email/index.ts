import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildBranding,
  buildBrandedEmailShell,
  escapeHtml,
  loadSystemSettings,
  renderEmailMarkup,
  sendSmtpEmail,
} from "../_shared/email.ts";
import { getRequestBaseUrl } from "../_shared/base-url.ts";

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
  pageUrl,
}: {
  siteName: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  inquiryType: string;
  submittedAt: string;
  pageUrl?: string;
}) =>
  buildBrandedEmailShell({
    eyebrow: "",
    title: "New Contact Us Submission",
    showFooterLinks: false,
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
          ${pageUrl ? buildDetailRow("Submitted From", `<a href="${escapeHtml(pageUrl)}" style="color:#4f46e5;text-decoration:none;">${escapeHtml(pageUrl)}</a>`) : ""}
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
  supportEmail,
}: {
  siteName: string;
  name: string;
  subject: string;
  message: string;
  inquiryType: string;
  submittedAt: string;
  supportEmail?: string;
}) =>
  buildBrandedEmailShell({
    eyebrow: "",
    title: "We Received Your Message",
    showFooterLinks: false,
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
        Our team will review your inquiry and get back to you as soon as possible.${supportEmail ? ` If you need to add anything else, reply to this email or contact us at <a href="mailto:${escapeHtml(supportEmail)}" style="color:#4f46e5;text-decoration:none;">${escapeHtml(supportEmail)}</a>.` : ""}
      </p>
    `,
  });

const runInBackground = (task: Promise<unknown>) => {
  const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime;

  if (edgeRuntime?.waitUntil) {
    edgeRuntime.waitUntil(task);
    return;
  }

  task.catch((error) => {
    console.error("Background task failed:", error);
  });
};

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

    const submittedAt = formatDateTime();
    const requestBaseUrl = getRequestBaseUrl(req);

    runInBackground((async () => {
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

      let recipientEmail = "";
      let fromEmail = "";
      let siteName = "HTG Infotech";
      let emailTemplateVariables: Record<string, string> = {};

      try {
        const settings = await loadSystemSettings(supabase);
        const branding = buildBranding(settings, {
          siteUrl: pageUrl || requestBaseUrl,
        });
        recipientEmail = normalizeText(settings.primary_email);
        fromEmail = normalizeText(settings.smtp_username);
        siteName = branding.siteName;

        if (!recipientEmail) {
          throw new Error("Primary admin email is not configured in system settings");
        }

        emailTemplateVariables = {
          logo_url: branding.logoUrl,
          site_name: branding.siteName,
          site_url: branding.siteUrl,
          current_year: String(new Date().getFullYear()),
        };

        const adminHtml = renderEmailMarkup(buildAdminEmailHtml({
          siteName,
          name,
          email,
          subject,
          message,
          inquiryType,
          submittedAt,
          pageUrl,
        }), emailTemplateVariables);

        await sendSmtpEmail({
          to: recipientEmail,
          subject: `New Contact Us Submission: ${subject}`,
          html: adminHtml,
          siteName,
          fromEmail,
          replyTo: email,
        });
      } catch (adminEmailError) {
        console.error("Contact admin email failed:", {
          error: adminEmailError,
          subject,
          fromEmail: email,
          inquiryType,
        });
      }

      if (!sendConfirmation) {
        return;
      }

      try {
        const confirmationHtml = renderEmailMarkup(buildConfirmationEmailHtml({
          siteName,
          name,
          subject,
          message,
          inquiryType,
          submittedAt,
          supportEmail: recipientEmail,
        }), emailTemplateVariables);

        await sendSmtpEmail({
          to: email,
          subject: `We received your message - ${siteName}`,
          html: confirmationHtml,
          siteName,
          fromEmail,
          replyTo: recipientEmail,
        });
      } catch (confirmationError) {
        console.error("Contact confirmation email failed:", {
          error: confirmationError,
          recipient: email,
          subject,
        });
      }
    })());

    return buildResponse(200, {
      success: true,
      message: "Your message has been sent successfully.",
      confirmationSent: sendConfirmation,
    });
  } catch (error) {
    console.error("Contact email error:", error);

    return buildResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
