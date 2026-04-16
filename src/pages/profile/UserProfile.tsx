import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CalendarDays, CheckCircle, Loader2, Mail, Save, Settings, Shield, User, Users } from 'lucide-react';
import { getUserProfileDetails, updateUserProfile, UserProfileDetails, UserProfileRecord } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type ProfileFormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  username: string;
  mobile: string;
  gender: '' | 'male' | 'female' | 'other';
  dateOfBirth: string;
  educationLevel: string;
  interests: string;
  learningGoals: string;
  timezone: string;
};

type ValidationErrors = Partial<Record<keyof ProfileFormState, string>>;

const TIMEZONE_OPTIONS = [
  'Australia/Sydney',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris'
];

const createDefaultFormState = (): ProfileFormState => ({
  firstName: '',
  middleName: '',
  lastName: '',
  username: '',
  mobile: '',
  gender: '',
  dateOfBirth: '',
  educationLevel: '',
  interests: '',
  learningGoals: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
});

const mapProfileToFormState = (profile: UserProfileRecord | null): ProfileFormState => ({
  firstName: profile?.tup_first_name || '',
  middleName: profile?.tup_middle_name || '',
  lastName: profile?.tup_last_name || '',
  username: profile?.tup_username || '',
  mobile: profile?.tup_mobile || '',
  gender: profile?.tup_gender || '',
  dateOfBirth: profile?.tup_date_of_birth || '',
  educationLevel: profile?.tup_education_level || '',
  interests: Array.isArray(profile?.tup_interests) ? profile!.tup_interests!.join(', ') : '',
  learningGoals: profile?.tup_learning_goals || '',
  timezone: profile?.tup_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
});

const formatTimestamp = (value: string | null) => {
  if (!value) return 'Not available';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
};

const getDashboardLink = (userType?: string) => {
  switch (userType) {
    case 'tutor':
      return '/tutor/dashboard';
    case 'learner':
      return '/learner/dashboard';
    case 'job_seeker':
      return '/job-seeker/dashboard';
    case 'job_provider':
      return '/job-provider/dashboard';
    default:
      return '/';
  }
};

const UserProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [profileDetails, setProfileDetails] = useState<UserProfileDetails | null>(null);
  const [formData, setFormData] = useState<ProfileFormState>(createDefaultFormState());
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [pageError, setPageError] = useState('');
  const [pageSuccess, setPageSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setPageError('');

      try {
        const details = await getUserProfileDetails(user.id);
        setProfileDetails(details);
        setFormData(mapProfileToFormState(details.profile));
      } catch (error: any) {
        console.error('Failed to load user profile:', error);
        const message = error?.message || 'Unable to load your profile right now.';
        setPageError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    setValidationErrors(prev => {
      if (!prev[name as keyof ProfileFormState]) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors[name as keyof ProfileFormState];
      return nextErrors;
    });
  };

  const validateForm = () => {
    const errors: ValidationErrors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required.';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required.';
    }

    if (formData.mobile && !/^[0-9+\-\s()]{7,20}$/.test(formData.mobile.trim())) {
      errors.mobile = 'Enter a valid mobile number.';
    }

    if (formData.dateOfBirth) {
      const selectedDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (selectedDate > today) {
        errors.dateOfBirth = 'Date of birth cannot be in the future.';
      }
    }

    if (!formData.timezone.trim()) {
      errors.timezone = 'Timezone is required.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.id || !profileDetails) {
      return;
    }

    setPageError('');
    setPageSuccess('');

    if (!validateForm()) {
      setPageError('Please fix the highlighted fields and try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);

    try {
      const updatedDetails = await updateUserProfile(user.id, {
        tup_first_name: formData.firstName,
        tup_middle_name: formData.middleName,
        tup_last_name: formData.lastName,
        tup_username: formData.username,
        tup_mobile: formData.mobile,
        tup_gender: formData.gender,
        tup_date_of_birth: formData.dateOfBirth,
        tup_education_level: formData.educationLevel,
        tup_interests: formData.interests
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
        tup_learning_goals: formData.learningGoals,
        tup_timezone: formData.timezone
      });

      setProfileDetails(updatedDetails);
      setFormData(mapProfileToFormState(updatedDetails.profile));
      await refreshUser();

      setPageSuccess('Your profile has been updated successfully.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      const message = error?.message?.includes('unique_tup_mobile')
        ? 'This mobile number is already linked to another account.'
        : error?.message || 'Unable to update your profile right now.';

      if (error?.message?.includes('unique_tup_mobile')) {
        setValidationErrors(prev => ({
          ...prev,
          mobile: 'This mobile number is already in use.'
        }));
      }

      setPageError(message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profileDetails) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8">
            <div className="flex items-start gap-3 text-red-700">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <h1 className="text-lg font-semibold">Profile unavailable</h1>
                <p className="text-sm mt-1">{pageError || 'We could not load your profile details.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dashboardLink = getDashboardLink(user.userType);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Link
                to={dashboardLink}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-2">
              Review and update the profile details connected to your account.
            </p>
          </div>
        </div>

        {pageError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <p className="text-sm text-red-700">{pageError}</p>
          </div>
        )}

        {pageSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <p className="text-sm text-green-700">{pageSuccess}</p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Profile Details</h2>
                <p className="text-sm text-gray-600">Editable fields from your user profile record.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <section>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                    <input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border ${validationErrors.firstName ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                      placeholder="Enter first name"
                    />
                    {validationErrors.firstName && <p className="text-xs text-red-600 mt-2">{validationErrors.firstName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
                    <input
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter middle name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                    <input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border ${validationErrors.lastName ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                      placeholder="Enter last name"
                    />
                    {validationErrors.lastName && <p className="text-xs text-red-600 mt-2">{validationErrors.lastName}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border ${validationErrors.dateOfBirth ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                    />
                    {validationErrors.dateOfBirth && <p className="text-xs text-red-600 mt-2">{validationErrors.dateOfBirth}</p>}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Contact and Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                    <input
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border ${validationErrors.mobile ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                      placeholder="Enter mobile number"
                    />
                    {validationErrors.mobile && <p className="text-xs text-red-600 mt-2">{validationErrors.mobile}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone *</label>
                    <select
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border ${validationErrors.timezone ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                    >
                      {TIMEZONE_OPTIONS.map(timezone => (
                        <option key={timezone} value={timezone}>
                          {timezone}
                        </option>
                      ))}
                    </select>
                    {validationErrors.timezone && <p className="text-xs text-red-600 mt-2">{validationErrors.timezone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Education Level</label>
                    <input
                      name="educationLevel"
                      value={formData.educationLevel}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter education level"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
                    <input
                      name="interests"
                      value={formData.interests}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Comma separated interests"
                    />
                    <p className="text-xs text-gray-500 mt-2">Example: React, Data Science, Career Growth</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Learning Goals</h3>
                <textarea
                  name="learningGoals"
                  value={formData.learningGoals}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Describe your goals, focus areas, or what you want to achieve."
                />
              </section>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? 'Updating Profile...' : 'Update Profile'}
                </button>

                <Link
                  to={dashboardLink}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Return to Dashboard
                </Link>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Account Status</h2>
                  <p className="text-sm text-gray-600">Read-only details from your user account.</p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-500">Email</div>
                    <div className="inline-flex mt-2 px-3 py-1 rounded-xl bg-blue-50 text-blue-700 font-medium break-all">
                      {profileDetails.account.tu_email}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-500">Username</div>
                    <div className="inline-flex mt-2 px-3 py-1 rounded-xl bg-violet-50 text-violet-700 font-medium break-all">
                      {formData.username || 'Not available'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>User Type</span>
                  </div>
                  <div className="pl-6">
                    <div className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-blue-700 capitalize font-medium">
                      {profileDetails.account.tu_user_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className={`px-3 py-2 rounded-xl text-sm font-medium ${profileDetails.account.tu_is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {profileDetails.account.tu_is_active ? 'Active account' : 'Inactive account'}
                  </div>
                  <div className={`px-3 py-2 rounded-xl text-sm font-medium ${profileDetails.account.tu_email_verified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {profileDetails.account.tu_email_verified ? 'Email verified' : 'Email not verified'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Profile Record</h2>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-gray-500 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    <span>Created At</span>
                  </dt>
                  <dd className="font-medium text-gray-900">{formatTimestamp(profileDetails.profile?.tup_created_at || profileDetails.account.tu_created_at)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    <span>Last Updated</span>
                  </dt>
                  <dd className="font-medium text-gray-900">{formatTimestamp(profileDetails.profile?.tup_updated_at || profileDetails.account.tu_updated_at)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
