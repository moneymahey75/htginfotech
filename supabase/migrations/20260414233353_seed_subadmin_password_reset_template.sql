INSERT INTO public.tbl_email_templates (
  tet_name,
  tet_subject,
  tet_body,
  tet_template_type,
  tet_variables,
  tet_is_active,
  tet_updated_at
)
VALUES (
  'sub_admin_password_reset',
  'Reset your admin password - HTG Infotech',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Admin Password</title>
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
                Reset Your Admin Password
              </h2>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
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
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:15px;background:#f0f0f0;font-size:12px;color:#777777;font-family:Arial,sans-serif">
              <p style="margin:0 0 8px 0">HTG Infotech</p>
              <p style="margin:0 0 8px 0">
                <a
                  href="https://htginfotech.com"
                  style="color:#4f46e5;text-decoration:none"
                  target="_blank"
                >
                  Visit Website
                </a>
              </p>
              <p style="margin:0">© {{current_year}} HTG Infotech</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'sub_admin_password_reset',
  '["user_name", "first_name", "reset_link", "reset_password_link", "asset_url", "logo_url", "site_name", "site_url", "current_year"]'::jsonb,
  true,
  now()
)
ON CONFLICT (tet_name) DO UPDATE
SET
  tet_subject = EXCLUDED.tet_subject,
  tet_body = EXCLUDED.tet_body,
  tet_template_type = EXCLUDED.tet_template_type,
  tet_variables = EXCLUDED.tet_variables,
  tet_is_active = true,
  tet_updated_at = now();
