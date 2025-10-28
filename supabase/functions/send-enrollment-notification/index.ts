import { createClient } from "npm:@supabase/supabase-js@2.54.0";

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
          const emailBody = `
            <h2>New Course Enrollment</h2>
            <p>Hello ${adminName},</p>
            <p>A new learner has enrolled in a course:</p>
            <ul>
              <li><strong>Learner:</strong> ${learnerName || learnerEmail}</li>
              <li><strong>Course:</strong> ${courseName}</li>
            </ul>
            <p>Please log in to the admin dashboard to assign a tutor to this learner.</p>
            <p>Best regards,<br>HTG Infotech Platform</p>
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
