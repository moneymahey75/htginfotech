import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildBranding,
  buildWelcomeEmailHtml,
  loadSystemSettings,
  sendSmtpEmail,
} from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  email: string;
  firstName: string;
  lastName?: string;
  userType: "learner" | "tutor" | "job_seeker" | "job_provider";
  siteUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, firstName, lastName = "", userType, siteUrl }: RequestPayload = await req.json();

    if (!email || !firstName || !userType) {
      throw new Error("Missing required fields: email, firstName, or userType");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const settings = await loadSystemSettings(supabase);
    const branding = buildBranding(settings, siteUrl);

    await sendSmtpEmail({
      to: email,
      subject: `Welcome to ${branding.siteName}!`,
      html: buildWelcomeEmailHtml({
        email,
        firstName,
        lastName,
        userType,
        branding,
      }),
      siteName: branding.siteName,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome email sent successfully",
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
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Failed to send welcome email",
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
