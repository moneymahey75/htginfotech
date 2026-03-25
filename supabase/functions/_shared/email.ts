import { resolveBaseUrl } from "./base-url.ts";

export interface SystemSettingsMap {
  [key: string]: unknown;
}

export interface BrandingSettings {
  siteName: string;
  siteUrl: string;
  logoUrl: string;
}

export interface EmailTemplateRecord {
  tet_name: string;
  tet_subject: string;
  tet_body: string;
  tet_template_type?: string;
  tet_variables?: string[];
}

export interface UserProfileRecord {
  tup_first_name?: string | null;
  tup_last_name?: string | null;
}

export interface WelcomeEmailPayload {
  email: string;
  firstName: string;
  lastName?: string;
  userType: "learner" | "tutor" | "job_seeker" | "job_provider";
  branding: BrandingSettings;
}

export interface VerificationEmailPayload {
  email: string;
  firstName: string;
  lastName?: string;
  verificationLink: string;
  branding: BrandingSettings;
}

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const buildBrandedEmailShell = ({
  eyebrow,
  title,
  body,
  showFooterLinks = true,
}: {
  eyebrow: string;
  title: string;
  body: string;
  showFooterLinks?: boolean;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center">
        <table role="presentation" style="width:100%;max-width:720px;margin:0 auto;border-collapse:collapse;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:linear-gradient(135deg, #312e81 0%, #4f46e5 48%, #7c3aed 100%);color:#ffffff;padding:28px 24px 30px;text-align:center;">
              <div style="margin:0 auto 18px;display:inline-block;padding:12px 20px;border-radius:18px;background:rgba(255,255,255,0.96);box-shadow:0 14px 30px rgba(15,23,42,0.18);border:1px solid rgba(255,255,255,0.7);">
                <img src="{{logo_url}}" alt="Brand Logo" style="display:block;max-width:176px;width:auto;height:auto;max-height:68px;margin:0 auto;">
              </div>
              <p style="margin:0 0 10px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(224,231,255,0.96);">${eyebrow}</p>
              <h1 style="margin:0;font-size:28px;line-height:1.3;font-weight:700;color:#ffffff;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0 0 8px;color:#111827;font-size:14px;font-weight:600;">${eyebrow}</p>
              <p style="margin:0${showFooterLinks ? " 0 12px" : " 0 8px"};color:#6b7280;font-size:13px;">Thank you for choosing us.</p>
              ${showFooterLinks
                ? `
              <div style="margin:0 0 12px;">
                <a href="{{site_url}}" style="color:#4f46e5;text-decoration:none;font-size:13px;margin:0 8px;">Visit Website</a>
                <span style="color:#d1d5db;">|</span>
                <a href="{{site_url}}/contact" style="color:#4f46e5;text-decoration:none;font-size:13px;margin:0 8px;">Contact Us</a>
              </div>`
                : ""}
              <p style="margin:0;color:#9ca3af;font-size:12px;">© {{current_year}} {{site_name}}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const DEFAULT_TEMPLATES: Record<string, EmailTemplateRecord> = {
  verification_email: {
    tet_name: "verification_email",
    tet_subject: "Verify your email address - {{site_name}}",
    tet_body: buildBrandedEmailShell({
      eyebrow: "{{site_name}} Account Verification",
      title: "Verify Your Email",
      body: `
        <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello {{first_name}},</p>
        <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.7;">
          Thank you for signing up with {{site_name}}. Please verify your email address to complete your registration and activate your account.
        </p>
        <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;">
            Click the button below to verify your email securely. This link is unique to your account and will expire automatically.
          </p>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="{{verification_link}}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:16px;font-weight:700;">Verify Email</a>
        </div>
        <p style="margin:0 0 10px;color:#111827;font-size:15px;font-weight:600;">
          If the button above is not clickable, please copy the following URL and paste it into your browser.
        </p>
        <p style="margin:0 0 20px;word-break:break-word;">
          <a href="{{verification_link}}" style="color:#4f46e5;text-decoration:none;font-size:14px;line-height:1.7;">{{verification_link}}</a>
        </p>
        <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">
          Regards,<br>{{site_name}} Team
        </p>
      `,
    }),
    tet_template_type: "email_verification",
    tet_variables: ["user_name", "first_name", "verification_link", "logo_url", "site_name", "site_url", "current_year"],
  },
  welcome_email: {
    tet_name: "welcome_email",
    tet_subject: "Welcome to {{site_name}}!",
    tet_body: buildBrandedEmailShell({
      eyebrow: "",
      title: "Welcome to {{site_name}}!",
      body: `
        <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello {{first_name}},</p>
        <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.7;">
          Welcome to {{site_name}}. Your email has been verified successfully, and your account is now ready to use.
        </p>
        <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
          <h3 style="margin:0 0 12px;color:#111827;font-size:18px;">What You Can Do Next</h3>
          <ul style="margin:0;padding-left:20px;color:#374151;font-size:15px;line-height:1.8;">
            <li>Browse our available courses and services</li>
            <li>Complete your profile information</li>
            <li>Explore your dashboard</li>
            <li>Connect with the {{site_name}} community</li>
          </ul>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="{{site_url}}/courses" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:16px;font-weight:700;">Browse Courses</a>
        </div>
        <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">Thank you for joining us.<br>{{site_name}} Team</p>
      `,
    }),
    tet_template_type: "user_registration",
    tet_variables: ["user_name", "first_name", "logo_url", "site_name", "site_url", "current_year"],
  },
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

export const loadSystemSettings = async (supabase: any): Promise<SystemSettingsMap> => {
  const { data, error } = await supabase
    .from("tbl_system_settings")
    .select("tss_setting_key, tss_setting_value");

  if (error) {
    throw error;
  }

  return (data ?? []).reduce((acc: SystemSettingsMap, item: any) => {
    acc[item.tss_setting_key] = parseSettingValue(item.tss_setting_value);
    return acc;
  }, {});
};

export const buildBranding = (
  settings: SystemSettingsMap,
  options?: {
    request?: Request;
    siteUrl?: string;
  },
): BrandingSettings => {
  const siteUrl = resolveBaseUrl({
    request: options?.request,
    explicitSiteUrl: options?.siteUrl,
    settings,
  });
  const siteName = String(settings.site_name || "HTG Infotech").trim();
  const logoUrl = siteUrl ? `${siteUrl}/htginfotech-logo.png` : "/htginfotech-logo.png";

  return {
    siteName,
    siteUrl,
    logoUrl,
  };
};

const getTransportConfig = () => {
  const host = String(Deno.env.get("SMTP_HOST") || "").trim();
  const port = Number(Deno.env.get("SMTP_PORT") || "587");
  const user = String(Deno.env.get("SMTP_USER") || "").trim();
  const pass = String(Deno.env.get("SMTP_PASS") || "").trim();
  const secureMode = String(Deno.env.get("SMTP_SECURE") || "").trim().toUpperCase();

  if (!host || !port || !user || !pass) {
    throw new Error("SMTP configuration is incomplete");
  }

  const secure = secureMode === "SSL" || port === 465;
  const requireTLS = secureMode === "TLS" || secureMode === "STARTTLS";

  return {
    host,
    port,
    secure,
    requireTLS,
    auth: {
      user,
      pass,
    },
  };
};

export const sendSmtpEmail = async ({
  to,
  subject,
  html,
  siteName,
  fromEmail,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  siteName: string;
  fromEmail?: string;
  replyTo?: string;
}) => {
  const { default: nodemailer } = await import("npm:nodemailer@6.10.1");
  const transportConfig = getTransportConfig();
  const transporter = nodemailer.createTransport(transportConfig);
  const normalizedSubject = normalizeEmailMarkup(subject);
  const normalizedHtml = normalizeEmailMarkup(html);

  await transporter.sendMail({
    from: `${siteName} <${String(fromEmail || transportConfig.auth.user).trim() || transportConfig.auth.user}>`,
    to,
    subject: normalizedSubject,
    html: normalizedHtml,
    ...(replyTo ? { replyTo } : {}),
  });
};

export const replaceTemplatePlaceholders = (
  template: string,
  variables: Record<string, string>,
) => template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => variables[key] ?? "");

const normalizeFirstName = (value?: string | null) => {
  const trimmedValue = String(value ?? "").trim();
  return trimmedValue || "User";
};

export const extractUserProfile = (
  profileData?: UserProfileRecord | UserProfileRecord[] | null,
): UserProfileRecord | null => {
  if (Array.isArray(profileData)) {
    return profileData[0] ?? null;
  }

  return profileData ?? null;
};

const normalizeEmailMarkup = (value: string) =>
  value
    .replace(/<wbr\b[^>]*>/gi, "")
    .replace(/<\/wbr>/gi, "")
    .replace(/&lt;\s*\/?\s*wbr\s*&gt;/gi, "")
    .replace(/&#8203;|&#x200b;|&ZeroWidthSpace;/gi, "")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(
      /(<a\b[^>]*style="[^"]*?)border-radius:\s*[^;"]+;?([^"]*"[^>]*>\s*Verify Email\s*<\/a>)/gi,
      '$1border-radius:999px;$2',
    )
    .replace(
      /(<a\b[^>]*style="[^"]*?)border-radius:\s*[^;"]+;?([^"]*"[^>]*>\s*Browse Courses\s*<\/a>)/gi,
      '$1border-radius:999px;$2',
    )
    .replace(
      /(<a\b[^>]*style=")(?![^"]*border-radius:)([^"]*"[^>]*>\s*Verify Email\s*<\/a>)/gi,
      '$1border-radius:999px;$2',
    )
    .replace(
      /(<a\b[^>]*style=")(?![^"]*border-radius:)([^"]*"[^>]*>\s*Browse Courses\s*<\/a>)/gi,
      '$1border-radius:999px;$2',
    )
    .replace(
      /<a\b([^>]*?)style="([^"]*?)"([^>]*)>\s*Verify Email\s*<\/a>/gi,
      (_match, beforeStyle: string, styleValue: string, afterStyle: string) => {
        const needsSemicolon = styleValue.trim() !== "" && !styleValue.trim().endsWith(";");
        const withRadius = /border-radius\s*:/i.test(styleValue)
          ? styleValue.replace(/border-radius\s*:\s*[^;"]+;?/gi, "border-radius:999px;")
          : `${styleValue}${needsSemicolon ? ";" : ""}border-radius:999px;`;
        return `<a${beforeStyle}style="${withRadius}"${afterStyle}>Verify Email</a>`;
      },
    )
    .replace(
      /<a\b([^>]*?)style="([^"]*?)"([^>]*)>\s*Browse Courses\s*<\/a>/gi,
      (_match, beforeStyle: string, styleValue: string, afterStyle: string) => {
        const needsSemicolon = styleValue.trim() !== "" && !styleValue.trim().endsWith(";");
        const withRadius = /border-radius\s*:/i.test(styleValue)
          ? styleValue.replace(/border-radius\s*:\s*[^;"]+;?/gi, "border-radius:999px;")
          : `${styleValue}${needsSemicolon ? ";" : ""}border-radius:999px;`;
        return `<a${beforeStyle}style="${withRadius}"${afterStyle}>Browse Courses</a>`;
      },
    )
    .replace(
      /<p\b[^>]*>\s*If you did not create this account, you can safely ignore this email\.\s*<\/p>/gi,
      '<p style="margin:0 0 10px;color:#111827;font-size:15px;font-weight:600;">If the button above is not clickable, please copy the following URL and paste it into your browser.</p><p style="margin:0 0 20px;word-break:break-word;"><a href="{{verification_link}}" style="color:#4f46e5;text-decoration:none;font-size:14px;line-height:1.7;">{{verification_link}}</a></p>',
    )
    .replace(
      /<p\b[^>]*>\s*[^<]*Welcome Message\s*<\/p>/gi,
      "",
    )
    .replace(/>\s+</g, "><")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

export const stripWordBreakTags = (value: string) =>
  normalizeEmailMarkup(value);

export const renderEmailMarkup = (
  html: string,
  variables: Record<string, string>,
) => replaceTemplatePlaceholders(stripWordBreakTags(html), variables);

export const getEmailTemplate = async (
  supabase: any,
  templateName: "verification_email" | "welcome_email",
) => {
  const { data, error } = await supabase
    .from("tbl_email_templates")
    .select("tet_name, tet_subject, tet_body, tet_template_type, tet_variables")
    .eq("tet_name", templateName)
    .eq("tet_is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? DEFAULT_TEMPLATES[templateName];
};

export const renderEmailTemplate = async ({
  supabase,
  templateName,
  variables,
  branding,
}: {
  supabase: any;
  templateName: "verification_email" | "welcome_email";
  variables: Record<string, string>;
  branding: BrandingSettings;
}) => {
  const template = await getEmailTemplate(supabase, templateName);
  const mergedVariables = {
    logo_url: branding.logoUrl,
    site_name: branding.siteName,
    site_url: branding.siteUrl,
    current_year: String(new Date().getFullYear()),
    ...variables,
  };
  const normalizedSubject = stripWordBreakTags(template.tet_subject);
  const normalizedHtml = stripWordBreakTags(template.tet_body);

  return {
    subject: replaceTemplatePlaceholders(normalizedSubject, mergedVariables),
    html: replaceTemplatePlaceholders(normalizedHtml, mergedVariables),
  };
};

export const buildVerificationEmailContent = async ({
  supabase,
  firstName,
  lastName,
  verificationLink,
  branding,
}: VerificationEmailPayload & { supabase: any }) => {
  const resolvedFirstName = normalizeFirstName(firstName);
  const resolvedLastName = String(lastName ?? "").trim();

  return renderEmailTemplate({
    supabase,
    templateName: "verification_email",
    branding,
    variables: {
      user_name: `${resolvedFirstName} ${resolvedLastName}`.trim(),
      first_name: resolvedFirstName,
      verification_link: verificationLink,
    },
  });
};

export const buildWelcomeEmailContent = async ({
  supabase,
  firstName,
  lastName,
  branding,
}: WelcomeEmailPayload & { supabase: any }) => {
  const resolvedFirstName = normalizeFirstName(firstName);
  const resolvedLastName = String(lastName ?? "").trim();

  return renderEmailTemplate({
    supabase,
    templateName: "welcome_email",
    branding,
    variables: {
      user_name: `${resolvedFirstName} ${resolvedLastName}`.trim(),
      first_name: resolvedFirstName,
    },
  });
};

export const createVerificationToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};
