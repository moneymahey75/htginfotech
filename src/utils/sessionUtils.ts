// Session utility functions for enhanced session management
import { sessionManager } from '../lib/supabase';

export interface SessionInfo {
  isValid: boolean;
  expiresAt?: number;
  timeRemaining?: number;
  user?: any;
}

export const sessionUtils = {
  // Get detailed session information
  getSessionInfo: (): SessionInfo => {
    const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('current-user-id') : null;
    const session = sessionManager.getSession(currentUserId);

    if (!session) {
      return { isValid: false };
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    const timeRemaining = expiresAt - now;

    return {
      isValid: timeRemaining > 0,
      expiresAt,
      timeRemaining,
      user: session.user
    };
  },

  // Check if session will expire soon (within 5 minutes)
  isSessionExpiringSoon: (): boolean => {
    const sessionInfo = sessionUtils.getSessionInfo();
    if (!sessionInfo.isValid || !sessionInfo.timeRemaining) {
      return false;
    }

    // Check if expires within 5 minutes (300 seconds)
    return sessionInfo.timeRemaining <= 300;
  },

  // Format time remaining in human readable format
  formatTimeRemaining: (seconds: number): string => {
    if (seconds <= 0) return 'Expired';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  },

  // Clear all session data (both Supabase and admin)
  clearAllSessions: () => {
    sessionManager.clearAllSessions();
    localStorage.removeItem('admin_session_token');
  },

  // Check if current page is a login page
  isOnLoginPage: (): boolean => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    return path.includes('/login') || path.includes('/register') || path.includes('/forgot-password') || path.includes('/reset-password');
  },

  // Check if current page is admin area
  isInAdminArea: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.startsWith('/backpanel');
  },

  // Check if current page is a public page
  isPublicPage: (): boolean => {
    if (typeof window === 'undefined') return false;
    const publicPages = ['/', '/about', '/contact', '/faq', '/policies', '/join-customer', '/join-company', '/subscription-plans'];
    return publicPages.includes(window.location.pathname);
  },

  // Session event listeners for tab/window events
  setupSessionListeners: () => {
    if (typeof window === 'undefined') return;

    // Handle storage events (for multi-tab synchronization)
    window.addEventListener('storage', (e) => {
      try {
        const currentUserId = localStorage.getItem('current-user-id');

        // Handle user session cleared in another tab
        if (e.key === `supabase-session-${currentUserId}` && e.newValue === null) {
          if (!sessionUtils.isOnLoginPage() && !sessionUtils.isInAdminArea() && !sessionUtils.isPublicPage()) {
            console.log('🔄 User session cleared in another tab, redirecting...');
            sessionUtils.clearAllSessions();
            window.location.href = '/login';
          }
        }

        // Handle current user ID changed in another tab
        if (e.key === 'current-user-id' && e.newValue !== currentUserId) {
          if (!sessionUtils.isOnLoginPage() && !sessionUtils.isPublicPage()) {
            console.log('🔄 Current user changed in another tab, reloading...');
            window.location.reload();
          }
        }

        // Handle admin session cleared in another tab
        if (e.key === 'admin_session_token' && e.newValue === null) {
          if (sessionUtils.isInAdminArea() && !sessionUtils.isOnLoginPage()) {
            console.log('🔄 Admin session cleared in another tab, redirecting...');
            if (window.location.pathname !== '/backpanel/login') {
              window.location.href = '/backpanel/login';
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in storage event handler:', error);
      }
    });

    console.log('✅ Session listeners setup completed');
  },

  // Manual session refresh
  refreshSession: async (): Promise<boolean> => {
    try {
      console.log('🔄 Manually refreshing session...');
      const restoredSession = await sessionManager.restoreSession();
      return !!restoredSession;
    } catch (error) {
      console.error('❌ Failed to refresh session:', error);
      return false;
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const sessionInfo = sessionUtils.getSessionInfo();
    return sessionInfo.isValid;
  },

  // Check if admin is authenticated
  isAdminAuthenticated: (): boolean => {
    const adminToken = localStorage.getItem('admin_session_token');
    return !!(adminToken && adminToken !== 'null' && adminToken !== 'undefined');
  }
};

// Auto-setup session listeners when module is imported
if (typeof window !== 'undefined') {
  // Setup listeners after a small delay to ensure DOM is ready
  setTimeout(() => {
    sessionUtils.setupSessionListeners();
  }, 100);
}