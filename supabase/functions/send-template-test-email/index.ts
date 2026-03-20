import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildBranding,
  renderEmailTemplate,
  loadSystemSettings,
  sendSmtpEmail,
} from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-session, Content-Type, Authorization, X-Client-Info, Apikey, X-Admin-Session",
};

const buildResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const adminSession = req.headers.get("X-Admin-Session");
    if (!adminSession) {
      return buildResponse(401, { success: false, error: "Admin session required" });
    }

    const sessionMatch = adminSession.match(/^admin-session-([a-f0-9-]+)-(\d+)$/);
    if (!sessionMatch) {
      return buildResponse(401, { success: false, error: "Invalid session format" });
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

    const adminId = sessionMatch[1];
    const { data: admin } = await supabase
      .from("tbl_admin_users")
      .select("tau_id, tau_is_active")
      .eq("tau_id", adminId)
      .eq("tau_is_active", true)
      .maybeSingle();

    if (!admin) {
      return buildResponse(401, { success: false, error: "Invalid or expired admin session" });
    }

    const { templateName, email } = await req.json();
    if (!templateName || !email) {
      return buildResponse(400, { success: false, error: "Template name and email are required" });
    }

    const settings = await loadSystemSettings(supabase);
    const branding = buildBranding(settings);
    const renderedTemplate = await renderEmailTemplate({
      supabase,
      templateName,
      branding,
      variables: {
        user_name: "Test User",
        verification_link: `${branding.siteUrl}/auth/callback?type=email_verification&token=test-verification-token`,
      },
    });

    await sendSmtpEmail({
      to: email,
      subject: renderedTemplate.subject,
      html: renderedTemplate.html,
      siteName: branding.siteName,
    });

    return buildResponse(200, {
      success: true,
      message: "Test email sent successfully",
    });
  } catch (error: any) {
    return buildResponse(500, {
      success: false,
      error: error?.message || "Failed to send test email",
    });
  }
});
