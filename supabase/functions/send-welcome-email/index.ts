import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  email: string;
  firstName: string;
  lastName: string;
  userType: 'learner' | 'tutor';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, firstName, lastName, userType }: RequestPayload = await req.json();

    if (!email || !firstName || !userType) {
      throw new Error('Missing required fields: email, firstName, or userType');
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const siteUrl = Deno.env.get('SITE_URL') || 'https://htginfotech.com';
    const logoUrl = `${siteUrl}/logo.png`;

    let subject = '';
    let htmlContent = '';

    if (userType === 'learner') {
      subject = 'Welcome to HTG Infotech - Start Your Learning Journey!';
      htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to HTG Infotech</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header with Logo -->
                  <tr>
                    <td align="center" style="padding: 40px 30px; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); border-radius: 8px 8px 0 0;">
                      <img src="${logoUrl}" alt="HTG Infotech Logo" style="width: 150px; height: auto; margin-bottom: 20px;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Welcome to HTG Infotech!</h1>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Hello ${fullName},</h2>
                      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                        We're thrilled to have you join our learning community! Your account has been successfully created, and you're now ready to embark on an exciting educational journey.
                      </p>

                      <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
                        <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">What's Next?</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.8;">
                          <li>Browse our extensive course catalog</li>
                          <li>Connect with expert tutors</li>
                          <li>Join live sessions and workshops</li>
                          <li>Track your learning progress</li>
                          <li>Earn certificates upon completion</li>
                        </ul>
                      </div>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${siteUrl}/courses" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Browse Courses</a>
                      </div>

                      <p style="margin: 30px 0 0 0; color: #475569; font-size: 15px; line-height: 1.6;">
                        If you have any questions or need assistance, our support team is here to help. Feel free to reach out anytime!
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
    } else {
      subject = 'Welcome to HTG Infotech - Start Teaching Today!';
      htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to HTG Infotech</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header with Logo -->
                  <tr>
                    <td align="center" style="padding: 40px 30px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
                      <img src="${logoUrl}" alt="HTG Infotech Logo" style="width: 150px; height: auto; margin-bottom: 20px;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Welcome to HTG Infotech!</h1>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Hello ${fullName},</h2>
                      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                        Congratulations on joining HTG Infotech as a tutor! We're excited to have you as part of our teaching community. Your expertise will help shape the future of countless learners.
                      </p>

                      <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
                        <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">Getting Started as a Tutor</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.8;">
                          <li>Complete your tutor profile</li>
                          <li>Create your first course</li>
                          <li>Upload course materials and videos</li>
                          <li>Set your teaching schedule</li>
                          <li>Connect with eager learners</li>
                        </ul>
                      </div>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${siteUrl}/tutor/dashboard" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Go to Dashboard</a>
                      </div>

                      <p style="margin: 30px 0 0 0; color: #475569; font-size: 15px; line-height: 1.6;">
                        Our team is here to support you every step of the way. If you need any assistance or have questions about getting started, don't hesitate to reach out!
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px; background-color: #f8fafc; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                        Thank you for choosing to teach with us!<br>
                        <strong style="color: #1e293b;">The HTG Infotech Team</strong>
                      </p>
                      <div style="margin: 20px 0;">
                        <a href="${siteUrl}" style="color: #10b981; text-decoration: none; margin: 0 10px; font-size: 14px;">Visit Website</a>
                        <span style="color: #cbd5e1;">|</span>
                        <a href="${siteUrl}/contact" style="color: #10b981; text-decoration: none; margin: 0 10px; font-size: 14px;">Contact Us</a>
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
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'HTG Infotech <noreply@htginfotech.com>',
        to: [email],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Welcome email sent successfully',
        data: result,
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
    console.error('Error sending welcome email:', error);
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
