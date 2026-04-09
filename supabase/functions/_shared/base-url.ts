import type { SystemSettingsMap } from "./email.ts";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeCandidate = (value?: string | null) => {
  const normalizedValue = String(value || "").trim();
  return normalizedValue ? trimTrailingSlash(normalizedValue) : "";
};

const isLocalhostCandidate = (value?: string | null) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(value || "").trim());

const isSupabaseRuntimeCandidate = (value?: string | null) => {
  const normalizedValue = normalizeCandidate(value);

  if (!normalizedValue) {
    return false;
  }

  try {
    const hostname = new URL(normalizedValue).hostname.toLowerCase();
    return (
      hostname === "edge-runtime.supabase.com" ||
      hostname.endsWith(".functions.supabase.co") ||
      hostname.endsWith(".supabase.co")
    );
  } catch {
    return false;
  }
};

const normalizeOriginCandidate = (value?: string | null) => {
  const normalizedValue = normalizeCandidate(value);

  if (!normalizedValue) {
    return "";
  }

  try {
    return trimTrailingSlash(new URL(normalizedValue).origin);
  } catch {
    return "";
  }
};

export const getRequestBaseUrl = (request?: Request) => {
  if (!request) {
    return "";
  }

  const origin = normalizeOriginCandidate(request.headers.get("origin"));
  if (origin && !isSupabaseRuntimeCandidate(origin)) {
    return origin;
  }

  const referer = normalizeOriginCandidate(request.headers.get("referer"));
  if (referer && !isSupabaseRuntimeCandidate(referer)) {
    return referer;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    const candidate = normalizeCandidate(`${forwardedProto || "https"}://${forwardedHost}`);
    if (!isSupabaseRuntimeCandidate(candidate)) {
      return candidate;
    }
  }

  const host = request.headers.get("host");

  if (host) {
    const candidate = normalizeCandidate(`${forwardedProto || "https"}://${host}`);
    if (!isSupabaseRuntimeCandidate(candidate)) {
      return candidate;
    }
  }

  const requestOrigin = normalizeCandidate(new URL(request.url).origin);
  return isSupabaseRuntimeCandidate(requestOrigin) ? "" : requestOrigin;
};

export const resolveBaseUrl = ({
  request,
  explicitSiteUrl,
  settings,
}: {
  request?: Request;
  explicitSiteUrl?: string;
  settings?: SystemSettingsMap;
}) => {
  const explicitCandidate = normalizeCandidate(explicitSiteUrl);
  if (explicitCandidate) {
    return explicitCandidate;
  }

  const requestCandidate = getRequestBaseUrl(request);
  if (requestCandidate) {
    return requestCandidate;
  }

  const candidates = [
    normalizeCandidate(String(settings?.website_url || "")),
    normalizeCandidate(String(settings?.site_url || "")),
    normalizeCandidate(Deno.env.get("SITE_URL")),
  ];

  const firstNonLocalCandidate = candidates.find((candidate) => candidate && !isLocalhostCandidate(candidate));
  return firstNonLocalCandidate || candidates.find(Boolean) || "";
};
