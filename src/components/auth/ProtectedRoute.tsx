import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sessionUtils } from '../../utils/sessionUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userType: 'learner' | 'tutor' | 'job_seeker' | 'job_provider' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, userType }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Additional session check when route changes
    const checkSession = async () => {
      setIsChecking(true);

      try {
        // Wait a bit for auth context to initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if we have a valid session
        const sessionInfo = sessionUtils.getSessionInfo();

        if (!sessionInfo.isValid && !loading) {
          console.log('🔒 No valid session found in ProtectedRoute');
          // Session will be cleared by sessionUtils, no need to clear here
        }
      } catch (error) {
        console.error('❌ Error checking session in ProtectedRoute:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, [location.pathname, loading]);

  // Show loading spinner while checking authentication
  if (loading || isChecking) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    console.log('🔒 No user found, redirecting to login');
    const logoutRedirectPath = sessionUtils.getLogoutRedirectPath();
    // Clear any stale session data
    sessionUtils.clearAllSessions();
    if (logoutRedirectPath) {
      return <Navigate to={logoutRedirectPath} replace />;
    }
    return <Navigate to="/login" replace state={{ from: location, error: 'Please login to perform this action.' }} />;
  }

  // Check if user type matches the required type
  if (user.userType !== userType) {
    console.log('🔒 User type mismatch, redirecting to home');
    return <Navigate to="/" replace />;
  }

  // Additional session validity check
  const sessionInfo = sessionUtils.getSessionInfo();
  if (!sessionInfo.isValid) {
    console.log('🔒 Invalid session detected, redirecting to login');
    const logoutRedirectPath = sessionUtils.getLogoutRedirectPath();
    sessionUtils.clearAllSessions();
    if (logoutRedirectPath) {
      return <Navigate to={logoutRedirectPath} replace />;
    }
    return <Navigate to="/login" replace state={{ from: location, error: 'Please login to perform this action.' }} />;
  }

  // Check if user needs to complete verification or payment (if required)
  if ((userType === 'learner' || userType === 'job_seeker') && (user.userType === 'learner' || user.userType === 'job_seeker')) {
    // In demo mode, all users have active plans
    // You can add additional checks here if needed
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
