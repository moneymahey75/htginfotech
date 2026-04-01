export interface PasswordPolicySettings {
  password_min_length: number;
  password_max_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_special_chars: boolean;
  password_allowed_special_chars: string;
  password_prevent_common: boolean;
  password_prevent_sequences: boolean;
  password_prevent_repeats: boolean;
  password_max_consecutive: number;
  password_min_unique_chars: number;
}

export interface PasswordRequirements {
  minLength: boolean;
  maxLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  noCommon: boolean;
  noSequences: boolean;
  noRepeats: boolean;
  minUniqueChars: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  requirements: PasswordRequirements;
}

const EMPTY_REQUIREMENTS: PasswordRequirements = {
  minLength: false,
  maxLength: false,
  hasUppercase: false,
  hasLowercase: false,
  hasNumber: false,
  hasSpecialChar: false,
  noCommon: false,
  noSequences: false,
  noRepeats: false,
  minUniqueChars: false,
};

const COMMON_PASSWORDS = [
  'password', '123456', 'password123', 'qwerty', 'letmein', 'welcome',
  'admin', '12345678', '123456789', '12345', '1234567', '1234567890',
  'abc123', 'password1', '1234', 'test', 'guest', 'passw0rd',
  'learner', 'tutor', 'jobseeker', 'jobprovider'
];

const SEQUENCES = [
  'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij', 'ijk', 'jkl',
  'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr', 'qrs', 'rst', 'stu', 'tuv',
  'uvw', 'vwx', 'wxy', 'xyz', '012', '123', '234', '345', '456', '567',
  '678', '789', '890', 'qwe', 'wer', 'ert', 'rty', 'tyu', 'yui', 'uio',
  'iop', 'asd', 'sdf', 'dfg', 'fgh', 'ghj', 'hjk', 'jkl', 'zxc', 'xcv',
  'cvb', 'vbn', 'bnm'
];

export const createEmptyPasswordValidation = (): PasswordValidationResult => ({
  isValid: false,
  errors: [],
  requirements: { ...EMPTY_REQUIREMENTS },
});

const isCommonPassword = (password: string): boolean =>
  COMMON_PASSWORDS.includes(password.toLowerCase());

const hasSequences = (password: string): boolean => {
  const lowerPassword = password.toLowerCase();
  return SEQUENCES.some((seq) => lowerPassword.includes(seq));
};

const hasRepeatedChars = (password: string, maxConsecutive: number): boolean => {
  let currentChar = '';
  let currentCount = 0;

  for (let i = 0; i < password.length; i += 1) {
    if (password[i] === currentChar) {
      currentCount += 1;
      if (currentCount > maxConsecutive) {
        return true;
      }
    } else {
      currentChar = password[i];
      currentCount = 1;
    }
  }

  return false;
};

const getUniqueCharsCount = (password: string): number => new Set(password).size;

export const validatePasswordPolicy = (
  password: string,
  settings: PasswordPolicySettings,
): PasswordValidationResult => {
  if (!password) {
    return createEmptyPasswordValidation();
  }

  const escapedSpecialChars = settings.password_allowed_special_chars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const requirements: PasswordRequirements = {
    minLength: password.length >= settings.password_min_length,
    maxLength: password.length <= settings.password_max_length,
    hasUppercase: settings.password_require_uppercase ? /[A-Z]/.test(password) : true,
    hasLowercase: settings.password_require_lowercase ? /[a-z]/.test(password) : true,
    hasNumber: settings.password_require_numbers ? /\d/.test(password) : true,
    hasSpecialChar: settings.password_require_special_chars
      ? new RegExp(`[${escapedSpecialChars}]`).test(password)
      : true,
    noCommon: settings.password_prevent_common ? !isCommonPassword(password) : true,
    noSequences: settings.password_prevent_sequences ? !hasSequences(password) : true,
    noRepeats: settings.password_prevent_repeats
      ? !hasRepeatedChars(password, settings.password_max_consecutive)
      : true,
    minUniqueChars: getUniqueCharsCount(password) >= settings.password_min_unique_chars,
  };

  const errors: string[] = [];

  if (!requirements.minLength) {
    errors.push(`Password must be at least ${settings.password_min_length} characters`);
  }
  if (!requirements.maxLength) {
    errors.push(`Password must not exceed ${settings.password_max_length} characters`);
  }
  if (settings.password_require_uppercase && !requirements.hasUppercase) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }
  if (settings.password_require_lowercase && !requirements.hasLowercase) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }
  if (settings.password_require_numbers && !requirements.hasNumber) {
    errors.push('Password must contain at least one number (0-9)');
  }
  if (settings.password_require_special_chars && !requirements.hasSpecialChar) {
    errors.push(`Password must contain at least one special character: ${settings.password_allowed_special_chars}`);
  }
  if (settings.password_prevent_common && !requirements.noCommon) {
    errors.push('Password is too common. Please choose a stronger password');
  }
  if (settings.password_prevent_sequences && !requirements.noSequences) {
    errors.push('Password contains sequential characters (abc, 123, etc.)');
  }
  if (settings.password_prevent_repeats && !requirements.noRepeats) {
    errors.push(`Password contains more than ${settings.password_max_consecutive} consecutive identical characters`);
  }
  if (!requirements.minUniqueChars) {
    errors.push(`Password must contain at least ${settings.password_min_unique_chars} unique characters`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    requirements,
  };
};
