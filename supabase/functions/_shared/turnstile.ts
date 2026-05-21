import type { SystemSettingsMap } from "./email.ts";

export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

const getRemoteIp = (req: Request) =>
  req.headers.get("cf-connecting-ip") ||
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  "";

const isLocalRequest = (req: Request) => {
  const candidates = [
    req.url,
    req.headers.get("origin") || "",
    req.headers.get("referer") || "",
  ];

  try {
    return candidates.some((candidate) => {
      if (!candidate) {
        return false;
      }

      const url = new URL(candidate);
      return ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
    });
  } catch {
    return false;
  }
};

export const resolveTurnstileKeys = (settings: SystemSettingsMap, req: Request) => {
  const configuredSiteKey = String(settings.cloudflare_turnstile_site_key || "").trim();
  const configuredSecretKey = String(settings.cloudflare_turnstile_secret_key || "").trim();

  if (configuredSiteKey && configuredSecretKey) {
    return {
      enabled: true,
      siteKey: configuredSiteKey,
      secretKey: configuredSecretKey,
      usingTestKey: false,
    };
  }

  return {
    enabled: false,
    siteKey: "",
    secretKey: "",
    usingTestKey: false,
  };
};

export const validateTurnstileToken = async ({
  req,
  token,
  secretKey,
  expectedAction,
}: {
  req: Request;
  token: string;
  secretKey: string;
  expectedAction?: string;
}) => {
  const normalizedToken = String(token || "").trim();

  if (!normalizedToken) {
    throw new Error("Cloudflare verification token is required.");
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      secret: secretKey,
      response: normalizedToken,
      remoteip: getRemoteIp(req),
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    const errorCodes = Array.isArray(result?.["error-codes"]) ? result["error-codes"].join(", ") : "";
    throw new Error(errorCodes ? `Cloudflare verification failed: ${errorCodes}` : "Cloudflare verification failed.");
  }

  if (expectedAction && result.action && result.action !== expectedAction) {
    throw new Error("Cloudflare verification action mismatch.");
  }

  return result;
};
