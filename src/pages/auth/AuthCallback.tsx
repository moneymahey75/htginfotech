import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../components/ui/NotificationProvider';
import { Shield, Loader } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const notification = useNotification();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (type === 'recovery' && token) {
          // This is a password reset callback
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });

          if (error) {
            throw error;
          }

          if (data.session) {
            // User is now authenticated, redirect to reset password page
            notification.showSuccess('Email Verified', 'You can now reset your password.');
            navigate('/reset-password');
          } else {
            throw new Error('Failed to verify reset token');
          }
        } else if (type === 'signup') {
          // This is an email confirmation callback
          console.log('📧 Processing email confirmation...');

          // Get the session after email confirmation
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            throw sessionError;
          }

          if (session?.user) {
            console.log('✅ Email confirmed for user:', session.user.id);

            // Get user metadata
            const firstName = session.user.user_metadata?.first_name || '';
            const lastName = session.user.user_metadata?.last_name || '';
            const userType = session.user.user_metadata?.user_type || 'learner';
            const mobile = session.user.user_metadata?.mobile || '';

            // Send welcome email
            try {
              const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    email: session.user.email,
                    firstName: firstName,
                    lastName: lastName,
                    userType: userType,
                  }),
                }
              );

              if (response.ok) {
                console.log('✅ Welcome email sent successfully');
              } else {
                console.warn('⚠️ Failed to send welcome email, but continuing...');
              }
            } catch (emailError) {
              console.warn('⚠️ Welcome email error:', emailError);
              // Don't throw - continue with redirect even if email fails
            }

            // Send registration SMS if mobile number is provided
            if (mobile) {
              try {
                const smsResponse = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-registration-sms`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      mobile: mobile,
                      firstName: firstName,
                      lastName: lastName,
                      userType: userType,
                    }),
                  }
                );

                if (smsResponse.ok) {
                  console.log('✅ Registration SMS sent successfully');
                } else {
                  console.warn('⚠️ Failed to send registration SMS, but continuing...');
                }
              } catch (smsError) {
                console.warn('⚠️ Registration SMS error:', smsError);
                // Don't throw - continue with redirect even if SMS fails
              }
            }

            // Sign out the user so they can log in properly
            await supabase.auth.signOut();

            // Show success message and redirect to login
            notification.showSuccess(
              'Email Confirmed!',
              'Your email has been verified successfully. Please log in to continue.'
            );

            // Redirect to login page after 2 seconds
            setTimeout(() => {
              navigate('/login');
            }, 2000);
          } else {
            throw new Error('Failed to verify email');
          }
        } else {
          // Handle other auth callbacks or redirect to home
          navigate('/');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setError(error.message || 'Authentication failed');

        const type = searchParams.get('type');
        if (type === 'signup') {
          notification.showError(
            'Verification Failed',
            'The confirmation link is invalid or has expired. Please try registering again.'
          );
          setTimeout(() => {
            navigate('/register');
          }, 3000);
        } else {
          notification.showError('Authentication Failed', 'The reset link is invalid or has expired.');
          setTimeout(() => {
            navigate('/forgot-password');
          }, 3000);
        }
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, notification]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader className="h-8 w-8 text-indigo-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verifying...</h2>
            <p className="text-gray-600">Please wait while we verify your reset link.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">You will be redirected to the forgot password page shortly.</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;