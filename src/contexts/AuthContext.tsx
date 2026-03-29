import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, sendOTP, verifyOTP as verifyOTPAPI, sessionManager, logUserActivity } from '../lib/supabase';
import { useNotification } from '../components/ui/NotificationProvider';
import { sessionUtils } from '../utils/sessionUtils';
import { buildAbsoluteUrl, getBaseUrl } from '../utils/baseUrl';
import { withTimeout } from '../utils/loadingRecovery';

const INVALID_LOGIN_MESSAGE = 'Invalid email/username or password';
const UNVERIFIED_ACCOUNT_MESSAGE = 'Your account is not verified. Please verify your email to continue.';
const AUTH_REQUEST_TIMEOUT_MS = 10000;

const isEmailIdentifier = (value: string) => value.includes('@');

const resolveLoginIdentifier = async (loginIdentifier: string) => {
  const normalizedIdentifier = loginIdentifier.trim();

  if (!normalizedIdentifier) {
    throw new Error(INVALID_LOGIN_MESSAGE);
  }

  if (isEmailIdentifier(normalizedIdentifier)) {
    return {
      email: normalizedIdentifier,
      userId: undefined
    };
  }

  const { data: resolvedLogin, error: resolveError } = await supabase
    .rpc('resolve_login_identifier', { p_login_identifier: normalizedIdentifier });

  if (resolveError) {
    console.error('❌ Failed to resolve login identifier:', resolveError);
    throw new Error(INVALID_LOGIN_MESSAGE);
  }

  if (!resolvedLogin?.success || !resolvedLogin?.email) {
    throw new Error(INVALID_LOGIN_MESSAGE);
  }

  return {
    email: resolvedLogin.email,
    userId: resolvedLogin.user_id as string | undefined
  };
};

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType: 'learner' | 'tutor' | 'job_seeker' | 'job_provider' | 'admin';
  educationLevel?: string;
  interests?: string[];
  isVerified: boolean;
  hasActivePlan: boolean;
  mobileVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (emailOrUsername: string, password: string, userType: string) => Promise<void>;
  register: (userData: any, userType: string) => Promise<string>;
  resendVerificationEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  sendOTPToUser: (userId: string, contactInfo: string, otpType: 'email' | 'mobile') => Promise<any>;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const notification = useNotification();

  useEffect(() => {
    // Initialize session from localStorage
    const initializeSession = async () => {
      if (isInitialized) return; // Prevent multiple initializations

      setLoading(true);
      try {
        console.log('🔍 Initializing authentication...');

        // First, check if there's an existing Supabase session
        const { data: { session: existingSession } } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_REQUEST_TIMEOUT_MS,
          'Authentication initialization timed out'
        );

        if (existingSession?.user) {
          console.log('✅ Found existing Supabase session:', existingSession.user.id);
          // Save to localStorage if not already saved
          sessionManager.saveSession(existingSession);
          await withTimeout(
            fetchUserData(existingSession.user.id),
            AUTH_REQUEST_TIMEOUT_MS,
            'Fetching user session timed out'
          );
        } else {
          // Try to restore from localStorage
          console.log('🔍 Checking localStorage for saved session...');
          const restoredSession = await withTimeout(
            sessionManager.restoreSession(),
            AUTH_REQUEST_TIMEOUT_MS,
            'Session restoration timed out'
          );

          if (restoredSession?.user) {
            console.log('✅ Session restored from localStorage:', restoredSession.user.id);
            await withTimeout(
              fetchUserData(restoredSession.user.id),
              AUTH_REQUEST_TIMEOUT_MS,
              'Fetching restored session timed out'
            );
          } else {
            console.log('ℹ️ No existing session found');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('❌ Failed to initialize session:', error);
        // Clear any corrupted session data
        sessionManager.removeSession();
        setUser(null);
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initializeSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isInitialized) return; // Don't process auth changes until initialized

      console.log('🔄 Auth state change:', event, session?.user?.id);

      try {
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in, saving session');
          sessionManager.saveSession(session);
          await fetchUserData(session.user.id);
        } else if (event === 'SIGNED_OUT' || !session) {
          console.log('👋 User signed out, clearing session');
          const currentUserId = user?.id;
          sessionManager.removeSession(currentUserId);
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('🔄 Token refreshed, updating session');
          sessionManager.saveSession(session);
          // Optionally refresh user data if needed
          if (!user || user.id !== session.user.id) {
            await fetchUserData(session.user.id);
          }
        }
      } catch (error) {
        console.error('❌ Error handling auth state change:', error);
        sessionManager.removeSession();
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isInitialized, user?.id]);

  const fetchUserData = async (userId: string) => {
    if (!userId) {
      console.warn('⚠️ No userId provided to fetchUserData');
      return;
    }

    try {
      console.log('🔍 Fetching user data for:', userId);

      // Check if user is still eligible to be logged in
      const { data: eligibilityResult } = await withTimeout(
        supabase.rpc('check_user_login_eligibility', { p_user_id: userId }),
        AUTH_REQUEST_TIMEOUT_MS,
        'Checking login eligibility timed out'
      );

      if (!eligibilityResult?.success) {
        console.log('❌ User no longer eligible, logging out:', eligibilityResult?.error);
        // Force logout if user is no longer eligible
        await supabase.auth.signOut();
        sessionManager.removeSession(userId);
        setUser(null);
        // notification.showError(
        //   'Account Access Revoked',
        //   eligibilityResult?.error || 'Your account access has been restricted.'
        // );
        return;
      }

      // Try to get user data, but handle RLS gracefully
      let userData = null;
      try {
        const { data: userDataArray, error: userError } = await withTimeout(
          supabase
            .from('tbl_users')
            .select('*')
            .eq('tu_id', userId),
          AUTH_REQUEST_TIMEOUT_MS,
          'Loading user record timed out'
        );

        if (userError) {
          console.log('⚠️ RLS blocking users table access:', userError.message);
        } else if (userDataArray && userDataArray.length > 0) {
          userData = userDataArray[0];
        }
      } catch (rlsError) {
        console.warn('RLS blocking users table:', rlsError);
      }

      // Try to get profile data
      let profileData = null;
      try {
        const { data: profileDataArray } = await withTimeout(
          supabase
            .from('tbl_user_profiles')
            .select('*')
            .eq('tup_user_id', userId),
          AUTH_REQUEST_TIMEOUT_MS,
          'Loading user profile timed out'
        );
        console.log('📋 Profile data retrieved:', profileDataArray?.length || 0, 'records');
        profileData = profileDataArray?.[0];
      } catch (profileRlsError) {
        console.warn('RLS blocking user_profiles table:', profileRlsError);
      }

      // Try to get company data if user is a company
      let tutorData = null;
      if (userData?.tu_user_type === 'tutor') {
        try {
          const { data: tutorDataArray } = await withTimeout(
            supabase
              .from('tbl_tutors')
              .select('*')
              .eq('tt_user_id', userId),
            AUTH_REQUEST_TIMEOUT_MS,
            'Loading tutor data timed out'
          );
          console.log('👨‍🏫 Tutor data retrieved:', tutorDataArray?.length || 0, 'records');
          tutorData = tutorDataArray?.[0];
        } catch (tutorRlsError) {
          console.warn('RLS blocking tutors table:', tutorRlsError);
        }
      }

      // Try to check for active subscription
      let subscriptionData = null;
      try {
        const { data: subscriptionDataArray } = await withTimeout(
          supabase
            .from('tbl_user_subscriptions')
            .select('*')
            .eq('tus_user_id', userId)
            .eq('tus_status', 'active')
            .gte('tus_end_date', new Date().toISOString()),
          AUTH_REQUEST_TIMEOUT_MS,
          'Loading subscription data timed out'
        );
        console.log('💳 Subscription data retrieved:', subscriptionDataArray?.length || 0, 'records');
        subscriptionData = subscriptionDataArray?.[0];
      } catch (subscriptionRlsError) {
        console.warn('RLS blocking user_subscriptions table:', subscriptionRlsError);
      }

      // Get current session to get email
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_REQUEST_TIMEOUT_MS,
        'Refreshing auth session timed out'
      );

      const user: User = {
        id: userId,
        email: session?.user?.email || userData?.tu_email || 'unknown@example.com',
        firstName: profileData?.tup_first_name,
        lastName: profileData?.tup_last_name,
        userType: userData?.tu_user_type || 'learner',
        educationLevel: profileData?.tup_education_level,
        interests: profileData?.tup_interests,
        isVerified: userData?.tu_is_verified || false,
        hasActivePlan: true, // Set to true for demo mode
        mobileVerified: userData?.tu_mobile_verified || false
      };

      console.log('✅ User data compiled:', user);
      setUser(user);
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      // Don't throw error, just set user to null
      setUser(null);
    }
  };

  const login = async (emailOrUsername: string, password: string, userType: string) => {
    setLoading(true);
    try {
      const loginIdentifier = emailOrUsername.trim();
      console.log('🔍 Attempting login for:', loginIdentifier);

      // Clear any existing session data first
      console.log('🧹 Clearing existing session data...');
      sessionManager.removeSession();
      await supabase.auth.signOut();
      setUser(null);

      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const { email: actualEmail, userId: resolvedUserId } = await resolveLoginIdentifier(loginIdentifier);

      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: actualEmail,
        password: password
      });

      if (authError) {
        const authErrorMessage = authError.message?.toLowerCase() || '';

        if (
          authErrorMessage.includes('email not confirmed') ||
          authErrorMessage.includes('confirm your email')
        ) {
          const confirmError = new Error('EMAIL_NOT_CONFIRMED');
          (confirmError as any).email = actualEmail;
          (confirmError as any).displayMessage = UNVERIFIED_ACCOUNT_MESSAGE;
          throw confirmError;
        }

        throw new Error(INVALID_LOGIN_MESSAGE);
      }

      if (!authData.user || !authData.session) {
        throw new Error(INVALID_LOGIN_MESSAGE);
      }

      // Check if user is eligible to log in (active status + verification requirements)
      console.log('🔍 Checking user login eligibility...');
      const { data: eligibilityResult, error: eligibilityError } = await supabase
        .rpc('check_user_login_eligibility', { p_user_id: resolvedUserId || authData.user.id });

      if (eligibilityError) {
        console.error('❌ Failed to check login eligibility:', eligibilityError);
        throw new Error('Failed to verify login eligibility. Please try again.');
      }

      if (!eligibilityResult?.success) {
        console.log('❌ User not eligible to log in:', eligibilityResult?.error);
        // Sign out the user immediately
        await supabase.auth.signOut();
        sessionManager.removeSession();

        const eligibilityErrorMessage = eligibilityResult?.error || 'Login not allowed';
        const eligibilityErrorCode = eligibilityResult?.error_code;
        const emailVerified = eligibilityResult?.details?.email_verified;

        if (
          eligibilityErrorCode === 'EMAIL_VERIFICATION_REQUIRED' ||
          eligibilityErrorCode === 'MOBILE_VERIFICATION_REQUIRED' ||
          eligibilityErrorCode === 'VERIFICATION_REQUIRED' ||
          emailVerified === false
        ) {
          const confirmError = new Error('EMAIL_NOT_CONFIRMED');
          (confirmError as any).email = actualEmail;
          (confirmError as any).displayMessage = UNVERIFIED_ACCOUNT_MESSAGE;
          throw confirmError;
        }

        throw new Error(eligibilityErrorMessage);
      }

      console.log('✅ User is eligible to log in');

      // Explicitly save the session
      console.log('💾 Saving session after login...');
      sessionManager.saveSession(authData.session);

      // Log login activity
      try {
        await logUserActivity(authData.user.id, 'login');
      } catch (logError) {
        console.warn('Failed to log login activity:', logError);
      }

      // Fetch user data explicitly and wait for it to complete
      await withTimeout(
        fetchUserData(authData.user.id),
        AUTH_REQUEST_TIMEOUT_MS,
        'Loading user after login timed out'
      );

      notification.showSuccess('Login Successful!', 'Welcome back!');

      // Return success - navigation will be handled by the component
      console.log('✅ Login completed successfully');
    } catch (error: any) {
      console.error('❌ Login error:', error);

      if (error.message === 'EMAIL_NOT_CONFIRMED') {
        throw error;
      }

      const errorMessage = error?.message || 'Login failed';

      // Clear any partial session data on error
      sessionManager.removeSession();
      setUser(null);

      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any, userType: string) => {
    setLoading(true);
    try {
      console.log('🔍 Attempting registration for:', userData.email);

      // Clear any existing session data first
      sessionManager.removeSession();
      await supabase.auth.signOut();

      const { data: registerResult, error: registerError } = await supabase.functions.invoke('register-user', {
        body: {
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          middleName: userData.middleName || '',
          lastName: userData.lastName,
          userName: userData.userName,
          phoneNumber: userData.phoneNumber && userData.phoneNumber.trim() !== '' ? userData.phoneNumber : null,
          gender: userData.gender || null,
          userType,
          siteUrl: getBaseUrl()
        }
      });

      if (registerError) {
        console.error('Registration edge function error:', registerError);
        throw new Error(registerError.message);
      }

      if (!registerResult?.success) {
        throw new Error(registerResult?.error || 'Registration failed');
      }

      notification.showSuccess(
        'Registration Successful!',
        'Please check your email and click the verification link to activate your account.'
      );

      return registerResult.user_id;

    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      const errorMessage = error?.message || 'Registration failed';

      // Clear any partial session data on error
      sessionManager.removeSession();
      setUser(null);

      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const normalizedEmail = email.trim();

      if (!normalizedEmail) {
        throw new Error('Email is required');
      }

      const { data, error } = await supabase.functions.invoke('resend-verification-email', {
        body: {
          email: normalizedEmail,
          siteUrl: getBaseUrl(),
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to resend verification email');
      }

      notification.showSuccess(
        'Verification Email Sent',
        'Please check your inbox and click the verification link.',
      );
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    const currentUserId = user?.id;
    let shouldRedirectToHome = false;

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('logout-redirect-path', '/');
      }

      // Log logout activity before signing out
      if (user) {
        try {
          await logUserActivity(user.id, 'logout');
        } catch (logError) {
          console.warn('Failed to log logout activity:', logError);
        }
      }

      // Clear all session data
      console.log('🧹 Clearing all session data during logout...');
      sessionManager.removeSession(currentUserId);

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear user state
      setUser(null);

      shouldRedirectToHome = true;
      notification.showInfo('Logged Out', 'You have been successfully logged out.');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('logout-redirect-path');
      }
      notification.showError('Logout Failed', 'There was an error logging out. Please try again.');
    } finally {
      setLoading(false);

      if (shouldRedirectToHome && typeof window !== 'undefined') {
        window.location.replace('/');
      }
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: buildAbsoluteUrl('/reset-password')
      });

      if (error) {
        throw new Error(error.message);
      }

      notification.showSuccess('Reset Email Sent', 'Please check your email for password reset instructions.');
    } catch (error: any) {
      throw error;
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw new Error(error.message);
      }

      notification.showSuccess('Password Reset', 'Your password has been updated successfully.');
    } catch (error: any) {
      throw error;
    }
  };

  const verifyOTP = async (otp: string) => {
    try {
      if (!user) {
        throw new Error('No user found');
      }

      console.log('🔍 Starting OTP verification for user:', user.id);
      const result = await verifyOTPAPI(user.id, otp, 'mobile');

      if (!result.success) {
        throw new Error(result.error || 'OTP verification failed');
      }

      console.log('✅ OTP verification successful');
      setUser({ ...user, mobileVerified: true });
      notification.showSuccess('Verification Successful', 'Mobile number verified successfully.');
    } catch (error: any) {
      console.error('❌ OTP verification failed:', error);
      throw error;
    }
  };

  const sendOTPToUser = async (userId: string, contactInfo: string, otpType: 'email' | 'mobile') => {
    try {
      console.log('📤 Sending OTP to user:', { userId, contactInfo, otpType });
      const result = await sendOTP(userId, contactInfo, otpType);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      console.log('✅ OTP sent successfully');
      notification.showSuccess('OTP Sent', `Verification code sent to ${contactInfo}`);
      return result;
    } catch (error: any) {
      console.error('❌ Failed to send OTP:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!user?.id) {
      return;
    }

    await fetchUserData(user.id);
  };

  const value = {
    user,
    login,
    register,
    resendVerificationEmail,
    logout,
    forgotPassword,
    resetPassword,
    verifyOTP,
    sendOTPToUser,
    refreshUser,
    loading
  };

  return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
  );
};
