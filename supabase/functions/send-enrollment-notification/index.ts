import { createClient } from "npm:@supabase/supabase-js@2.54.0";
import { buildBranding, loadSystemSettings } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { enrollmentId, learnerEmail, learnerName, courseName } = await req.json();

    console.log("Processing enrollment notification:", { enrollmentId, learnerEmail, courseName });

    if (!enrollmentId || !learnerEmail || !courseName) {
      throw new Error("Missing required fields");
    }

    const notificationTitle = "New Course Enrollment";
    const notificationMessage = `${learnerName || learnerEmail} has enrolled in ${courseName}. Please assign a tutor.`;

    await supabase.rpc("create_admin_notification", {
      p_type: "enrollment",
      p_title: notificationTitle,
      p_message: notificationMessage,
      p_reference_id: enrollmentId,
      p_reference_type: "enrollment",
    });

    console.log("Admin notifications created successfully");

    const { data: smtpSettings } = await supabase
      .from("tbl_smtp_settings")
      .select("*")
      .single();

    if (smtpSettings && smtpSettings.tss_is_enabled) {
      const { data: admins } = await supabase
        .from("tbl_users")
        .select(`
          tu_email,
          tbl_user_profiles (
            tup_first_name
          )
        `)
        .eq("tu_user_type", "admin")
        .eq("tu_is_active", true);

      if (admins && admins.length > 0) {
        console.log(`Sending emails to ${admins.length} admin(s)`);

        const emailPromises = admins.map(async (admin: any) => {
          const adminName = admin.tbl_user_profiles?.[0]?.tup_first_name || "Admin";
          const systemSettings = await loadSystemSettings(supabase);
          const branding = buildBranding(systemSettings, { request: req });
          const emailBody = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>New Course Enrollment</title>
            </head>
            <body style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;">
              <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td align="center">
                    <table role="presentation" style="width:100%;max-width:720px;margin:0 auto;border-collapse:collapse;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                      <tr>
                        <td align="center" style="background:#4f46e5;color:#ffffff;padding:20px">
                          <img
                            src="${branding.logoUrl}"
                            alt="Logo"
                            width="120"
                            style="display:block;margin:0 auto 10px auto;"
                          />
                          <h2 style="margin:0;font-size:22px;color:#ffffff;font-family:Arial,sans-serif;">
                            Verify Your Email
                          </h2>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:24px;">
                          <p style="margin:0 0 16px;color:#111827;font-size:18px;line-height:1.7;">Hello ${adminName},</p>
                          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.7;">A new learner has enrolled in a course:</p>
                          <ul style="margin:0 0 16px;padding-left:20px;color:#374151;font-size:15px;line-height:1.8;">
                            <li><strong>Learner:</strong> ${learnerName || learnerEmail}</li>
                            <li><strong>Course:</strong> ${courseName}</li>
                          </ul>
                          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.7;">Please log in to the admin dashboard to assign a tutor to this learner.</p>
                          <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">Best regards,<br>HTG Infotech Platform</p>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:15px;background:#f0f0f0;font-size:12px;color:#777777;font-family:Arial,sans-serif">
                          <p style="margin:0 0 8px 0">HTG Infotech</p>
                          <p style="margin:0 0 8px 0">
                            <a
                              href="${branding.siteUrl}"
                              style="color:#4f46e5;text-decoration:none"
                              target="_blank"
                            >
                              Visit Website
                            </a>
                          </p>
                          <p style="margin:0">© 2026 HTG Infotech</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;

          try {
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
              },
              body: JSON.stringify({
                from: smtpSettings.tss_sender_email || "noreply@htginfotech.com",
                to: admin.tu_email,
                subject: notificationTitle,
                html: emailBody,
              }),
            });

            if (!response.ok) {
              console.error(`Failed to send email to ${admin.tu_email}:`, await response.text());
            } else {
              console.log(`Email sent successfully to ${admin.tu_email}`);
            }
          } catch (error) {
            console.error(`Error sending email to ${admin.tu_email}:`, error);
          }
        });

        await Promise.all(emailPromises);
      }
    } else {
      console.log("SMTP not configured, skipping email notifications");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications sent successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error sending enrollment notification:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send notification",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
