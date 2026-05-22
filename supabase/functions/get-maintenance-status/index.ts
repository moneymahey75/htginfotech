import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadSystemSettings } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const asBoolean = (value: unknown) => value === true || value === "true";

const asDate = (value: unknown): Date | null => {
  const raw = String(value || "").trim();

  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const asIpList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const getClientIp = (req: Request) => {
  const candidates = [
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-real-ip"),
    req.headers.get("x-forwarded-for")?.split(",")[0],
    req.headers.get("forwarded")?.match(/for="?([^";,]+)"?/i)?.[1],
  ];

  return candidates.find((candidate) => candidate && candidate.trim())?.trim() || "";
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
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

    const settings = await loadSystemSettings(supabase);
    const now = new Date();
    const enabled = asBoolean(settings.maintenance_mode_enabled);
    const notifyFromAt = asDate(settings.maintenance_notify_from_at);
    const startAt = asDate(settings.maintenance_start_at);
    const endAt = asDate(settings.maintenance_end_at);
    const allowedIps = asIpList(settings.maintenance_allowed_ips);
    const clientIp = getClientIp(req);
    const bypass = Boolean(clientIp && allowedIps.includes(clientIp));

    if (enabled && endAt && now >= endAt) {
      await supabase
        .from("tbl_system_settings")
        .upsert(
          {
            tss_setting_key: "maintenance_mode_enabled",
            tss_setting_value: false,
            tss_description: "Enable or disable frontend maintenance mode",
            tss_updated_at: now.toISOString(),
          },
          { onConflict: "tss_setting_key" },
        );
    }

    const effectiveEnabled = enabled && !(endAt && now >= endAt);
    const active = Boolean(
      effectiveEnabled &&
      startAt &&
      now >= startAt &&
      (!endAt || now < endAt),
    );
    const upcoming = Boolean(
      effectiveEnabled &&
      notifyFromAt &&
      startAt &&
      now >= notifyFromAt &&
      now < startAt,
    );

    return new Response(
      JSON.stringify({
        success: true,
        enabled: effectiveEnabled,
        active,
        upcoming,
        bypass,
        clientIp,
        serverNow: now.toISOString(),
        notifyFromAt: notifyFromAt?.toISOString() || "",
        startAt: startAt?.toISOString() || "",
        endAt: endAt?.toISOString() || "",
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
        error: error?.message || "Failed to load maintenance status.",
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
