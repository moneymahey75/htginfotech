# Email Configuration Guide

This guide explains how to configure email confirmation and welcome emails for your HTG Infotech platform.

## Overview

The platform now has two types of emails configured:

1. **Email Confirmation** - Sent automatically by Supabase when users register
2. **Welcome Email** - Sent automatically after users confirm their email

## What's Already Implemented

### 1. Email Confirmation Flow
- Users receive a confirmation email when they register
- After clicking the confirmation link, they are redirected to the login page
- A welcome email is automatically sent after confirmation

### 2. Welcome Email Edge Function
- Edge function created: `send-welcome-email`
- Sends beautiful HTML emails with HTG Infotech branding
- Different templates for learners and tutors
- Located at: `supabase/functions/send-welcome-email/index.ts`

### 3. Updated Components
- **AuthContext**: Now enables email confirmation during registration
- **AuthCallback**: Handles email confirmation and sends welcome email
- **Registration Pages**: Updated to redirect to login after registration

## Required Configuration Steps

### Step 1: Deploy the Welcome Email Edge Function

The edge function needs to be deployed to your Supabase project. Run this command:

```bash
npx supabase functions deploy send-welcome-email --no-verify-jwt
```

### Step 2: Configure Supabase Email Templates

You need to customize the email confirmation template in your Supabase Dashboard:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** > **Email Templates**
4. Click on **Confirm signup** template
5. Customize the email template with the following HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 30px; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); border-radius: 8px 8px 0 0;">
              <img src="{{ .SiteURL }}/logo.png" alt="HTG Infotech Logo" style="width: 150px; height: auto; margin-bottom: 20px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Confirm Your Email</h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Welcome to HTG Infotech!</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Thank you for registering with HTG Infotech. To complete your registration and activate your account, please confirm your email address by clicking the button below.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Confirm Email Address</a>
              </div>

              <p style="margin: 30px 0 0 0; color: #475569; font-size: 15px; line-height: 1.6;">
                If you did not create an account with HTG Infotech, you can safely ignore this email.
              </p>

              <div style="margin: 30px 0; padding: 20px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                  <strong style="color: #1e293b;">Note:</strong> This link will expire in 24 hours. If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="margin: 10px 0 0 0; word-break: break-all;">
                  <a href="{{ .ConfirmationURL }}" style="color: #3b82f6; text-decoration: none; font-size: 13px;">{{ .ConfirmationURL }}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8fafc; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                <strong style="color: #1e293b;">The HTG Infotech Team</strong>
              </p>
              <div style="margin: 20px 0;">
                <a href="{{ .SiteURL }}" style="color: #3b82f6; text-decoration: none; margin: 0 10px; font-size: 14px;">Visit Website</a>
                <span style="color: #cbd5e1;">|</span>
                <a href="{{ .SiteURL }}/contact" style="color: #3b82f6; text-decoration: none; margin: 0 10px; font-size: 14px;">Contact Us</a>
              </div>
              <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px;">
                © 2024 HTG Infotech. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

6. Click **Save**

### Step 3: Enable Email Confirmation

1. In Supabase Dashboard, go to **Authentication** > **Settings**
2. Under **Auth Providers**, find **Email**
3. Make sure **Enable email confirmations** is turned ON
4. Set the **Confirm email** redirect URL to: `https://your-domain.com/auth/callback?type=signup`
5. Click **Save**

### Step 4: Configure Email Provider (Optional but Recommended)

For production, you should configure a custom SMTP provider:

1. In Supabase Dashboard, go to **Project Settings** > **Auth**
2. Scroll to **SMTP Settings**
3. Enter your SMTP details (you can use services like SendGrid, AWS SES, etc.)
4. Test the configuration

### Step 5: Set up Resend API Key (for Welcome Emails)

The welcome email function uses Resend to send emails. You need to:

1. Sign up at https://resend.com
2. Get your API key
3. In Supabase Dashboard, go to **Edge Functions** > **Environment Variables**
4. Add: `RESEND_API_KEY` with your Resend API key
5. Add: `SITE_URL` with your website URL (e.g., `https://htginfotech.com`)

## Testing the Flow

1. **Register a new account** (learner or tutor)
2. **Check your email** for the confirmation email
3. **Click the confirmation link** in the email
4. You should be redirected to the login page
5. **Check your email again** for the welcome email
6. **Log in** with your credentials

## Email Flow Summary

```
User Registers
    ↓
Confirmation Email Sent (by Supabase)
    ↓
User Clicks Confirmation Link
    ↓
Email Confirmed
    ↓
Welcome Email Sent (by Edge Function)
    ↓
User Redirected to Login Page
    ↓
User Can Now Log In
```

## Troubleshooting

### Email Not Received
- Check spam/junk folder
- Verify SMTP settings in Supabase Dashboard
- Check Supabase logs for email errors

### Confirmation Link Not Working
- Ensure the redirect URL is correct in Auth settings
- Check that email confirmation is enabled
- Verify the link hasn't expired (24 hours)

### Welcome Email Not Sent
- Check that the edge function is deployed
- Verify RESEND_API_KEY is set
- Check edge function logs in Supabase Dashboard

## Important Notes

1. **Logo**: Make sure to add your HTG Infotech logo to `/public/logo.png`
2. **Branding**: Both email templates feature HTG Infotech branding and colors
3. **Mobile Responsive**: All email templates are mobile-responsive
4. **Security**: Email confirmation is now required for all new users
5. **User Experience**: After confirmation, users are automatically redirected to login

## Next Steps

After configuring emails, you may want to:
- Customize email templates further with your brand colors
- Add more email types (password reset, account updates, etc.)
- Set up email analytics to track delivery rates
- Configure email rate limiting to prevent abuse
