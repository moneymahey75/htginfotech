export interface SystemSettingsMap {
  [key: string]: unknown;
}

export interface BrandingSettings {
  siteName: string;
  siteUrl: string;
  logoUrl: string;
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
  verificationLink: string;
  branding: BrandingSettings;
}

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
  fallbackSiteUrl?: string,
): BrandingSettings => {
  const rawSiteUrl =
    String(settings.website_url || settings.site_url || fallbackSiteUrl || Deno.env.get("SITE_URL") || "https://htginfotech.com").trim();
  const siteUrl = rawSiteUrl.replace(/\/+$/, "");
  const siteName = String(settings.site_name || "HTG Infotech").trim();
  const logoUrl = String(settings.logo_url || `${siteUrl}/htginfotech-logo.png`).trim();

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
}: {
  to: string;
  subject: string;
  html: string;
  siteName: string;
}) => {
  const { default: nodemailer } = await import("npm:nodemailer@6.10.1");
  const transportConfig = getTransportConfig();
  const transporter = nodemailer.createTransport(transportConfig);

  await transporter.sendMail({
    from: `${siteName} <${transportConfig.auth.user}>`,
    to,
    subject,
    html,
  });
};

const buildEmailShell = ({
  logoUrl,
  headerBackground,
  title,
  body,
  footerLinks,
}: {
  logoUrl: string;
  headerBackground: string;
  title: string;
  body: string;
  footerLinks: string;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 12px;">
        <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td align="center" style="padding:40px 30px;background:${headerBackground};">
              <img src="${logoUrl}" alt="HTG Infotech Logo" style="max-width:150px;height:auto;margin-bottom:20px;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:30px;background-color:#f8fafc;text-align:center;">
              ${footerLinks}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const buildVerificationEmailHtml = ({
  firstName,
  verificationLink,
  branding,
}: VerificationEmailPayload) => buildEmailShell({
  logoUrl: branding.logoUrl,
  headerBackground: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
  title: "Verify Your Email Address",
  body: `
    <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Hello ${firstName || "there"},</h2>
    <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
      Thank you for registering with ${branding.siteName}. Please confirm your email address to activate your account.
    </p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${verificationLink}" style="display:inline-block;padding:14px 30px;background:linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Verify Email</a>
    </div>
    <p style="margin:0 0 16px 0;color:#475569;font-size:15px;line-height:1.6;">
      If the button does not work, use this link:
    </p>
    <p style="margin:0 0 20px 0;word-break:break-word;">
      <a href="${verificationLink}" style="color:#2563eb;text-decoration:none;">${verificationLink}</a>
    </p>
    <div style="background-color:#f8fafc;border-left:4px solid #3b82f6;padding:16px;border-radius:4px;">
      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
        This verification link will expire automatically. If you did not create this account, you can safely ignore this email.
      </p>
    </div>
  `,
  footerLinks: `
    <p style="margin:0 0 10px 0;color:#64748b;font-size:14px;">
      <strong style="color:#1e293b;">${branding.siteName}</strong>
    </p>
    <div style="margin:16px 0;">
      <a href="${branding.siteUrl}" style="color:#3b82f6;text-decoration:none;margin:0 10px;font-size:14px;">Visit Website</a>
      <span style="color:#cbd5e1;">|</span>
      <a href="${branding.siteUrl}/contact" style="color:#3b82f6;text-decoration:none;margin:0 10px;font-size:14px;">Contact Us</a>
    </div>
    <p style="margin:16px 0 0 0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} ${branding.siteName}. All rights reserved.</p>
  `,
});

export const buildWelcomeEmailHtml = ({
  firstName,
  lastName,
  userType,
  branding,
}: WelcomeEmailPayload) => {
  const fullName = `${firstName} ${lastName || ""}`.trim();
  const isTutor = userType === "tutor";

  return buildEmailShell({
    logoUrl: branding.logoUrl,
    headerBackground: isTutor
      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
      : "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
    title: `Welcome to ${branding.siteName}!`,
    body: isTutor
      ? `
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Hello ${fullName},</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Congratulations on joining ${branding.siteName} as a tutor. We're excited to have you as part of our teaching community.
        </p>
        <div style="background-color:#f0fdf4;border-left:4px solid #10b981;padding:20px;margin:30px 0;border-radius:4px;">
          <h3 style="margin:0 0 15px 0;color:#1e293b;font-size:18px;">Getting Started as a Tutor</h3>
          <ul style="margin:0;padding-left:20px;color:#475569;font-size:15px;line-height:1.8;">
            <li>Complete your tutor profile</li>
            <li>Create your first course</li>
            <li>Upload course materials and videos</li>
            <li>Set your teaching schedule</li>
            <li>Connect with eager learners</li>
          </ul>
        </div>
        <div style="text-align:center;margin:30px 0;">
          <a href="${branding.siteUrl}/tutor/dashboard" style="display:inline-block;padding:14px 30px;background:linear-gradient(135deg, #10b981 0%, #059669 100%);color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Go to Dashboard</a>
        </div>
      `
      : `
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Hello ${fullName},</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          We're thrilled to have you join ${branding.siteName}. Your account is now verified and ready to use.
        </p>
        <div style="background-color:#f8fafc;border-left:4px solid #3b82f6;padding:20px;margin:30px 0;border-radius:4px;">
          <h3 style="margin:0 0 15px 0;color:#1e293b;font-size:18px;">What's Next?</h3>
          <ul style="margin:0;padding-left:20px;color:#475569;font-size:15px;line-height:1.8;">
            <li>Browse our available courses and services</li>
            <li>Complete your profile information</li>
            <li>Explore your dashboard</li>
            <li>Connect with the ${branding.siteName} community</li>
          </ul>
        </div>
        <div style="text-align:center;margin:30px 0;">
          <a href="${branding.siteUrl}/courses" style="display:inline-block;padding:14px 30px;background:linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">Browse Courses</a>
        </div>
      `,
    footerLinks: `
      <p style="margin:0 0 10px 0;color:#64748b;font-size:14px;">
        <strong style="color:#1e293b;">The ${branding.siteName} Team</strong>
      </p>
      <div style="margin:16px 0;">
        <a href="${branding.siteUrl}" style="color:${isTutor ? "#10b981" : "#3b82f6"};text-decoration:none;margin:0 10px;font-size:14px;">Visit Website</a>
        <span style="color:#cbd5e1;">|</span>
        <a href="${branding.siteUrl}/contact" style="color:${isTutor ? "#10b981" : "#3b82f6"};text-decoration:none;margin:0 10px;font-size:14px;">Contact Us</a>
      </div>
      <p style="margin:16px 0 0 0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} ${branding.siteName}. All rights reserved.</p>
    `,
  });
};

export const createVerificationToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};
