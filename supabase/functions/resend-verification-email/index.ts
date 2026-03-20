import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildBranding,
  buildVerificationEmailContent,
  createVerificationToken,
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

interface ResendPayload {
  email: string;
  siteUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { email, siteUrl }: ResendPayload = await req.json();
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
        tu_email_verified,
        tbl_user_profiles (
          tup_first_name
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

    if (userRecord.tu_email_verified) {
      return createJsonResponse(400, {
        success: false,
        error: "This email address is already verified.",
      });
    }

    await supabase
      .from("tbl_otp_verifications")
      .delete()
      .eq("tov_user_id", userRecord.tu_id)
      .eq("tov_otp_type", "email")
      .eq("tov_is_verified", false);

    const verificationToken = createVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: verificationInsertError } = await supabase
      .from("tbl_otp_verifications")
      .insert({
        tov_user_id: userRecord.tu_id,
        tov_otp_code: verificationToken,
        tov_otp_type: "email",
        tov_contact_info: normalizedEmail,
        tov_expires_at: expiresAt,
        tov_is_verified: false,
        tov_attempts: 0,
      });

    if (verificationInsertError) {
      throw verificationInsertError;
    }

    const settings = await loadSystemSettings(supabase);
    const branding = buildBranding(settings, siteUrl);
    const verificationLink =
      `${branding.siteUrl}/auth/callback?type=email_verification&token=${encodeURIComponent(verificationToken)}`;
    const verificationEmail = await buildVerificationEmailContent({
      supabase,
      email: normalizedEmail,
      firstName: userRecord.tbl_user_profiles?.tup_first_name || "User",
      verificationLink,
      branding,
    });

    await sendSmtpEmail({
      to: normalizedEmail,
      subject: verificationEmail.subject,
      html: verificationEmail.html,
      siteName: branding.siteName,
    });

    return createJsonResponse(200, {
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (error: any) {
    return createJsonResponse(400, {
      success: false,
      error: error?.message || "Failed to resend verification email",
    });
  }
});
