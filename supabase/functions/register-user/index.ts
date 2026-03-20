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
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  userName: string;
  phoneNumber?: string | null;
  gender?: string | null;
  userType: "learner" | "tutor" | "job_seeker" | "job_provider";
  siteUrl?: string;
}

const createErrorResponse = (status: number, error: string) =>
  new Response(
    JSON.stringify({
      success: false,
      error,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  let createdUserId: string | null = null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const payload: RegisterPayload = await req.json();
    const {
      email,
      password,
      firstName,
      middleName = "",
      lastName,
      userName,
      phoneNumber = null,
      gender = null,
      userType,
      siteUrl,
    } = payload;

    if (!email || !password || !firstName || !lastName || !userName || !userType) {
      return createErrorResponse(400, "Missing required registration fields");
    }

    const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        user_type: userType,
      },
    });

    if (authError || !authResult.user) {
      return createErrorResponse(400, authError?.message || "Failed to create auth user");
    }

    createdUserId = authResult.user.id;

    const { error: userError } = await supabase
      .from("tbl_users")
      .insert({
        tu_id: createdUserId,
        tu_email: email,
        tu_user_type: userType,
        tu_is_verified: false,
        tu_email_verified: false,
        tu_mobile_verified: false,
        tu_is_active: true,
      });

    if (userError) {
      throw userError;
    }

    const { error: profileError } = await supabase
      .from("tbl_user_profiles")
      .insert({
        tup_user_id: createdUserId,
        tup_first_name: firstName,
        tup_middle_name: middleName,
        tup_last_name: lastName,
        tup_username: userName,
        tup_mobile: phoneNumber && phoneNumber.trim() !== "" ? phoneNumber : null,
        tup_gender: gender,
      });

    if (profileError) {
      throw profileError;
    }

    if (userType === "tutor") {
      const { error: tutorError } = await supabase
        .from("tbl_tutors")
        .insert({
          tt_user_id: createdUserId,
          tt_bio: "New tutor profile",
          tt_specializations: [],
          tt_experience_years: 0,
          tt_education: "",
          tt_hourly_rate: 25,
          tt_languages: ["English"],
          tt_is_verified: false,
          tt_is_active: true,
        });

      if (tutorError) {
        throw tutorError;
      }
    }

    const verificationToken = createVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: verificationInsertError } = await supabase
      .from("tbl_otp_verifications")
      .insert({
        tov_user_id: createdUserId,
        tov_otp_code: verificationToken,
        tov_otp_type: "email",
        tov_contact_info: email,
        tov_expires_at: expiresAt,
        tov_is_verified: false,
        tov_attempts: 0,
      });

    if (verificationInsertError) {
      throw verificationInsertError;
    }

    const systemSettings = await loadSystemSettings(supabase);
    const branding = buildBranding(systemSettings, siteUrl);
    const verificationLink =
      `${branding.siteUrl}/auth/callback?type=email_verification&token=${encodeURIComponent(verificationToken)}`;
    const verificationEmail = await buildVerificationEmailContent({
      supabase,
      email,
      firstName,
      verificationLink,
      branding,
    });

    await sendSmtpEmail({
      to: email,
      subject: verificationEmail.subject,
      html: verificationEmail.html,
      siteName: branding.siteName,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "User registered successfully",
        user_id: createdUserId,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error: any) {
    if (createdUserId) {
      await supabase.from("tbl_otp_verifications").delete().eq("tov_user_id", createdUserId);
      await supabase.from("tbl_tutors").delete().eq("tt_user_id", createdUserId);
      await supabase.from("tbl_user_profiles").delete().eq("tup_user_id", createdUserId);
      await supabase.from("tbl_users").delete().eq("tu_id", createdUserId);
      await supabase.auth.admin.deleteUser(createdUserId);
    }

    const message =
      error?.code === "23505"
        ? "Registration failed because one of the provided values already exists."
        : error?.message || "Registration failed";

    return createErrorResponse(400, message);
  }
});
