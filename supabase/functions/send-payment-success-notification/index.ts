import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  userId: string;
  courseId: string;
  amount: string;
  paymentId: string;
}

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

    let payload: RequestPayload;
    try {
      payload = await req.json();
    } catch (jsonError) {
      throw new Error('Invalid JSON payload');
    }

    const { userId, courseId, amount, paymentId } = payload;

    if (!userId || !courseId || !amount || !paymentId) {
      throw new Error('Missing required fields');
    }

    // Get learner details
    const { data: learner, error: learnerError } = await supabase
      .from("tbl_users")
      .select(`
        tu_email,
        tu_mobile,
        tbl_user_profiles (
          tup_first_name,
          tup_last_name
        )
      `)
      .eq("tu_id", userId)
      .single();

    if (learnerError || !learner) {
      throw new Error('Learner not found');
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from("tbl_courses")
      .select("tc_title, tc_description, tc_duration_hours")
      .eq("tc_id", courseId)
      .single();

    if (courseError || !course) {
      throw new Error('Course not found');
    }

    const profile = (learner as any).tbl_user_profiles?.[0];
    const firstName = profile?.tup_first_name || '';
    const lastName = profile?.tup_last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Learner';
    const email = (learner as any).tu_email;
    const mobile = (learner as any).tu_mobile;

    const siteUrl = Deno.env.get('SITE_URL') || 'https://htginfotech.com';
    const courseDuration = course.tc_duration_hours
      ? `${course.tc_duration_hours} hours`
      : 'N/A';

    // Send Email
    if (email) {
      const emailSubject = `Payment Successful - ${course.tc_title}`;
      const emailBody = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Successful</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding: 40px 30px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
                      <div style="width: 80px; height: 80px; background-color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <span style="font-size: 48px;">✓</span>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Payment Successful!</h1>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Hello ${fullName},</h2>
                      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                        Your payment has been processed successfully! You now have full access to the course.
                      </p>

                      <!-- Course Details Card -->
                      <div style="background: linear-gradient(135deg, #f8fafc 0%, #e8f2ff 100%); border: 2px solid #3b82f6; padding: 30px; margin: 30px 0; border-radius: 12px;">
                        <h3 style="margin: 0 0 20px 0; color: #1e293b; font-size: 20px;">Course Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Course Name:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-weight: bold; text-align: right;">${course.tc_title}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Duration:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-weight: bold; text-align: right;">${courseDuration}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount Paid:</td>
                            <td style="padding: 8px 0; color: #10b981; font-weight: bold; font-size: 18px; text-align: right;">$${parseFloat(amount).toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Payment ID:</td>
                            <td style="padding: 8px 0; color: #1e293b; font-size: 12px; text-align: right;">${paymentId}</td>
                          </tr>
                        </table>
                      </div>

                      <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
                        <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">What's Next?</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.8;">
                          <li>Access your course materials anytime</li>
                          <li>Watch video lessons at your own pace</li>
                          <li>Complete assignments and quizzes</li>
                          <li>Track your learning progress</li>
                          <li>Earn your certificate upon completion</li>
                        </ul>
                      </div>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${siteUrl}/learner/dashboard" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Start Learning Now</a>
                      </div>

                      <p style="margin: 30px 0 0 0; color: #475569; font-size: 15px; line-height: 1.6;">
                        If you have any questions about your course or need assistance, our support team is here to help!
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px; background-color: #f8fafc; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                        Happy Learning!<br>
                        <strong style="color: #1e293b;">The HTG Infotech Team</strong>
                      </p>
                      <div style="margin: 20px 0;">
                        <a href="${siteUrl}" style="color: #3b82f6; text-decoration: none; margin: 0 10px; font-size: 14px;">Visit Website</a>
                        <span style="color: #cbd5e1;">|</span>
                        <a href="${siteUrl}/contact" style="color: #3b82f6; text-decoration: none; margin: 0 10px; font-size: 14px;">Contact Us</a>
                      </div>
                      <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px;">
                        © ${new Date().getFullYear()} HTG Infotech. All rights reserved.
                      </p>
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
        const resendUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/resend`;
        const emailResponse = await fetch(resendUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'HTG Infotech <noreply@htginfotech.com>',
            to: [email],
            subject: emailSubject,
            html: emailBody,
          }),
        });

        if (emailResponse.ok) {
          console.log('Payment success email sent to:', email);
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    // Send SMS
    if (mobile) {
      const smsMessage = `Payment Successful! You now have access to "${course.tc_title}". Amount paid: $${parseFloat(amount).toFixed(2)}. Start learning now at ${siteUrl}. - HTG Infotech`;

      try {
        const twilioUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio`;
        const smsResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: mobile,
            body: smsMessage,
          }),
        });

        if (smsResponse.ok) {
          console.log('Payment success SMS sent to:', mobile);
        }
      } catch (smsError) {
        console.error('Error sending SMS:', smsError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment success notifications sent',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending payment success notification:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
