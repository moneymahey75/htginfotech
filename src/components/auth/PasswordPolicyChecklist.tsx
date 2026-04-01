import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { PasswordPolicySettings, PasswordValidationResult } from '../../utils/passwordPolicy';

interface PasswordPolicyChecklistProps {
  password: string;
  settings: PasswordPolicySettings;
  validation: PasswordValidationResult;
}

const PasswordPolicyChecklist: React.FC<PasswordPolicyChecklistProps> = ({
  password,
  settings,
  validation,
}) => {
  if (!password) {
    return null;
  }

  return (
    <div className="mt-3 bg-gray-50 rounded-lg p-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        <div className={`flex items-center ${validation.requirements.minLength ? 'text-green-600' : 'text-red-600'}`}>
          {validation.requirements.minLength ? <CheckCircle className="h-3 w-3 mr-2" /> : <XCircle className="h-3 w-3 mr-2" />}
          {settings.password_min_length}+ characters
        </div>

        <div className={`flex items-center ${validation.requirements.maxLength ? 'text-green-600' : 'text-red-600'}`}>
          {validation.requirements.maxLength ? <CheckCircle className="h-3 w-3 mr-2" /> : <XCircle className="h-3 w-3 mr-2" />}
          Max {settings.password_max_length} characters
        </div>

        {settings.password_require_uppercase && (
          <div className={`flex items-center ${validation.requirements.hasUppercase ? 'text-green-600' : 'text-red-600'}`}>
            {validation.requirements.hasUppercase ? <CheckCircle className="h-3 w-3 mr-2" /> : <XCircle className="h-3 w-3 mr-2" />}
            Uppercase letter
          </div>
        )}

        {settings.password_require_lowercase && (
          <div className={`flex items-center ${validation.requirements.hasLowercase ? 'text-green-600' : 'text-red-600'}`}>
            {validation.requirements.hasLowercase ? <CheckCircle className="h-3 w-3 mr-2" /> : <XCircle className="h-3 w-3 mr-2" />}
            Lowercase letter
          </div>
        )}

        {settings.password_require_numbers && (
          <div className={`flex items-center ${validation.requirements.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
            {validation.requirements.hasNumber ? <CheckCircle className="h-3 w-3 mr-2" /> : <XCircle className="h-3 w-3 mr-2" />}
            Number
          </div>
        )}

        {settings.password_require_special_chars && (
          <div className={`flex items-center ${validation.requirements.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
            {validation.requirements.hasSpecialChar ? <CheckCircle className="h-3 w-3 mr-2" /> : <XCircle className="h-3 w-3 mr-2" />}
            Special character
          </div>
        )}

        {settings.password_prevent_common && (
          <div className={`flex items-center ${validation.requirements.noCommon ? 'text-green-600' : 'text-red-600'}`}>
            {validation.requirements.noCommon ? <CheckCircle className="h-3 w-3 mr-2" /> : <XCircle className="h-3 w-3 mr-2" />}
            Not common
          </div>
        )}

        {settings.password_prevent_sequences && (
          <div className={`flex items-center ${validation.requirements.noSequences ? 'text-green-600' : 'text-red-600'}`}>
            {validation.requirements.noSequences ? <CheckCircle className="h-3 w-3 mr-2" /> : <XCircle className="h-3 w-3 mr-2" />}
            No sequences
          </div>
        )}

        {settings.password_prevent_repeats && (
          <div className={`flex items-center ${validation.requirements.noRepeats ? 'text-green-600' : 'text-red-600'}`}>
            {validation.requirements.noRepeats ? <CheckCircle className="h-3 w-3 mr-2" /> : <XCircle className="h-3 w-3 mr-2" />}
            Max {settings.password_max_consecutive} repeats
          </div>
        )}

        <div className={`flex items-center ${validation.requirements.minUniqueChars ? 'text-green-600' : 'text-red-600'}`}>
          {validation.requirements.minUniqueChars ? <CheckCircle className="h-3 w-3 mr-2" /> : <XCircle className="h-3 w-3 mr-2" />}
          {settings.password_min_unique_chars}+ unique chars
        </div>
      </div>

      <div className="mt-2">
        <div className="flex justify-between text-xs mb-1">
          <span>Password strength:</span>
          <span className={
            validation.isValid ? 'text-green-600 font-medium' :
            password.length > 0 ? 'text-yellow-600' : 'text-gray-500'
          }>
            {validation.isValid ? 'Strong' : password.length > 0 ? 'Weak' : 'None'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              validation.isValid ? 'bg-green-500 w-full' :
              password.length > 0 ? 'bg-yellow-500 w-1/2' : 'bg-gray-300 w-0'
            }`}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default PasswordPolicyChecklist;
