import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const createJsonResponse = (status: number, payload: Record<string, unknown>) =>
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
    const { token, password } = await req.json();
    const normalizedToken = String(token || "").trim();
    const normalizedPassword = String(password || "");

    if (!normalizedToken || !normalizedPassword) {
      return createJsonResponse(400, { success: false, error: "Reset token and password are required" });
    }

    if (normalizedPassword.length < 8) {
      return createJsonResponse(400, { success: false, error: "Password must be at least 8 characters long." });
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

    const sessionToken = `subadmin-reset-${normalizedToken}`;
    const { data: resetSession, error: sessionError } = await supabase
      .from("tbl_admin_sessions")
      .select("tas_id, tas_admin_id, tas_expires_at, tas_user_agent")
      .eq("tas_session_token", sessionToken)
      .eq("tas_user_agent", "sub_admin_password_reset")
      .maybeSingle();

    if (sessionError) {
      throw sessionError;
    }

    if (!resetSession || new Date(resetSession.tas_expires_at).getTime() <= Date.now()) {
      return createJsonResponse(400, { success: false, error: "This reset link is invalid or has expired." });
    }

    const { data: subAdmin, error: subAdminError } = await supabase
      .from("tbl_admin_users")
      .select("tau_id, tau_is_active, tau_role")
      .eq("tau_id", resetSession.tas_admin_id)
      .eq("tau_role", "sub_admin")
      .maybeSingle();

    if (subAdminError) {
      throw subAdminError;
    }

    if (!subAdmin) {
      return createJsonResponse(404, { success: false, error: "Sub-admin account not found." });
    }

    if (!subAdmin.tau_is_active) {
      return createJsonResponse(403, { success: false, error: "Your account is not active, so you cannot change the password." });
    }

    const bcrypt = await import("npm:bcryptjs@2.4.3");
    const hashedPassword = await bcrypt.hash(normalizedPassword, 12);

    const { error: updateError } = await supabase
      .from("tbl_admin_users")
      .update({
        tau_password_hash: hashedPassword,
        tau_updated_at: new Date().toISOString(),
      })
      .eq("tau_id", subAdmin.tau_id);

    if (updateError) {
      throw updateError;
    }

    await supabase
      .from("tbl_admin_sessions")
      .delete()
      .eq("tas_admin_id", subAdmin.tau_id)
      .eq("tas_user_agent", "sub_admin_password_reset");

    return createJsonResponse(200, {
      success: true,
      message: "Password updated successfully",
    });
  } catch (error: any) {
    return createJsonResponse(400, {
      success: false,
      error: error?.message || "Failed to complete password reset",
    });
  }
});
