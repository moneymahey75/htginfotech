import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sessionUtils } from '../../utils/sessionUtils';
import { useLoadingRecovery } from '../../utils/loadingRecovery';

interface AuthenticatedRouteProps {
  children: React.ReactNode;
}

const AuthenticatedRoute: React.FC<AuthenticatedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const isBusy = loading || isChecking;
  const { hasTimedOut, didTriggerReload } = useLoadingRecovery({
    isLoading: isBusy,
    recoveryKey: `authenticated:${location.pathname}`
  });

  useEffect(() => {
    const checkSession = async () => {
      setIsChecking(true);

      try {
        await new Promise(resolve => setTimeout(resolve, 100));

        const sessionInfo = sessionUtils.getSessionInfo();

        if (!sessionInfo.isValid && !loading) {
          console.log('🔒 No valid session found in AuthenticatedRoute');
        }
      } catch (error) {
        console.error('❌ Error checking session in AuthenticatedRoute:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, [location.pathname, loading]);

  if (isBusy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {didTriggerReload
              ? 'Refreshing the page...'
              : hasTimedOut
                ? 'Still loading. Trying to recover automatically...'
                : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🔒 No user found, redirecting to login');
    const logoutRedirectPath = sessionUtils.getLogoutRedirectPath();
    sessionUtils.clearAllSessions();
    if (logoutRedirectPath) {
      return <Navigate to={logoutRedirectPath} replace />;
    }
    return <Navigate to="/login" replace state={{ from: location, error: 'Please login to access this page.' }} />;
  }

  const sessionInfo = sessionUtils.getSessionInfo();
  if (!sessionInfo.isValid) {
    console.log('🔒 Invalid session detected, redirecting to login');
    const logoutRedirectPath = sessionUtils.getLogoutRedirectPath();
    sessionUtils.clearAllSessions();
    if (logoutRedirectPath) {
      return <Navigate to={logoutRedirectPath} replace />;
    }
    return <Navigate to="/login" replace state={{ from: location, error: 'Please login to access this page.' }} />;
  }

  return <>{children}</>;
};

export default AuthenticatedRoute;
