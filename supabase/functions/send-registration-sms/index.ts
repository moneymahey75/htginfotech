import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  mobile: string;
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
    const { mobile, firstName, lastName, userType }: RequestPayload = await req.json();

    if (!mobile || !firstName || !userType) {
      throw new Error('Missing required fields: mobile, firstName, or userType');
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const siteUrl = Deno.env.get('SITE_URL') || 'HTG Infotech';

    let message = '';

    if (userType === 'learner') {
      message = `Welcome to ${siteUrl}, ${fullName}! Your learner account has been successfully created. Start your learning journey today by browsing our courses. Happy Learning!`;
    } else {
      message = `Welcome to ${siteUrl}, ${fullName}! Your tutor account has been successfully created. You can now create courses and share your expertise with learners. Thank you for joining us!`;
    }

    // Send SMS via Twilio edge function
    const twilioUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio`;
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: mobile,
        body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send SMS:', error);
      throw new Error(`Failed to send SMS: ${error}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Registration SMS sent successfully',
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
    console.error('Error sending registration SMS:', error);
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
