import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildBranding,
  buildWelcomeEmailContent,
  extractUserProfile,
  loadSystemSettings,
  sendSmtpEmail,
} from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { token, siteUrl } = await req.json();

    if (!token) {
      return createJsonResponse(400, {
        success: false,
        error: "Verification token is required",
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: otpRecord, error: otpError } = await supabase
      .from("tbl_otp_verifications")
      .select("*")
      .eq("tov_otp_code", token)
      .eq("tov_otp_type", "email")
      .order("tov_created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return createJsonResponse(400, {
        success: false,
        error: "The verification link is invalid or has expired.",
      });
    }

    const userId = otpRecord.tov_user_id;

    const { data: userData, error: userError } = await supabase
      .from("tbl_users")
      .select(`
        tu_id,
        tu_email,
        tu_user_type,
        tu_email_verified,
        tu_mobile_verified,
        tbl_user_profiles (
          tup_first_name,
          tup_last_name
        )
      `)
      .eq("tu_id", userId)
      .single();

    if (userError || !userData) {
      throw userError || new Error("User not found");
    }

    const isExpired = new Date(otpRecord.tov_expires_at).getTime() < Date.now();
    const isAlreadyVerified = Boolean(otpRecord.tov_is_verified);

    if ((isAlreadyVerified || isExpired) && userData.tu_email_verified) {
      return createJsonResponse(200, {
        success: true,
        message: "Email already verified",
      });
    }

    if (isExpired) {
      return createJsonResponse(400, {
        success: false,
        error: "The verification link is invalid or has expired.",
      });
    }

    if (isAlreadyVerified) {
      return createJsonResponse(400, {
        success: false,
        error: "The verification link is invalid or has expired.",
      });
    }

    const { error: otpUpdateError } = await supabase
      .from("tbl_otp_verifications")
      .update({
        tov_is_verified: true,
      })
      .eq("tov_id", otpRecord.tov_id);

    if (otpUpdateError) {
      throw otpUpdateError;
    }

    const { error: userUpdateError } = await supabase
      .from("tbl_users")
      .update({
        tu_email_verified: true,
        tu_is_verified: true,
      })
      .eq("tu_id", userId);

    if (userUpdateError) {
      throw userUpdateError;
    }

    const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (confirmError) {
      throw confirmError;
    }

    const settings = await loadSystemSettings(supabase);
    const branding = buildBranding(settings, { request: req, siteUrl });
    const profile = extractUserProfile(userData.tbl_user_profiles);
    const firstName = profile?.tup_first_name || "User";
    const lastName = profile?.tup_last_name || "";
    const welcomeEmail = await buildWelcomeEmailContent({
      supabase,
      email: userData.tu_email,
      firstName,
      lastName,
      userType: userData.tu_user_type,
      branding,
    });

    await sendSmtpEmail({
      to: userData.tu_email,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html,
      siteName: branding.siteName,
      settings,
    });

    return createJsonResponse(200, {
      success: true,
      message: "Email verified successfully",
    });
  } catch (error: any) {
    return createJsonResponse(400, {
      success: false,
      error: error?.message || "Email verification failed",
    });
  }
});
