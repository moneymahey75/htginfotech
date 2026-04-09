import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Admin-Session",
  "Content-Type": "application/json",
};

const SMTP_SETTING_KEYS = [
  "smtp_host",
  "smtp_port",
  "smtp_username",
  "smtp_password",
  "smtp_encryption",
] as const;

interface SmtpSettingsPayload {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
}

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });

const normalizeText = (value: unknown) => String(value ?? "").trim();

const parseBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeText(value).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on" || normalized === "ssl";
};

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

const parseSmtpPayload = (payload: Record<string, unknown>): SmtpSettingsPayload => {
  const smtpHost = normalizeText(payload.smtpHost);
  const smtpPortRaw = Number(payload.smtpPort);
  const smtpUser = normalizeText(payload.smtpUser);
  const smtpPass = normalizeText(payload.smtpPass);
  const smtpSecure = parseBoolean(payload.smtpSecure);

  if (!smtpHost || !smtpUser || !smtpPass || !Number.isFinite(smtpPortRaw) || smtpPortRaw <= 0) {
    throw new Error("All SMTP fields are required and SMTP port must be numeric.");
  }

  return {
    smtpHost,
    smtpPort: smtpPortRaw,
    smtpUser,
    smtpPass,
    smtpSecure,
  };
};

const createAdminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

const requireAdmin = async (req: Request, supabaseAdmin: ReturnType<typeof createAdminClient>) => {
  const adminSession = req.headers.get("X-Admin-Session");

  if (!adminSession) {
    throw new Error("Admin session required");
  }

  const sessionMatch = adminSession.match(/^admin-session-([a-f0-9-]+)-(\d+)$/);

  if (!sessionMatch) {
    throw new Error("Invalid admin session");
  }

  const adminId = sessionMatch[1];

  const { data: admin, error } = await supabaseAdmin
    .from("tbl_admin_users")
    .select("tau_id, tau_is_active")
    .eq("tau_id", adminId)
    .eq("tau_is_active", true)
    .maybeSingle();

  if (error || !admin) {
    throw new Error("Invalid or expired admin session");
  }
};

const loadCurrentSettings = async (supabaseAdmin: ReturnType<typeof createAdminClient>): Promise<SmtpSettingsPayload> => {
  const { data, error } = await supabaseAdmin
    .from("tbl_system_settings")
    .select("tss_setting_key, tss_setting_value")
    .in("tss_setting_key", [...SMTP_SETTING_KEYS]);

  if (error) {
    throw error;
  }

  const settingsMap = (data ?? []).reduce((acc: Record<string, unknown>, item: any) => {
    acc[item.tss_setting_key] = parseSettingValue(item.tss_setting_value);
    return acc;
  }, {});

  const encryption = normalizeText(settingsMap.smtp_encryption).toLowerCase();

  return {
    smtpHost: normalizeText(settingsMap.smtp_host),
    smtpPort: Number(settingsMap.smtp_port || "587"),
    smtpUser: normalizeText(settingsMap.smtp_username),
    smtpPass: normalizeText(settingsMap.smtp_password),
    smtpSecure: encryption === "ssl" || encryption === "true" || Number(settingsMap.smtp_port || 0) === 465,
  };
};

const updateSettings = async (
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  smtpSettings: SmtpSettingsPayload,
) => {
  const updates = [
    {
      tss_setting_key: "smtp_host",
      tss_setting_value: JSON.stringify(smtpSettings.smtpHost),
      tss_description: "SMTP host",
    },
    {
      tss_setting_key: "smtp_port",
      tss_setting_value: JSON.stringify(smtpSettings.smtpPort),
      tss_description: "SMTP port",
    },
    {
      tss_setting_key: "smtp_username",
      tss_setting_value: JSON.stringify(smtpSettings.smtpUser),
      tss_description: "SMTP username",
    },
    {
      tss_setting_key: "smtp_password",
      tss_setting_value: JSON.stringify(smtpSettings.smtpPass),
      tss_description: "SMTP password",
    },
    {
      tss_setting_key: "smtp_encryption",
      tss_setting_value: JSON.stringify(smtpSettings.smtpSecure ? "ssl" : "tls"),
      tss_description: "SMTP encryption",
    },
  ];

  const { error } = await supabaseAdmin
    .from("tbl_system_settings")
    .upsert(updates, {
      onConflict: "tss_setting_key",
    });

  if (error) {
    throw error;
  }
};

const verifySmtpConnection = async (smtpSettings: SmtpSettingsPayload) => {
  const { default: nodemailer } = await import("npm:nodemailer@6.10.1");

  const transporter = nodemailer.createTransport({
    host: smtpSettings.smtpHost,
    port: smtpSettings.smtpPort,
    secure: smtpSettings.smtpSecure || smtpSettings.smtpPort === 465,
    requireTLS: !smtpSettings.smtpSecure && smtpSettings.smtpPort !== 465,
    auth: {
      user: smtpSettings.smtpUser,
      pass: smtpSettings.smtpPass,
    },
  });

  await transporter.verify();
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const supabaseAdmin = createAdminClient();

  try {
    await requireAdmin(req, supabaseAdmin);

    if (req.method === "GET") {
      return jsonResponse(200, {
        data: await loadCurrentSettings(supabaseAdmin),
      });
    }

    const body = await req.json().catch(() => ({}));

    if (req.method === "POST") {
      const smtpSettings = parseSmtpPayload(body);
      await verifySmtpConnection(smtpSettings);

      return jsonResponse(200, {
        data: { success: true },
        message: "SMTP connection verified successfully.",
      });
    }

    if (req.method === "PUT") {
      const smtpSettings = parseSmtpPayload(body);
      await updateSettings(supabaseAdmin, smtpSettings);

      return jsonResponse(200, {
        data: smtpSettings,
        message: "SMTP settings updated successfully.",
      });
    }

    return jsonResponse(405, {
      error: "Method not allowed",
    });
  } catch (error) {
    return jsonResponse(400, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
