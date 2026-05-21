import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.54.0";
import {
  buildBranding,
  buildPaymentSuccessEmailContent,
  extractUserProfile,
  loadSystemSettings,
  sendSmtpEmail,
} from "../_shared/email.ts";

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

    const profile = extractUserProfile((learner as any).tbl_user_profiles);
    const firstName = profile?.tup_first_name || '';
    const lastName = profile?.tup_last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Learner';
    const email = (learner as any).tu_email;
    const mobile = (learner as any).tu_mobile;

    const { data: payment } = await supabase
      .from("tbl_payments")
      .select("tp_id, tp_amount, tp_currency, tp_receipt_url")
      .eq("tp_id", paymentId)
      .maybeSingle();

    const systemSettings = await loadSystemSettings(supabase);
    const branding = buildBranding(systemSettings, { request: req });
    const siteUrl = branding.siteUrl;
    const dashboardUrl = `${siteUrl}/learner/dashboard`;
    const courseDuration = course.tc_duration_hours
      ? `${course.tc_duration_hours} hours`
      : 'N/A';

    // Send Email
    if (email) {
      try {
        const emailContent = await buildPaymentSuccessEmailContent({
          supabase,
          firstName,
          lastName,
          courseTitle: course.tc_title,
          courseDuration,
          amount: String(payment?.tp_amount ?? amount),
          currency: String(payment?.tp_currency || "usd"),
          paymentId,
          receiptUrl: payment?.tp_receipt_url || "",
          dashboardUrl,
          branding,
        });

        await sendSmtpEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
          siteName: branding.siteName,
          settings: systemSettings,
        });

        console.log('Payment success email sent to:', email);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    // Send SMS
    if (mobile) {
      const smsMessage = `Payment Successful! You now have access to "${course.tc_title}". Amount paid: $${parseFloat(amount).toFixed(2)}. Start learning now at ${dashboardUrl}. - HTG Infotech`;

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
