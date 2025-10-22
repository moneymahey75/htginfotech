import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, LogIn, AlertCircle, RefreshCw } from 'lucide-react';
import ReCaptcha from '../../components/ui/ReCaptcha';

const UnifiedLogin: React.FC = () => {
  const { login, resendConfirmationEmail, user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showEmailConfirmationError, setShowEmailConfirmationError] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // Redirect if user is already logged in (but not during the login process)
  React.useEffect(() => {
    if (user && !isSubmitting && !justLoggedIn) {
      console.log('ℹ️ User already logged in, redirecting...');
      switch (user.userType) {
        case 'learner':
          navigate('/learner/dashboard', { replace: true });
          break;
        case 'tutor':
          navigate('/tutor/dashboard', { replace: true });
          break;
        case 'job_seeker':
          navigate('/job-seeker/dashboard', { replace: true });
          break;
        case 'job_provider':
          navigate('/job-provider/dashboard', { replace: true });
          break;
        case 'admin':
          navigate('/admin/dashboard', { replace: true });
          break;
        default:
          navigate('/', { replace: true });
      }
    }
  }, [user, isSubmitting, justLoggedIn, navigate]);

  // Navigate to appropriate dashboard when user logs in
  React.useEffect(() => {
    if (user && justLoggedIn) {
      console.log('✅ User logged in, navigating to dashboard:', user.userType);

      // Small delay to ensure state is fully updated
      const timer = setTimeout(() => {
        switch (user.userType) {
          case 'learner':
            navigate('/learner/dashboard', { replace: true });
            break;
          case 'tutor':
            navigate('/tutor/dashboard', { replace: true });
            break;
          case 'job_seeker':
            navigate('/job-seeker/dashboard', { replace: true });
            break;
          case 'job_provider':
            navigate('/job-provider/dashboard', { replace: true });
            break;
          case 'admin':
            navigate('/admin/dashboard', { replace: true });
            break;
          default:
            navigate('/', { replace: true });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [user, justLoggedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowEmailConfirmationError(false);
    setIsSubmitting(true);
    setJustLoggedIn(false);

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification');
      setIsSubmitting(false);
      return;
    }

    try {
      await login(formData.emailOrUsername, formData.password, 'any');
      // Set flag to trigger navigation in useEffect
      console.log('🎉 Login successful, setting justLoggedIn flag...');
      setJustLoggedIn(true);
    } catch (err: any) {
      // Check if it's the email confirmation error
      if (err.message === 'EMAIL_NOT_CONFIRMED') {
        setShowEmailConfirmationError(true);
        setUnconfirmedEmail(err.email || formData.emailOrUsername);
        setError('Your email address has not been confirmed yet. Please check your inbox for the confirmation link.');
      } else {
        // Other errors are handled by notification system
        setError(err.message || 'Login failed. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    setIsResendingEmail(true);
    try {
      await resendConfirmationEmail(unconfirmedEmail);
      setError(''); // Clear the error message on success
    } catch (err) {
      // Error is handled by the notification system
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <div className="text-center mb-8">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="h-8 w-8 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
              <p className="mt-2 text-gray-600">Sign in to your account</p>
            </div>

            {error && (
                <div className={`mb-6 p-4 rounded-lg border ${
                    showEmailConfirmationError
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start">
                    <AlertCircle className={`h-5 w-5 mt-0.5 mr-3 flex-shrink-0 ${
                        showEmailConfirmationError ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm ${
                          showEmailConfirmationError ? 'text-yellow-800' : 'text-red-600'
                      }`}>
                        {error}
                      </p>
                      {showEmailConfirmationError && (
                          <button
                              type="button"
                              onClick={handleResendConfirmation}
                              disabled={isResendingEmail}
                              className="mt-3 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isResendingEmail ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                                  <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  <span>Resend Confirmation Email</span>
                                </>
                            )}
                          </button>
                      )}
                    </div>
                  </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                      id="emailOrUsername"
                      name="emailOrUsername"
                      type="text"
                      required
                      value={formData.emailOrUsername}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter email or username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter your password"
                  />
                  <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link
                    to="/forgot-password"
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Forgot your password?
                </Link>
              </div>

              <ReCaptcha onVerify={setRecaptchaToken} />

              <button
                  type="submit"
                  disabled={isSubmitting || !recaptchaToken}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Signing in...</span>
                    </>
                ) : (
                    <span>Sign In</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-indigo-600 hover:text-indigo-500 font-medium">
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
  );
};

export default UnifiedLogin;