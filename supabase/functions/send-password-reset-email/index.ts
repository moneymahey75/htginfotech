import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildBranding,
  buildPasswordResetEmailContent,
  extractUserProfile,
  loadSystemSettings,
  sendSmtpEmail,
} from "../_shared/email.ts";

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

interface PasswordResetPayload {
  email: string;
  siteUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { email, siteUrl }: PasswordResetPayload = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return createJsonResponse(400, {
        success: false,
        error: "Email is required",
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: userRecord, error: userError } = await supabase
      .from("tbl_users")
      .select(`
        tu_id,
        tu_email,
        tbl_user_profiles (
          tup_first_name,
          tup_last_name
        )
      `)
      .eq("tu_email", normalizedEmail)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    if (!userRecord) {
      return createJsonResponse(404, {
        success: false,
        error: "No account found for this email address.",
      });
    }

    const settings = await loadSystemSettings(supabase);
    const branding = buildBranding(settings, { request: req, siteUrl });
    const redirectTo = `${branding.siteUrl}/auth/callback`;

    if (!branding.siteUrl) {
      throw new Error("Site URL is not configured for password reset");
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: {
        redirectTo,
      },
    });

    const generatedHashedToken = String(linkData?.properties?.hashed_token || "").trim();

    if (linkError || !generatedHashedToken) {
      throw new Error(linkError?.message || "Failed to generate password reset link");
    }

    const resetPasswordLink =
      `${branding.siteUrl}/reset-password?type=recovery&token=${encodeURIComponent(generatedHashedToken)}`;

    if (!resetPasswordLink) {
      throw new Error("Failed to generate password reset link");
    }
    const profile = extractUserProfile(userRecord.tbl_user_profiles);
    const passwordResetEmail = await buildPasswordResetEmailContent({
      supabase,
      email: normalizedEmail,
      firstName: profile?.tup_first_name || "User",
      lastName: profile?.tup_last_name || "",
      resetPasswordLink,
      branding,
    });

    await sendSmtpEmail({
      to: normalizedEmail,
      subject: passwordResetEmail.subject,
      html: passwordResetEmail.html,
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
      error: error?.message || "Failed to send password reset email",
    });
  }
});
