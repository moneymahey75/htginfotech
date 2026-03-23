import type { SystemSettingsMap } from "./email.ts";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeCandidate = (value?: string | null) => {
  const normalizedValue = String(value || "").trim();
  return normalizedValue ? trimTrailingSlash(normalizedValue) : "";
};

export const getRequestBaseUrl = (request?: Request) => {
  if (!request) {
    return "";
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    return normalizeCandidate(`${forwardedProto || "https"}://${forwardedHost}`);
  }

  const host = request.headers.get("host");

  if (host) {
    return normalizeCandidate(`${forwardedProto || "https"}://${host}`);
  }

  return normalizeCandidate(new URL(request.url).origin);
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
  const candidates = [
    normalizeCandidate(explicitSiteUrl),
    normalizeCandidate(String(settings?.website_url || "")),
    normalizeCandidate(String(settings?.site_url || "")),
    getRequestBaseUrl(request),
    normalizeCandidate(Deno.env.get("SITE_URL")),
  ];

  return candidates.find(Boolean) || "";
};
