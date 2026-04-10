import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildBranding,
  buildSubAdminPasswordResetEmailContent,
  createVerificationToken,
  loadSystemSettings,
  sendSmtpEmail,
} from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-session, Content-Type, Authorization, X-Client-Info, Apikey, X-Admin-Session",
};

const createJsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const getAdminIdFromSession = (sessionToken: string) => {
  const match = sessionToken.match(/^admin-session-([a-f0-9-]+)-(\d+)$/);
  return match?.[1] || "";
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const adminSession = req.headers.get("X-Admin-Session") || "";
    const adminId = getAdminIdFromSession(adminSession);

    if (!adminId) {
      return createJsonResponse(401, { success: false, error: "Admin session required" });
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

    const { data: actingAdmin } = await supabase
      .from("tbl_admin_users")
      .select("tau_id, tau_is_active")
      .eq("tau_id", adminId)
      .eq("tau_is_active", true)
      .maybeSingle();

    if (!actingAdmin) {
      return createJsonResponse(401, { success: false, error: "Invalid or expired admin session" });
    }

    const { subAdminId, siteUrl } = await req.json();
    const normalizedSubAdminId = String(subAdminId || "").trim();

    if (!normalizedSubAdminId) {
      return createJsonResponse(400, { success: false, error: "Sub-admin id is required" });
    }

    const { data: subAdmin, error: subAdminError } = await supabase
      .from("tbl_admin_users")
      .select("tau_id, tau_email, tau_full_name, tau_is_active, tau_role")
      .eq("tau_id", normalizedSubAdminId)
      .eq("tau_role", "sub_admin")
      .maybeSingle();

    if (subAdminError) {
      throw subAdminError;
    }

    if (!subAdmin) {
      return createJsonResponse(404, { success: false, error: "Sub-admin account not found" });
    }

    if (!subAdmin.tau_is_active) {
      return createJsonResponse(400, { success: false, error: "The sub-admin is inactive, so a password reset email cannot be sent." });
    }

    await supabase
      .from("tbl_admin_sessions")
      .delete()
      .eq("tas_admin_id", subAdmin.tau_id)
      .eq("tas_user_agent", "sub_admin_password_reset");

    const token = createVerificationToken();
    const sessionToken = `subadmin-reset-${token}`;
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();

    const { error: sessionError } = await supabase
      .from("tbl_admin_sessions")
      .insert({
        tas_admin_id: subAdmin.tau_id,
        tas_session_token: sessionToken,
        tas_expires_at: expiresAt,
        tas_user_agent: "sub_admin_password_reset",
      });

    if (sessionError) {
      throw sessionError;
    }

    const settings = await loadSystemSettings(supabase);
    const branding = buildBranding(settings, { request: req, siteUrl });
    const resetPasswordLink = `${branding.siteUrl}/backpanel/reset-password?token=${encodeURIComponent(token)}`;
    const firstName = String(subAdmin.tau_full_name || "").trim().split(/\s+/)[0] || "Admin";

    const emailContent = await buildSubAdminPasswordResetEmailContent({
      supabase,
      email: subAdmin.tau_email,
      firstName,
      lastName: "",
      resetPasswordLink,
      branding,
    });

    await sendSmtpEmail({
      to: subAdmin.tau_email,
      subject: emailContent.subject,
      html: emailContent.html,
      siteName: branding.siteName,
      settings,
    });

    return createJsonResponse(200, {
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error: any) {
    return createJsonResponse(400, {
      success: false,
      error: error?.message || "Failed to send sub-admin password reset email",
    });
  }
});
