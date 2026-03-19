/// <reference types="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
}

const parseSettingValue = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message, type = "general" }: ContactRequest = await req.json();

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Name, email, subject, and message are required.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase service role credentials are not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: settingsRows, error: settingsError } = await supabase
      .from("tbl_system_settings")
      .select("tss_setting_key, tss_setting_value")
      .in("tss_setting_key", ["primary_email", "smtp_username", "site_name"]);

    if (settingsError) {
      throw new Error(`Failed to load system settings: ${settingsError.message}`);
    }

    const settings = (settingsRows ?? []).reduce((acc: Record<string, unknown>, row: any) => {
      acc[row.tss_setting_key] = parseSettingValue(row.tss_setting_value);
      return acc;
    }, {});

    const recipientEmail = String(settings.primary_email ?? "").trim();
    const senderEmail = String(settings.smtp_username ?? "").trim() || "onboarding@resend.dev";
    const siteName = String(settings.site_name ?? "HTG Infotech").trim() || "HTG Infotech";

    if (!recipientEmail) {
      throw new Error("Primary admin email is not configured in system settings");
    }

    const safeName = escapeHtml(name.trim());
    const safeEmail = escapeHtml(email.trim());
    const safeSubject = escapeHtml(subject.trim());
    const safeMessage = escapeHtml(message.trim()).replaceAll("\n", "<br />");
    const safeType = escapeHtml(type.trim() || "general");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Contact Us Submission</title>
        </head>
        <body style="font-family: Arial, sans-serif; background: #f5f7fb; margin: 0; padding: 24px;">
          <table role="presentation" style="max-width: 720px; width: 100%; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            <tr>
              <td style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; padding: 24px;">
                <h1 style="margin: 0; font-size: 24px;">New Contact Us Submission</h1>
                <p style="margin: 8px 0 0; opacity: 0.9;">${escapeHtml(siteName)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; width: 180px; font-weight: 600; color: #111827;">Full Name</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #374151;">${safeName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">Email</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #374151;">${safeEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">Inquiry Type</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #374151;">${safeType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">Subject</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #374151;">${safeSubject}</td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 0 10px; vertical-align: top; font-weight: 600; color: #111827;">Message</td>
                    <td style="padding: 16px 0 10px; color: #374151; line-height: 1.7;">${safeMessage}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${siteName} <${senderEmail}>`,
        to: [recipientEmail],
        reply_to: email.trim(),
        subject: `[Contact Us] ${subject.trim()}`,
        html,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(resendResult.message || "Failed to send contact email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Your message has been sent successfully.",
        data: resendResult,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("❌ Contact email error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
