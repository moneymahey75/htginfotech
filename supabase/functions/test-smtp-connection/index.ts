import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildTransportConfigFromInput, verifySmtpConnection } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

const formatSmtpErrorMessage = (error: unknown) => {
  const rawMessage = error instanceof Error ? error.message : String(error || "SMTP connection failed");
  const normalizedMessage = rawMessage.trim();

  if (/535[\s-]*5\.7\.8|badcredentials|username and password not accepted/i.test(normalizedMessage)) {
    return "SMTP authentication failed. Gmail rejected the username/password. Use a current Google App Password and save the updated SMTP password.";
  }

  if (/timed? out|etimedout|connection timeout/i.test(normalizedMessage)) {
    return "SMTP connection timed out. Check the SMTP host, port, firewall rules, or outbound network access.";
  }

  if (/econnrefused|connection refused/i.test(normalizedMessage)) {
    return "SMTP connection was refused. Verify the SMTP host, port, and encryption mode.";
  }

  return normalizedMessage || "SMTP connection failed";
};

interface SmtpTestPayload {
  host?: string;
  port?: number | string;
  username?: string;
  password?: string;
  encryption?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const adminSession = req.headers.get("X-Admin-Session");
    if (!adminSession) {
      return buildResponse(401, { success: false, error: "Admin session required" });
    }

    const sessionMatch = adminSession.match(/^admin-session-(.+)-(\d+)$/);
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

    const payload: SmtpTestPayload = await req.json();
    const transportConfig = buildTransportConfigFromInput(payload);

    await verifySmtpConnection(transportConfig);

    return buildResponse(200, {
      success: true,
      message: "SMTP authentication succeeded.",
    });
  } catch (error: unknown) {
    return buildResponse(400, {
      success: false,
      error: formatSmtpErrorMessage(error),
    });
  }
});
