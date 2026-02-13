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
  enrollmentId: string;
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

    const { userId, courseId, enrollmentId }: RequestPayload = await req.json();

    if (!userId || !courseId || !enrollmentId) {
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
      .select("tc_title, tc_description")
      .eq("tc_id", courseId)
      .single();

    if (courseError || !course) {
      throw new Error('Course not found');
    }

    // Get enrollment details
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("tbl_course_enrollments")
      .select("tce_enrollment_date, tce_progress_percentage")
      .eq("tce_id", enrollmentId)
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error('Enrollment not found');
    }

    const profile = (learner as any).tbl_user_profiles?.[0];
    const firstName = profile?.tup_first_name || '';
    const lastName = profile?.tup_last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Learner';
    const email = (learner as any).tu_email;
    const mobile = (learner as any).tu_mobile;

    const siteUrl = Deno.env.get('SITE_URL') || 'https://htginfotech.com';
    const enrollmentDate = new Date(enrollment.tce_enrollment_date);
    const completionDate = new Date();
    const daysTaken = Math.ceil((completionDate.getTime() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24));

    // Send Email
    if (email) {
      const emailSubject = `Congratulations! You've Completed ${course.tc_title}`;
      const emailBody = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Course Completed</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding: 40px 30px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px 8px 0 0;">
                      <div style="width: 100px; height: 100px; background-color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <span style="font-size: 60px;">🎉</span>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Congratulations!</h1>
                      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px; opacity: 0.95;">You've Completed the Course</p>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Dear ${fullName},</h2>
                      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                        We're thrilled to announce that you have successfully completed <strong>${course.tc_title}</strong>! This is a significant achievement, and we couldn't be prouder of your dedication and hard work.
                      </p>

                      <!-- Achievement Card -->
                      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; padding: 30px; margin: 30px 0; border-radius: 12px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 15px;">🏆</div>
                        <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 22px;">Course Completed!</h3>
                        <p style="margin: 0; color: #78350f; font-size: 16px;">
                          <strong>${course.tc_title}</strong>
                        </p>
                        <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;">
                          Completed in ${daysTaken} day${daysTaken !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 4px;">
                        <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 18px;">What You've Achieved:</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 15px; line-height: 1.8;">
                          <li>Mastered all course materials and concepts</li>
                          <li>Completed ${enrollment.tce_progress_percentage}% of the course content</li>
                          <li>Gained valuable skills and knowledge</li>
                          <li>Demonstrated commitment to continuous learning</li>
                        </ul>
                      </div>

                      <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 25px; margin: 30px 0; border-radius: 8px; text-align: center;">
                        <p style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px; font-weight: bold;">
                          🎓 Your Certificate is Ready!
                        </p>
                        <p style="margin: 0; color: #1e40af; font-size: 14px;">
                          Download your certificate of completion from your dashboard
                        </p>
                      </div>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${siteUrl}/learner/dashboard" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Certificate</a>
                      </div>

                      <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
                        <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">Continue Your Learning Journey</h3>
                        <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.6;">
                          Don't stop here! Explore more courses to expand your skills and knowledge. Your next achievement is just a click away.
                        </p>
                      </div>

                      <p style="margin: 30px 0 0 0; color: #475569; font-size: 15px; line-height: 1.6;">
                        Thank you for choosing HTG Infotech for your learning journey. We're honored to have been part of your success!
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px; background-color: #f8fafc; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                        Keep Learning, Keep Growing!<br>
                        <strong style="color: #1e293b;">The HTG Infotech Team</strong>
                      </p>
                      <div style="margin: 20px 0;">
                        <a href="${siteUrl}/courses" style="color: #3b82f6; text-decoration: none; margin: 0 10px; font-size: 14px;">Browse More Courses</a>
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
          console.log('Course completion email sent to:', email);
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    // Send SMS
    if (mobile) {
      const smsMessage = `Congratulations ${firstName}! You've completed "${course.tc_title}". Your certificate is ready in your dashboard at ${siteUrl}. Keep learning! - HTG Infotech`;

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
          console.log('Course completion SMS sent to:', mobile);
        }
      } catch (smsError) {
        console.error('Error sending SMS:', smsError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Course completion notifications sent',
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
    console.error('Error sending course completion notification:', error);
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
