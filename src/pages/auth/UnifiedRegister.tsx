import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, User, Mail, Phone, Users, ChevronDown, CheckCircle, XCircle, Info } from 'lucide-react';
import ReCaptcha from '../../components/ui/ReCaptcha';

const countryCodes = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+972', country: 'Israel', flag: '🇮🇱' },
  { code: '+1', country: 'United States', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
];

interface UsernameValidation {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
}

const checkUsernameExists = async (username: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
        .from('tbl_user_profiles')
        .select('tup_username')
        .eq('tup_username', username.toLowerCase())
        .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      console.error('Error checking username:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking username uniqueness:', error);
    return false;
  }
};

const UnifiedRegister: React.FC = () => {
  const { register } = useAuth();
  const { settings } = useAdmin();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    phoneNumber: '',
    phoneCountryCode: '+91',
    email: '',
    password: '',
    confirmPassword: '',
    userName: '',
    userType: '',
    acceptTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showUsernameTooltip, setShowUsernameTooltip] = useState(false);

  // Username validation state
  const [usernameValidation, setUsernameValidation] = useState<UsernameValidation>({
    isValid: false,
    errors: [],
    suggestions: []
  });
  const [validatingUsername, setValidatingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const usernameTimeout = useRef<NodeJS.Timeout>();
  const tooltipTimeout = useRef<NodeJS.Timeout>();

  const userTypes = [
    { value: 'learner', label: 'Learner' },
    { value: 'tutor', label: 'Tutor' },
    { value: 'job_seeker', label: 'Job Seeker' },
    { value: 'job_provider', label: 'Job Provider' }
  ];

  // Debounced username validation
  useEffect(() => {
    if (usernameTimeout.current) {
      clearTimeout(usernameTimeout.current);
    }

    if (formData.userName.trim()) {
      usernameTimeout.current = setTimeout(() => {
        validateUsername(formData.userName);
      }, 300);
    } else {
      setUsernameValidation({
        isValid: false,
        errors: [],
        suggestions: []
      });
      setUsernameAvailable(null);
    }

    return () => {
      if (usernameTimeout.current) {
        clearTimeout(usernameTimeout.current);
      }
    };
  }, [formData.userName]);

  const validateUsername = useCallback(async (username: string) => {
    if (!username.trim()) {
      setUsernameValidation({
        isValid: false,
        errors: [],
        suggestions: []
      });
      setUsernameAvailable(null);
      return;
    }

    setValidatingUsername(true);
    setUsernameAvailable(null);

    try {
      const errors: string[] = [];
      const suggestions: string[] = [];

      if (username.length < settings.usernameMinLength) {
        errors.push(`Username must be at least ${settings.usernameMinLength} characters long`);
      }

      if (username.length > settings.usernameMaxLength) {
        errors.push(`Username must not exceed ${settings.usernameMaxLength} characters`);
      }

      if (!settings.usernameAllowSpaces && /\s/.test(username)) {
        errors.push('Username cannot contain spaces');
      }

      if (settings.usernameMustStartWithLetter && !/^[a-zA-Z]/.test(username)) {
        errors.push('Username must start with a letter');
      }

      if (!settings.usernameAllowNumbers && /\d/.test(username)) {
        errors.push('Username cannot contain numbers');
      }

      if (!settings.usernameAllowSpecialChars && /[^a-zA-Z0-9]/.test(username)) {
        errors.push('Username cannot contain special characters');
      } else if (settings.usernameAllowSpecialChars && settings.usernameAllowedSpecialChars) {
        const allowedCharsPattern = new RegExp(`^[a-zA-Z0-9${settings.usernameAllowedSpecialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]+$`);
        if (!allowedCharsPattern.test(username)) {
          errors.push(`Username can only contain letters, numbers, and these special characters: ${settings.usernameAllowedSpecialChars}`);
        }
      }

      if (settings.usernameForceLowerCase && username !== username.toLowerCase()) {
        suggestions.push(`Username will be converted to lowercase: ${username.toLowerCase()}`);
      }

      if (settings.usernameUniqueRequired && errors.length === 0) {
        try {
          const exists = await checkUsernameExists(username);
          if (exists) {
            errors.push('Username is already taken');
            suggestions.push('Try adding numbers or underscores to make it unique');
            setUsernameAvailable(false);
          } else {
            setUsernameAvailable(true);
          }
        } catch (error) {
          console.error('Error checking username uniqueness:', error);
          errors.push('Unable to check username availability');
          setUsernameAvailable(null);
        }
      } else if (!settings.usernameUniqueRequired) {
        setUsernameAvailable(true);
      }

      setUsernameValidation({
        isValid: errors.length === 0,
        errors,
        suggestions
      });

    } catch (error) {
      setUsernameValidation({
        isValid: false,
        errors: ['Error validating username'],
        suggestions: []
      });
      setUsernameAvailable(null);
    } finally {
      setValidatingUsername(false);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification');
      setIsSubmitting(false);
      return;
    }

    if (!usernameValidation.isValid) {
      setError('Please fix username validation errors before submitting');
      setIsSubmitting(false);
      return;
    }

    if (settings.usernameUniqueRequired && usernameAvailable === false) {
      setError('Username is already taken. Please choose a different one.');
      setIsSubmitting(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    if (!formData.acceptTerms) {
      setError('Please accept the terms and conditions');
      setIsSubmitting(false);
      return;
    }

    if (!formData.userType) {
      setError('Please select a user type');
      setIsSubmitting(false);
      return;
    }

    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber)) {
      setError('Phone number must be exactly 10 digits');
      setIsSubmitting(false);
      return;
    }

    try {
      const fullPhone = formData.phoneCountryCode + formData.phoneNumber;

      let finalUsername = formData.userName;
      if (settings.usernameForceLowerCase) {
        finalUsername = finalUsername.toLowerCase();
      }

      await register({
        ...formData,
        userName: finalUsername,
        phoneNumber: fullPhone
      }, formData.userType as any);

      switch (formData.userType) {
        case 'learner':
          navigate('/learner/dashboard');
          break;
        case 'tutor':
          navigate('/tutor/dashboard');
          break;
        case 'job_seeker':
          navigate('/job-seeker/dashboard');
          break;
        case 'job_provider':
          navigate('/job-provider/dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      // Error is handled by notification system
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (name === 'phoneNumber') {
      if (value === '' || (/^\d*$/.test(value) && value.length <= 10)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
      return;
    }

    if (name === 'userName' && !settings.usernameAllowSpaces) {
      const sanitizedValue = value.replace(/\s/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: sanitizedValue
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  }, [settings.usernameAllowSpaces]);

  const handleCountryCodeSelect = useCallback((code: string) => {
    setFormData(prev => ({ ...prev, phoneCountryCode: code }));
    setShowCountryDropdown(false);
  }, []);

  const handleUsernameTooltip = useCallback((show: boolean) => {
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
    }

    if (show) {
      setShowUsernameTooltip(true);
    } else {
      tooltipTimeout.current = setTimeout(() => {
        setShowUsernameTooltip(false);
      }, 300);
    }
  }, []);

  const selectedCountry = countryCodes.find(country => country.code === formData.phoneCountryCode);

  return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <div className="text-center mb-8">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
              <p className="mt-2 text-gray-600">Join our platform and start your journey</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="First name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-2">
                    Middle Name
                  </label>
                  <input
                      id="middleName"
                      name="middleName"
                      type="text"
                      value={formData.middleName}
                      onChange={handleChange}
                      className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Middle name"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Last name"
                  />
                </div>
              </div>

              {/* Username Field with Validation */}
              <div>
                <div className="flex items-center mb-2">
                  <label htmlFor="userName" className="block text-sm font-medium text-gray-700">
                    Username *
                  </label>
                  <div
                      className="relative ml-2"
                      onMouseEnter={() => handleUsernameTooltip(true)}
                      onMouseLeave={() => handleUsernameTooltip(false)}
                  >
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    {showUsernameTooltip && (
                        <div className="absolute z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg bottom-full mb-2 left-1/2 transform -translate-x-1/2">
                          <div className="font-medium mb-1">Username Requirements:</div>
                          <ul className="space-y-1">
                            <li>• {settings.usernameMinLength}-{settings.usernameMaxLength} characters</li>
                            {!settings.usernameAllowSpaces && <li>• No spaces allowed</li>}
                            {settings.usernameMustStartWithLetter && <li>• Must start with a letter</li>}
                            {!settings.usernameAllowNumbers && <li>• No numbers allowed</li>}
                            {!settings.usernameAllowSpecialChars ? (
                                <li>• No special characters allowed</li>
                            ) : (
                                <li>• Allowed: {settings.usernameAllowedSpecialChars || 'none'}</li>
                            )}
                            {settings.usernameForceLowerCase && <li>• Will be converted to lowercase</li>}
                            {settings.usernameUniqueRequired && <li>• Must be unique</li>}
                          </ul>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                      id="userName"
                      name="userName"
                      type="text"
                      required
                      value={formData.userName}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                          formData.userName ?
                              (usernameValidation.isValid && usernameAvailable !== false ? 'border-green-300' : 'border-red-300') :
                              'border-gray-300'
                      }`}
                      placeholder="Choose a username"
                      maxLength={settings.usernameMaxLength}
                  />

                  {formData.userName && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        {validatingUsername ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                        ) : usernameValidation.isValid && usernameAvailable !== false ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                  )}
                </div>

                {formData.userName && (
                    <div className="mt-2">
                      {usernameValidation.errors.length > 0 && (
                          <div className="space-y-1">
                            {usernameValidation.errors.map((error, index) => (
                                <p key={index} className="text-xs text-red-600 flex items-center">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {error}
                                </p>
                            ))}
                          </div>
                      )}

                      {usernameValidation.suggestions.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {usernameValidation.suggestions.map((suggestion, index) => (
                                <p key={index} className="text-xs text-blue-600 flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {suggestion}
                                </p>
                            ))}
                          </div>
                      )}

                      {usernameValidation.isValid && usernameAvailable === true && (
                          <p className="text-xs text-green-600 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Username is valid and available
                          </p>
                      )}

                      <p className={`text-xs mt-1 ${
                          formData.userName.length > settings.usernameMaxLength ? 'text-red-600' :
                              formData.userName.length < settings.usernameMinLength ? 'text-yellow-600' :
                                  'text-gray-500'
                      }`}>
                        {formData.userName.length} / {settings.usernameMaxLength} characters
                        {formData.userName.length < settings.usernameMinLength &&
                            ` (minimum ${settings.usernameMinLength} required)`}
                      </p>
                    </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="flex space-x-2">
                    <div className="relative">
                      <button
                          type="button"
                          onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                          className="flex items-center space-x-1 pl-3 pr-2 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white h-full"
                      >
                        <span>{selectedCountry?.flag}</span>
                        <span>{selectedCountry?.code}</span>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </button>

                      {showCountryDropdown && (
                          <div className="absolute z-10 mt-1 w-48 max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                            {countryCodes.map((country) => (
                                <div
                                    key={country.code}
                                    onClick={() => handleCountryCodeSelect(country.code)}
                                    className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                  <span className="mr-2">{country.flag}</span>
                                  <span className="flex-1">{country.country}</span>
                                  <span className="text-gray-500">{country.code}</span>
                                </div>
                            ))}
                          </div>
                      )}
                    </div>

                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                          id="phoneNumber"
                          name="phoneNumber"
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="1234567890"
                          maxLength={10}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Enter 10-digit phone number</p>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email ID *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="your@email.com"
                    />
                  </div>
                </div>
              </div>

              {/* User Type */}
              <div>
                <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">
                  User Type *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                      id="userType"
                      name="userType"
                      required
                      value={formData.userType}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select user type</option>
                    {userTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="block w-full py-3 px-4 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Choose a strong password"
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

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="block w-full py-3 px-4 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Confirm your password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-700">
                  I accept the{' '}
                  <Link to="/policies" className="text-indigo-600 hover:text-indigo-500">
                    Terms and Conditions
                  </Link>
                </label>
              </div>

              <ReCaptcha onVerify={setRecaptchaToken} />

              <button
                  type="submit"
                  disabled={isSubmitting || !recaptchaToken || !usernameValidation.isValid}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creating Account...</span>
                    </>
                ) : (
                    <span>Create Account</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
  );
};

export default UnifiedRegister;