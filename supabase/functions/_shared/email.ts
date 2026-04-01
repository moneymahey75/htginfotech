import { resolveBaseUrl } from "./base-url.ts";

export interface SystemSettingsMap {
  [key: string]: unknown;
}

export interface BrandingSettings {
  siteName: string;
  siteUrl: string;
  assetUrl: string;
  logoUrl: string;
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const normalizePublicAssetPath = (value: string) =>
  value.replace(/(https?:\/\/[^/]+)\/public\/(htginfotech-logo\.png|htgemail-logo\.png|htgsvglogo\.svg)/gi, "$1/$2");

const normalizeUrlCandidate = (value: unknown) => String(value || "").trim();

const toAbsoluteUrl = (baseUrl: string, pathOrUrl: unknown) => {
  const normalizedValue = normalizeUrlCandidate(pathOrUrl);

  if (!normalizedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(normalizedValue)) {
    return normalizePublicAssetPath(normalizedValue);
  }

  if (!baseUrl) {
    return normalizePublicAssetPath(normalizedValue.startsWith("/") ? normalizedValue : `/${normalizedValue}`);
  }

  return normalizePublicAssetPath(`${trimTrailingSlash(baseUrl)}/${normalizedValue.replace(/^\/+/, "")}`);
};

export interface EmailTemplateRecord {
  tet_name: string;
  tet_subject: string;
  tet_body: string;
  tet_html_body?: string;
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

export interface PasswordResetEmailPayload {
  email: string;
  firstName: string;
  lastName?: string;
  resetPasswordLink: string;
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
  eyebrow?: string;
  title?: string;
  body: string;
  showFooterLinks?: boolean;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || "Verify Your Email"}</title>
</head>
<body style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center">
        <table role="presentation" style="width:100%;max-width:720px;margin:0 auto;border-collapse:collapse;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td align="center" style="background:#4f46e5;color:#ffffff;padding:20px">
              <img
                src="{{logo_url}}"
                alt="Logo"
                width="120"
                style="display:block;margin:0 auto 10px auto;"
              />
              <h2 style="margin:0;font-size:22px;color:#ffffff;font-family:Arial,sans-serif;">
                ${title || "{{site_name}}"}
              </h2>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:15px;background:#f0f0f0;font-size:12px;color:#777777;font-family:Arial,sans-serif">
              <p style="margin:0 0 8px 0">{{site_name}}</p>
              <p style="margin:0 0 8px 0">
                <a
                  href="{{website_url}}"
                  style="color:#4f46e5;text-decoration:none"
                  target="_blank"
                >
                  Visit Website
                </a>
              </p>
              <p style="margin:0">© {{current_year}} {{site_name}}</p>
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
    tet_variables: ["user_name", "first_name", "verification_link", "asset_url", "logo_url", "site_name", "site_url", "current_year"],
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
    tet_variables: ["user_name", "first_name", "asset_url", "logo_url", "site_name", "site_url", "current_year"],
  },
  password_reset: {
    tet_name: "password_reset",
    tet_subject: "Reset your password - {{site_name}}",
    tet_body: buildBrandedEmailShell({
      eyebrow: "",
      title: "Reset Your Password",
      body: `
        <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello {{first_name}},</p>
        <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.7;">
          We received a request to reset the password for your {{site_name}} account.
        </p>
        <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;">
            Click the button below to create a new password. This reset link is unique to your account and will expire automatically.
          </p>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="{{reset_link}}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:16px;font-weight:700;">Reset Password</a>
        </div>
        <p style="margin:0 0 10px;color:#111827;font-size:15px;font-weight:600;">
          If the button above is not clickable, please copy the following URL and paste it into your browser.
        </p>
        <p style="margin:0 0 20px;word-break:break-word;">
          <a href="{{reset_link}}" style="color:#4f46e5;text-decoration:none;font-size:14px;line-height:1.7;">{{reset_link}}</a>
        </p>
        <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">
          If you did not request a password reset, you can safely ignore this email.<br>{{site_name}} Team
        </p>
      `,
    }),
    tet_template_type: "password_reset",
    tet_variables: ["user_name", "first_name", "reset_link", "reset_password_link", "asset_url", "logo_url", "site_name", "site_url", "current_year"],
  },
  contact_admin_email: {
    tet_name: "contact_admin_email",
    tet_subject: "New Contact Us Submission: {{contact_subject}}",
    tet_body: buildBrandedEmailShell({
      eyebrow: "",
      title: "New Contact Us Submission",
      showFooterLinks: false,
      body: `
        <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello Admin,</p>
        <p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:1.7;">
          A new contact request has been submitted through {{site_name}}. The sender details and message are included below.
        </p>
        <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:180px;font-weight:600;color:#111827;vertical-align:top;">Full Name</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#374151;">{{sender_name}}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:180px;font-weight:600;color:#111827;vertical-align:top;">Email Address</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#374151;"><a href="mailto:{{sender_email}}" style="color:#4f46e5;text-decoration:none;">{{sender_email}}</a></td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:180px;font-weight:600;color:#111827;vertical-align:top;">Submitted At</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#374151;">{{submitted_at}}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:180px;font-weight:600;color:#111827;vertical-align:top;">Inquiry Type</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#374151;">{{inquiry_type}}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:180px;font-weight:600;color:#111827;vertical-align:top;">Subject</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#374151;">{{contact_subject}}</td></tr>
          </table>
        </div>
        <div style="margin:24px 0;padding:22px;border-radius:12px;background:#ffffff;border:1px solid #e5e7eb;">
          <p style="margin:0 0 12px;color:#111827;font-size:16px;font-weight:600;">Message</p>
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.8;white-space:normal;">{{message_body}}</p>
        </div>
        <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">
          You can reply directly to this email to respond to {{sender_name}}.
        </p>
      `,
    }),
    tet_template_type: "contact_admin_notification",
    tet_variables: ["sender_name", "sender_email", "contact_subject", "message_body", "inquiry_type", "submitted_at", "page_url", "asset_url", "logo_url", "site_name", "site_url", "current_year"],
  },
  contact_confirmation_email: {
    tet_name: "contact_confirmation_email",
    tet_subject: "We received your message - {{site_name}}",
    tet_body: buildBrandedEmailShell({
      eyebrow: "",
      title: "We Received Your Message",
      showFooterLinks: false,
      body: `
        <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello {{sender_name}},</p>
        <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.7;">
          Thank you for contacting {{site_name}}. This is a confirmation that your message has been received and shared with our team.
        </p>
        <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:180px;font-weight:600;color:#111827;vertical-align:top;">Inquiry Type</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#374151;">{{inquiry_type}}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:180px;font-weight:600;color:#111827;vertical-align:top;">Subject</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#374151;">{{contact_subject}}</td></tr>
            <tr><td style="padding:12px 0;width:180px;font-weight:600;color:#111827;vertical-align:top;">Submitted At</td><td style="padding:12px 0;color:#374151;">{{submitted_at}}</td></tr>
          </table>
        </div>
        <div style="margin:24px 0;padding:22px;border-radius:12px;background:#ffffff;border:1px solid #e5e7eb;">
          <p style="margin:0 0 12px;color:#111827;font-size:16px;font-weight:600;">Your Message</p>
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.8;">{{message_body}}</p>
        </div>
        <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">
          Our team will review your inquiry and get back to you as soon as possible. If you need to add anything else, reply to this email or contact us at <a href="mailto:{{support_email}}" style="color:#4f46e5;text-decoration:none;">{{support_email}}</a>.
        </p>
      `,
    }),
    tet_template_type: "contact_confirmation",
    tet_variables: ["sender_name", "contact_subject", "message_body", "inquiry_type", "submitted_at", "support_email", "asset_url", "logo_url", "site_name", "site_url", "current_year"],
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
  const configuredLogoUrl = String(settings.logo_url || "").trim();
  const logoUrl = configuredLogoUrl
    ? toAbsoluteUrl(siteUrl, configuredLogoUrl)
    : toAbsoluteUrl(siteUrl, "/htginfotech-logo.png");

  return {
    siteName,
    siteUrl,
    assetUrl: siteUrl,
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
      /src=(['"])\{\{\s*asset_url\s*\}\}\/public\/htginfotech-logo\.png\1/gi,
      (_match, quote: string) => `src=${quote}{{logo_url}}${quote}`,
    )
    .replace(
      /src=(['"])\{\{\s*asset_url\s*\}\}\/htginfotech-logo\.png\1/gi,
      (_match, quote: string) => `src=${quote}{{logo_url}}${quote}`,
    )
    .replace(
      /src=(['"])(https?:\/\/[^'"]+)\/public\/(htginfotech-logo\.png|htgemail-logo\.png|htgsvglogo\.svg)\1/gi,
      (_match, quote: string, baseUrl: string, fileName: string) => `src=${quote}${baseUrl}/${fileName}${quote}`,
    )
    .replace(
      /<a\b((?:(?!href=)[^>])*)>\s*(Reset Password|Reset Password Link)\s*<\/a>/gi,
      '<a href="{{reset_link}}"$1>$2</a>',
    )
    .replace(
      /<a\b([^>]*?)href=(['"])\s*\2([^>]*)>\s*(Reset Password|Reset Password Link)\s*<\/a>/gi,
      '<a href="{{reset_link}}"$1$3>$4</a>',
    )
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
      /(<a\b[^>]*style=")(?![^"]*border-radius:)([^"]*"[^>]*>\s*(Reset Password|Reset Password Link)\s*<\/a>)/gi,
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
      /<a\b([^>]*?)style="([^"]*?)"([^>]*)>\s*(Reset Password|Reset Password Link)\s*<\/a>/gi,
      (_match, beforeStyle: string, styleValue: string, afterStyle: string, label: string) => {
        const needsSemicolon = styleValue.trim() !== "" && !styleValue.trim().endsWith(";");
        const withRadius = /border-radius\s*:/i.test(styleValue)
          ? styleValue.replace(/border-radius\s*:\s*[^;"]+;?/gi, "border-radius:999px;")
          : `${styleValue}${needsSemicolon ? ";" : ""}border-radius:999px;`;
        const linkMarkup = /href\s*=/i.test(`${beforeStyle}${afterStyle}`)
          ? `<a${beforeStyle}style="${withRadius}"${afterStyle}>${label}</a>`
          : `<a href="{{reset_link}}"${beforeStyle}style="${withRadius}"${afterStyle}>${label}</a>`;
        return linkMarkup;
      },
    )
    .replace(
      /<a\b([^>]*?)href=(['"])\s*\2([^>]*?)style="([^"]*?)"([^>]*)>\s*(Reset Password|Reset Password Link)\s*<\/a>/gi,
      (_match, beforeHref: string, _quote: string, afterHref: string, styleValue: string, afterStyle: string, label: string) => {
        const needsSemicolon = styleValue.trim() !== "" && !styleValue.trim().endsWith(";");
        const withRadius = /border-radius\s*:/i.test(styleValue)
          ? styleValue.replace(/border-radius\s*:\s*[^;"]+;?/gi, "border-radius:999px;")
          : `${styleValue}${needsSemicolon ? ";" : ""}border-radius:999px;`;
        return `<a${beforeHref}href="{{reset_link}}"${afterHref}style="${withRadius}"${afterStyle}>${label}</a>`;
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

const TEMPLATE_NAME_ALIASES: Record<
  "verification_email" | "welcome_email" | "contact_admin_email" | "contact_confirmation_email" | "password_reset",
  string[]
> = {
  verification_email: ["verification_email", "VERIFICATION_EMAIL", "Verification Email"],
  welcome_email: ["welcome_email", "WELCOME_EMAIL", "Welcome Email"],
  contact_admin_email: ["contact_admin_email", "CONTACT_ADMIN_EMAIL", "Contact Admin Email"],
  contact_confirmation_email: ["contact_confirmation_email", "CONTACT_CONFIRMATION_EMAIL", "Contact Confirmation Email"],
  password_reset: ["password_reset", "PASSWORD_RESET", "Password Reset"],
};

export const getEmailTemplate = async (
  supabase: any,
  templateName: "verification_email" | "welcome_email" | "contact_admin_email" | "contact_confirmation_email" | "password_reset",
) => {
  const selectColumns = "tet_name, tet_subject, tet_body, tet_html_body, tet_template_type, tet_variables";
  const candidateNames = TEMPLATE_NAME_ALIASES[templateName];

  const { data, error } = await supabase
    .from("tbl_email_templates")
    .select(selectColumns)
    .in("tet_name", candidateNames)
    .eq("tet_is_active", true)
    .order("tet_updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  if (Array.isArray(data) && data.length) {
    const matchedTemplate = candidateNames
      .map((name) => data.find((template: any) => template.tet_name === name))
      .find(Boolean);

    if (matchedTemplate) {
      return matchedTemplate;
    }
  }

  if (templateName === "password_reset") {
    throw new Error("Password Reset template not found in tbl_email_templates.");
  }

  return DEFAULT_TEMPLATES[templateName];
};

export const renderEmailTemplate = async ({
  supabase,
  templateName,
  variables,
  branding,
}: {
  supabase: any;
  templateName: "verification_email" | "welcome_email" | "contact_admin_email" | "contact_confirmation_email" | "password_reset";
  variables: Record<string, string>;
  branding: BrandingSettings;
}) => {
  const template = await getEmailTemplate(supabase, templateName);
  const resolvedResetLink = variables.reset_link || variables.reset_password_link || "";
  const mergedVariables = {
    ...variables,
    asset_url: branding.assetUrl,
    logo_url: branding.logoUrl,
    site_name: branding.siteName,
    site_url: branding.siteUrl,
    website_url: branding.siteUrl,
    current_year: String(new Date().getFullYear()),
    reset_link: resolvedResetLink,
    reset_password_link: resolvedResetLink,
  };
  const normalizedSubject = stripWordBreakTags(template.tet_subject);
  const normalizedHtml = stripWordBreakTags(template.tet_html_body || template.tet_body);

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

export const buildPasswordResetEmailContent = async ({
  supabase,
  firstName,
  lastName,
  resetPasswordLink,
  branding,
}: PasswordResetEmailPayload & { supabase: any }) => {
  const resolvedFirstName = normalizeFirstName(firstName);
  const resolvedLastName = String(lastName ?? "").trim();

  return renderEmailTemplate({
    supabase,
    templateName: "password_reset",
    branding,
    variables: {
      reset_link: resetPasswordLink,
      asset_url: branding.assetUrl,
      site_name: branding.siteName,
      site_url: branding.siteUrl,
      current_year: String(new Date().getFullYear()),
      user_name: `${resolvedFirstName} ${resolvedLastName}`.trim(),
      first_name: resolvedFirstName,
      reset_password_link: resetPasswordLink,
    },
  });
};

export const createVerificationToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};
