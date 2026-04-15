export interface EmailTemplateDefinition {
  name: 'verification_email' | 'welcome_email' | 'contact_admin_email' | 'contact_confirmation_email' | 'password_reset' | 'sub_admin_password_reset';
  label: string;
  subject: string;
  body: string;
  templateType: string;
  variables: string[];
}

const buildEmailShell = ({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title?: string;
  body: string;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Verify Your Email'}</title>
</head>
<body style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center">
        <table role="presentation" style="width:100%;max-width:720px;margin:0 auto;border-collapse:collapse;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td align="center" style="background:#4f46e5;color:#ffffff;padding:20px">
              <img
                src="https://htginfotech.com/htginfotech-logo.png"
                alt="Logo"
                width="120"
                style="display:block;margin:0 auto 10px auto;"
              />
              <h2 style="margin:0;font-size:22px;color:#ffffff;font-family:Arial,sans-serif;">
                ${title || 'HTG Infotech'}
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
              <p style="margin:0 0 8px 0">HTG Infotech</p>
              <p style="margin:0 0 8px 0">
                <a href="https://htginfotech.com" style="color:#4f46e5;text-decoration:none" target="_blank">Visit Website</a>
              </p>
              <p style="margin:0">© {{current_year}} HTG Infotech</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const emailTemplateDefaults: EmailTemplateDefinition[] = [
  {
    name: 'verification_email',
    label: 'Verification Email',
    subject: 'Verify your email address - HTG Infotech',
    templateType: 'email_verification',
    variables: ['user_name', 'first_name', 'verification_link', 'asset_url', 'website_url', 'logo_url', 'site_name', 'site_url', 'current_year'],
    body: buildEmailShell({
      body: `
        <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello {{first_name}},</p>
        <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.7;">
          Thank you for signing up with HTG Infotech. Please verify your email address to complete your registration and activate your account.
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
          Regards,<br>HTG Infotech Team
        </p>
      `,
    }),
  },
  {
    name: 'welcome_email',
    label: 'Welcome Email',
    subject: 'Welcome to HTG Infotech!',
    templateType: 'user_registration',
    variables: ['user_name', 'first_name', 'asset_url', 'website_url', 'logo_url', 'site_name', 'site_url', 'current_year'],
    body: buildEmailShell({
      body: `
        <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello {{first_name}},</p>
        <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.7;">
          Welcome to HTG Infotech. Your email has been verified successfully, and your account is now ready to use.
        </p>
        <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
          <h3 style="margin:0 0 12px;color:#111827;font-size:18px;">What You Can Do Next</h3>
          <ul style="margin:0;padding-left:20px;color:#374151;font-size:15px;line-height:1.8;">
            <li>Browse our available courses and services</li>
            <li>Complete your profile information</li>
            <li>Explore your dashboard</li>
            <li>Connect with the HTG Infotech community</li>
          </ul>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="https://htginfotech.com/courses" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:16px;font-weight:700;">Browse Courses</a>
        </div>
        <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">Thank you for joining us.<br>HTG Infotech Team</p>
      `,
    }),
  },
  {
    name: 'contact_admin_email',
    label: 'Contact Admin Email',
    subject: 'New Contact Us Submission: {{contact_subject}}',
    templateType: 'contact_admin_notification',
    variables: ['sender_name', 'sender_email', 'contact_subject', 'message_body', 'inquiry_type', 'submitted_at', 'page_url', 'asset_url', 'website_url', 'logo_url', 'site_name', 'site_url', 'current_year'],
    body: buildEmailShell({
      body: `
        <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello Admin,</p>
        <p style="margin:0 0 18px;color:#374151;font-size:16px;line-height:1.7;">
          A new contact request has been submitted through HTG Infotech. The sender details and message are included below.
        </p>
        <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:180px;font-weight:600;color:#111827;vertical-align:top;">Full Name</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#374151;">{{sender_name}}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:180px;font-weight:600;color:#111827;vertical-align:top;">Email Address</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#374151;"><a href="mailto:{{sender_email}}" style="color:#4f46e5;text-decoration:none;">{{sender_email}}</a></td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:180px;font-weight:600;color:#111827;vertical-align:top;">Inquiry Type</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#374151;">{{inquiry_type}}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:180px;font-weight:600;color:#111827;vertical-align:top;">Subject</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#374151;">{{contact_subject}}</td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;width:180px;font-weight:600;color:#111827;vertical-align:top;">Submitted At</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#374151;">{{submitted_at}}</td></tr>
            <tr><td style="padding:12px 0;width:180px;font-weight:600;color:#111827;vertical-align:top;">Submitted From</td><td style="padding:12px 0;color:#374151;"><a href="{{page_url}}" style="color:#4f46e5;text-decoration:none;">{{page_url}}</a></td></tr>
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
  },
  {
    name: 'password_reset',
    label: 'Password Reset',
    subject: 'Reset your password - HTG Infotech',
    templateType: 'password_reset',
    variables: ['user_name', 'first_name', 'reset_link', 'reset_password_link', 'asset_url', 'website_url', 'logo_url', 'site_name', 'site_url', 'current_year'],
    body: buildEmailShell({
      body: `
        <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello {{first_name}},</p>
        <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.7;">
          We received a request to reset the password for your HTG Infotech account.
        </p>
        <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;">
            Click the button below to choose a new password. This reset link is secure and will expire automatically.
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
          If you did not request a password reset, you can safely ignore this email.<br>HTG Infotech Team
        </p>
      `,
    }),
  },
  {
    name: 'sub_admin_password_reset',
    label: 'Sub Admin Password Reset',
    subject: 'Reset your admin password - HTG Infotech',
    templateType: 'sub_admin_password_reset',
    variables: ['user_name', 'first_name', 'reset_link', 'reset_password_link', 'asset_url', 'website_url', 'logo_url', 'site_name', 'site_url', 'current_year'],
    body: buildEmailShell({
      body: `
        <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello {{first_name}},</p>
        <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.7;">
          We received a request to reset the password for your sub-admin account on HTG Infotech.
        </p>
        <div style="margin:24px 0;padding:18px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;">
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.7;">
            Click the button below to choose a new password and access the admin panel securely. This reset link is unique to your account and will expire automatically.
          </p>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="{{reset_link}}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:16px;font-weight:700;">Reset Admin Password</a>
        </div>
        <p style="margin:0 0 10px;color:#111827;font-size:15px;font-weight:600;">
          If the button above is not clickable, please copy the following URL and paste it into your browser.
        </p>
        <p style="margin:0 0 20px;word-break:break-word;">
          <a href="{{reset_link}}" style="color:#4f46e5;text-decoration:none;font-size:14px;line-height:1.7;">{{reset_link}}</a>
        </p>
        <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">
          If you did not request this password reset, you can safely ignore this email.<br>HTG Infotech Team
        </p>
      `,
    }),
  },
  {
    name: 'contact_confirmation_email',
    label: 'Contact Confirmation Email',
    subject: 'We received your message - HTG Infotech',
    templateType: 'contact_confirmation',
    variables: ['sender_name', 'contact_subject', 'message_body', 'inquiry_type', 'submitted_at', 'support_email', 'asset_url', 'website_url', 'logo_url', 'site_name', 'site_url', 'current_year'],
    body: buildEmailShell({
      body: `
        <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello {{sender_name}},</p>
        <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.7;">
          Thank you for contacting HTG Infotech. This is a confirmation that your message has been received and shared with our team.
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
  },
];

export const replaceTemplatePlaceholders = (
  template: string,
  variables: Record<string, string>,
) =>
  template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => variables[key] ?? '');

const normalizePublicAssetPath = (value: string) =>
  value.replace(/(https?:\/\/[^/]+)\/public\/(htginfotech-logo\.png|htgemail-logo\.png|htgsvglogo\.svg)/gi, '$1/$2');

export const normalizeEmailMarkup = (value: string) =>
  normalizePublicAssetPath(
    value
    .replace(/<wbr\b[^>]*>/gi, '')
    .replace(/<\/wbr>/gi, '')
    .replace(/&lt;\s*\/?\s*wbr\s*&gt;/gi, '')
    .replace(/&#8203;|&#x200b;|&ZeroWidthSpace;/gi, '')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
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
        const needsSemicolon = styleValue.trim() !== '' && !styleValue.trim().endsWith(';');
        const withRadius = /border-radius\s*:/i.test(styleValue)
          ? styleValue.replace(/border-radius\s*:\s*[^;"]+;?/gi, 'border-radius:999px;')
          : `${styleValue}${needsSemicolon ? ';' : ''}border-radius:999px;`;
        return `<a${beforeStyle}style="${withRadius}"${afterStyle}>Verify Email</a>`;
      },
    )
    .replace(
      /<a\b([^>]*?)style="([^"]*?)"([^>]*)>\s*Browse Courses\s*<\/a>/gi,
      (_match, beforeStyle: string, styleValue: string, afterStyle: string) => {
        const needsSemicolon = styleValue.trim() !== '' && !styleValue.trim().endsWith(';');
        const withRadius = /border-radius\s*:/i.test(styleValue)
          ? styleValue.replace(/border-radius\s*:\s*[^;"]+;?/gi, 'border-radius:999px;')
          : `${styleValue}${needsSemicolon ? ';' : ''}border-radius:999px;`;
        return `<a${beforeStyle}style="${withRadius}"${afterStyle}>Browse Courses</a>`;
      },
    )
    .replace(
      /<a\b([^>]*?)style="([^"]*?)"([^>]*)>\s*(Reset Password|Reset Password Link)\s*<\/a>/gi,
      (_match, beforeStyle: string, styleValue: string, afterStyle: string, label: string) => {
        const needsSemicolon = styleValue.trim() !== '' && !styleValue.trim().endsWith(';');
        const withRadius = /border-radius\s*:/i.test(styleValue)
          ? styleValue.replace(/border-radius\s*:\s*[^;"]+;?/gi, 'border-radius:999px;')
          : `${styleValue}${needsSemicolon ? ';' : ''}border-radius:999px;`;
        const linkMarkup = /href\s*=/i.test(`${beforeStyle}${afterStyle}`)
          ? `<a${beforeStyle}style="${withRadius}"${afterStyle}>${label}</a>`
          : `<a href="{{reset_link}}"${beforeStyle}style="${withRadius}"${afterStyle}>${label}</a>`;
        return linkMarkup;
      },
    )
    .replace(
      /<a\b([^>]*?)href=(['"])\s*\2([^>]*?)style="([^"]*?)"([^>]*)>\s*(Reset Password|Reset Password Link)\s*<\/a>/gi,
      (_match, beforeHref: string, _quote: string, afterHref: string, styleValue: string, afterStyle: string, label: string) => {
        const needsSemicolon = styleValue.trim() !== '' && !styleValue.trim().endsWith(';');
        const withRadius = /border-radius\s*:/i.test(styleValue)
          ? styleValue.replace(/border-radius\s*:\s*[^;"]+;?/gi, 'border-radius:999px;')
          : `${styleValue}${needsSemicolon ? ';' : ''}border-radius:999px;`;
        return `<a${beforeHref}href="{{reset_link}}"${afterHref}style="${withRadius}"${afterStyle}>${label}</a>`;
      },
    )
    .replace(
      /<p\b[^>]*>\s*If you did not create this account, you can safely ignore this email\.\s*<\/p>/gi,
      '<p style="margin:0 0 10px;color:#111827;font-size:15px;font-weight:600;">If the button above is not clickable, please copy the following URL and paste it into your browser.</p><p style="margin:0 0 20px;word-break:break-word;"><a href="{{verification_link}}" style="color:#4f46e5;text-decoration:none;font-size:14px;line-height:1.7;">{{verification_link}}</a></p>',
    )
    .replace(
      /<p\b[^>]*>\s*[^<]*Welcome Message\s*<\/p>/gi,
      '',
    )
    .replace(/>\s+</g, '><')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
  );

export const stripWordBreakTags = (value: string) =>
  normalizeEmailMarkup(value);

export const getDefaultEmailTemplate = (name: 'verification_email' | 'welcome_email' | 'contact_admin_email' | 'contact_confirmation_email' | 'password_reset') =>
  emailTemplateDefaults.find((template) => template.name === name);
