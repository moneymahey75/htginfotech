import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildBranding,
  escapeHtml,
  loadSystemSettings,
  renderEmailTemplate,
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

const getSiteUrl = (pageUrl: string, requestBaseUrl: string) => {
  if (!pageUrl) {
    return requestBaseUrl;
  }

  try {
    return new URL(pageUrl).origin;
  } catch {
    return requestBaseUrl;
  }
};

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
    const siteUrl = getSiteUrl(pageUrl, requestBaseUrl);

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
    const branding = buildBranding(settings, {
      siteUrl,
    });
    const recipientEmail = normalizeText(settings.primary_email);
    const fromEmail = normalizeText(settings.smtp_username);
    const siteName = branding.siteName;

    if (!recipientEmail) {
      throw new Error("Primary admin email is not configured in system settings");
    }

    const emailTemplateVariables: Record<string, string> = {
      asset_url: branding.assetUrl,
      website_url: branding.siteUrl,
      logo_url: "https://htginfotech.com/htginfotech-logo.png",
      site_name: branding.siteName,
      site_url: branding.siteUrl,
      current_year: String(new Date().getFullYear()),
      sender_name: escapeHtml(name),
      sender_email: escapeHtml(email),
      contact_subject: escapeHtml(subject),
      message_body: escapeHtml(message).replaceAll("\n", "<br />"),
      inquiry_type: escapeHtml(inquiryType),
      submitted_at: escapeHtml(submittedAt),
      page_url: escapeHtml(pageUrl || branding.siteUrl),
      support_email: escapeHtml(recipientEmail),
    };

    const adminTemplate = await renderEmailTemplate({
      supabase,
      templateName: "contact_admin_email",
      branding,
      variables: emailTemplateVariables,
    });

    await sendSmtpEmail({
      to: recipientEmail,
      subject: adminTemplate.subject,
      html: adminTemplate.html,
      siteName,
      fromEmail,
      replyTo: email,
      settings,
    });

    let warning: string | undefined;

    if (sendConfirmation) {
      try {
        const confirmationTemplate = await renderEmailTemplate({
          supabase,
          templateName: "contact_confirmation_email",
          branding,
          variables: emailTemplateVariables,
        });

        await sendSmtpEmail({
          to: email,
          subject: confirmationTemplate.subject,
          html: confirmationTemplate.html,
          siteName,
          fromEmail,
          replyTo: recipientEmail,
          settings,
        });
      } catch (confirmationError) {
        console.error("Contact confirmation email failed:", {
          error: confirmationError,
          recipient: email,
          subject,
        });
        warning = "Your message was sent to our team, but we could not send the confirmation email right now.";
      }
    }

    return buildResponse(200, {
      success: true,
      message: "Your message has been sent successfully.",
      confirmationSent: sendConfirmation,
      ...(warning ? { warning } : {}),
    });
  } catch (error) {
    console.error("Contact email error:", error);

    return buildResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
