import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader, Lock, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../components/ui/NotificationProvider';
import { useAdmin } from '../../contexts/AdminContext';
import PasswordPolicyChecklist from '../../components/auth/PasswordPolicyChecklist';
import {
  createEmptyPasswordValidation,
  PasswordValidationResult,
  validatePasswordPolicy,
} from '../../utils/passwordPolicy';

const SubAdminResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const notification = useNotification();
  const { settings } = useAdmin();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => String(searchParams.get('token') || '').trim(), [searchParams]);

  const [isVerifying, setIsVerifying] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [subAdminName, setSubAdminName] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult>(createEmptyPasswordValidation());

  useEffect(() => {
    setPasswordValidation(validatePasswordPolicy(formData.password, settings));
  }, [formData.password, settings]);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('The reset link is invalid or missing.');
        setIsVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-subadmin-password-reset', {
          body: { token },
        });

        if (error) {
          throw error;
        }

        if (!data?.success) {
          throw new Error(data?.error || 'The reset link is invalid or has expired.');
        }

        setSubAdminName(String(data.fullName || '').trim());
      } catch (err) {
        const message = err instanceof Error ? err.message : 'The reset link is invalid or has expired.';
        setError(message);
        notification.showError('Reset Link Invalid', message);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [notification, token]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!token) {
      setError('The reset link is invalid or missing.');
      setIsSubmitting(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0] || 'Please follow the password policy.');
      setIsSubmitting(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('complete-subadmin-password-reset', {
        body: {
          token,
          password: formData.password,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update password.');
      }

      setSuccess(true);
      notification.showSuccess('Password Updated', 'Your sub-admin password has been updated successfully.');

      window.setTimeout(() => {
        navigate('/backpanel/login', {
          replace: true,
          state: { success: 'Password updated successfully. Please login with your new password.' },
        });
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      setError(message);
      notification.showError('Reset Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 text-center">
          <div className="bg-green-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Password Updated</h2>
          <p className="text-gray-300">Your password has been changed successfully. Redirecting to admin login...</p>
        </div>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 text-center">
          <div className="bg-indigo-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Loader className="h-8 w-8 text-indigo-400 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Verifying Reset Link</h2>
          <p className="text-gray-300">Please wait while we verify your sub-admin password reset request.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">Set Admin Password</h2>
          <p className="mt-2 text-gray-400">
            {subAdminName ? `Create a password for ${subAdminName}` : 'Create your new sub-admin password'}
          </p>
        </div>

        {error ? (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        ) : null}

        {!error && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500 hover:text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <PasswordPolicyChecklist
              password={formData.password}
              settings={settings}
              validation={passwordValidation}
            />

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500 hover:text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isSubmitting ? 'Updating Password...' : 'Save Password'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link to="/backpanel/login" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubAdminResetPassword;
