import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
  buildBranding,
  buildWelcomeEmailHtml,
  loadSystemSettings,
  sendSmtpEmail,
} from "../_shared/email.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyOTPRequest {
  user_id: string;
  otp_code: string;
  otp_type: 'email' | 'mobile';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, otp_code, otp_type }: VerifyOTPRequest = await req.json()

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Verifying OTP:', { user_id, otp_type, otp_code })

    // Find the OTP record using correct table and column names
    const { data: otpRecord, error: findError } = await supabase
      .from('tbl_otp_verifications')
      .select('*')
      .eq('tov_user_id', user_id)
      .eq('tov_otp_code', otp_code)
      .eq('tov_otp_type', otp_type)
      .eq('tov_is_verified', false)
      .gte('tov_expires_at', new Date().toISOString())
      .order('tov_created_at', { ascending: false })
      .limit(1)
      .single()

    if (findError || !otpRecord) {
      console.error('OTP not found or expired:', findError)
      
      // Increment attempts for security
      await supabase
        .from('tbl_otp_verifications')
        .update({ tov_attempts: (otpRecord.tov_attempts || 0) + 1 })
        .eq('tov_user_id', user_id)
        .eq('tov_otp_type', otp_type)
        .eq('tov_is_verified', false)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid or expired OTP. Please request a new code.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Check attempts limit (max 5 attempts)
    if (otpRecord.tov_attempts >= 5) {
      console.error('Too many attempts for OTP:', otpRecord.tov_id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many failed attempts. Please request a new OTP.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      )
    }

    console.log('✅ Valid OTP found, marking as verified')

    // Mark OTP as verified
    const { error: updateOTPError } = await supabase
      .from('tbl_otp_verifications')
      .update({ tov_is_verified: true })
      .eq('tov_id', otpRecord.tov_id)

    if (updateOTPError) {
      console.error('Failed to update OTP status:', updateOTPError)
      throw updateOTPError
    }

    // Update user verification status using correct table and column names
    const updateData: any = {}
    if (otp_type === 'email') {
      updateData.tu_email_verified = true
    } else if (otp_type === 'mobile') {
      updateData.tu_mobile_verified = true
      // Also mark user as fully verified when mobile is verified
      updateData.tu_is_verified = true
    }

    const { error: updateUserError } = await supabase
      .from('tbl_users')
      .update(updateData)
      .eq('tu_id', user_id)

    if (updateUserError) {
      console.warn('Failed to update user verification status:', updateUserError)
      // Don't throw error here as OTP is already verified
    } else {
      console.log('✅ User verification status updated')
    }

    // Send welcome email if this was mobile verification (final step)
    if (otp_type === 'mobile') {
      try {
        await sendWelcomeEmail(user_id, supabase)
      } catch (emailError) {
        console.warn('Failed to send welcome email:', emailError)
        // Don't fail the verification if welcome email fails
      }
    }

    console.log('🎉 OTP verification completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${otp_type} verified successfully`,
        verification_complete: otp_type === 'mobile'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error verifying OTP:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Verification failed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function sendWelcomeEmail(userId: string, supabase: any) {
  try {
    console.log('📧 Sending welcome email for user:', userId)

    const { data: userData } = await supabase
      .from('tbl_users')
      .select(`
        tu_email,
        tu_user_type,
        tbl_user_profiles (
          tup_first_name,
          tup_last_name
        )
      `)
      .eq('tu_id', userId)
      .single()

    if (!userData) {
      console.warn('User data not found for welcome email')
      return
    }

    const settingsMap = await loadSystemSettings(supabase)
    const branding = buildBranding(settingsMap)

    await sendSmtpEmail({
      to: userData.tu_email,
      subject: `Welcome to ${branding.siteName}!`,
      html: buildWelcomeEmailHtml({
        email: userData.tu_email,
        firstName: userData.tbl_user_profiles?.tup_first_name || 'User',
        lastName: userData.tbl_user_profiles?.tup_last_name || '',
        userType: userData.tu_user_type || 'learner',
        branding,
      }),
      siteName: branding.siteName,
    })

    console.log('✅ Welcome email sent successfully')

  } catch (error) {
    console.error('❌ Failed to send welcome email:', error)
    throw error
  }
}
