import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { getSystemSettings } from '../../lib/supabase';
import { buildAssetUrl } from '../../utils/baseUrl';
import { Menu, X, User, LogOut, Settings, Home, ChevronDown, Building, BookOpen, GraduationCap, Users, LogIn, UserPlus, Phone, Mail, MessageCircle, KeyRound } from 'lucide-react';

const hasValue = (value?: string | null) => Boolean(value && value.trim());

const isRouteActive = (pathname: string, route: string) => pathname === route;

const getDesktopNavClassName = (pathname: string, route: string, activeClasses: string, inactiveClasses: string) =>
  isRouteActive(pathname, route)
    ? `flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium ${activeClasses}`
    : `flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium ${inactiveClasses}`;

const getMobileNavClassName = (pathname: string, route: string, activeClasses: string, inactiveClasses: string) =>
  isRouteActive(pathname, route)
    ? `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${activeClasses}`
    : `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${inactiveClasses}`;

const getTopSocialLinks = (settings: any) => ([
  {
    key: 'facebook',
    href: settings.facebook_url?.trim(),
    label: 'Facebook',
    className: 'inline-flex items-center justify-center text-white hover:text-blue-400 transition-colors duration-200',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M22 12.07C22 6.5 17.52 2 12 2S2 6.5 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.25.2 2.25.2v2.47h-1.27c-1.24 0-1.63.78-1.63 1.57v1.89h2.77l-.44 2.9h-2.33V22c4.78-.75 8.43-4.91 8.43-9.93Z" />
      </svg>
    )
  },
  {
    key: 'instagram',
    href: settings.instagram_url?.trim(),
    label: 'Instagram',
    className: 'inline-flex items-center justify-center text-white hover:text-pink-400 transition-colors duration-200',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.95 1.35a1.1 1.1 0 1 1 0 2.2a1.1 1.1 0 0 1 0-2.2ZM12 7a5 5 0 1 1 0 10a5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2A3.2 3.2 0 0 0 12 8.8Z" />
      </svg>
    )
  },
  {
    key: 'linkedin',
    href: settings.linkedin_url?.trim(),
    label: 'LinkedIn',
    className: 'inline-flex items-center justify-center text-white hover:text-blue-400 transition-colors duration-200',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M6.94 8.5a1.56 1.56 0 1 1 0-3.12a1.56 1.56 0 0 1 0 3.12ZM5.5 9.75h2.88V19H5.5V9.75Zm4.68 0h2.76V11h.04c.38-.73 1.32-1.5 2.72-1.5c2.91 0 3.45 1.92 3.45 4.42V19h-2.87v-4.5c0-1.07-.02-2.45-1.5-2.45c-1.5 0-1.73 1.16-1.73 2.37V19h-2.87V9.75Z" />
      </svg>
    )
  },
  {
    key: 'twitter',
    href: settings.twitter_url?.trim(),
    label: 'Twitter / X',
    className: 'inline-flex items-center justify-center text-white hover:text-sky-400 transition-colors duration-200',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M18.9 2H22l-6.77 7.73L23.2 22h-6.24l-4.9-7.43L5.56 22H2.44l7.24-8.27L2 2h6.4l4.43 6.77L18.9 2Zm-1.09 18h1.73L7.46 3.9H5.61L17.81 20Z" />
      </svg>
    )
  },
  {
    key: 'youtube',
    href: settings.youtube_url?.trim(),
    label: 'YouTube',
    className: 'inline-flex items-center justify-center text-white hover:text-red-400 transition-colors duration-200',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M21.58 7.19a2.96 2.96 0 0 0-2.08-2.1C17.66 4.6 12 4.6 12 4.6s-5.66 0-7.5.49a2.96 2.96 0 0 0-2.08 2.1C1.93 9.04 1.93 12 1.93 12s0 2.96.49 4.81a2.96 2.96 0 0 0 2.08 2.1c1.84.49 7.5.49 7.5.49s5.66 0 7.5-.49a2.96 2.96 0 0 0 2.08-2.1c.49-1.85.49-4.81.49-4.81s0-2.96-.49-4.81ZM9.9 15.46V8.54L15.96 12L9.9 15.46Z" />
      </svg>
    )
  }
]).filter((item) => hasValue(item.href));

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const displayUser = location.pathname === '/reset-password' ? null : user;
  const [publicSettings, setPublicSettings] = useState<any>(settings);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const topSocialLinks = getTopSocialLinks(publicSettings);
  const hasTopStrip = hasValue(publicSettings.primary_phone) || hasValue(publicSettings.primary_email) || topSocialLinks.length > 0;

  useEffect(() => {
    setPublicSettings(settings);
  }, [settings]);

  useEffect(() => {
    const loadPublicSettings = async () => {
      try {
        const publicSystemSettings = await getSystemSettings();
        setPublicSettings((prev: any) => ({ ...prev, ...publicSystemSettings }));
      } catch (error) {
        console.warn('Failed to load public system settings for navbar:', error);
      }
    };

    loadPublicSettings();
  }, []);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    await logout();
  };

  const handleNavClick = (path: string) => {
    setIsMenuOpen(false);

    if (location.pathname === path) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
        left: 0
      });
    } else {
      navigate(path);
    }
  };

  const getDashboardLink = () => {
    if (!displayUser) return '/';
    switch (displayUser.userType) {
      case 'admin':
        return '/admin/dashboard';
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

  return (
      <>
        {/* Top Contact Strip - Fixed */}
        {hasTopStrip && (
        <div className="bg-gray-900 text-white py-2 text-sm fixed w-full top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 min-h-14 md:min-h-0">
              {/* Left Side - Contact Info */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2">
                {publicSettings.primary_phone && (
                    <a
                        href={`tel:${publicSettings.primary_phone}`}
                        className="flex items-center space-x-2 hover:text-indigo-300 transition-colors duration-200"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{publicSettings.primary_phone}</span>
                    </a>
                )}

                {publicSettings.primary_email && (
                    <a
                        href={`mailto:${publicSettings.primary_email}`}
                        className="flex items-center space-x-2 hover:text-indigo-300 transition-colors duration-200"
                    >
                      <Mail className="h-3 w-3" />
                      <span>{publicSettings.primary_email}</span>
                    </a>
                )}
              </div>

              {topSocialLinks.length > 0 && (
                <div className="flex items-center flex-wrap justify-center gap-4">
                  {topSocialLinks.map((social) => (
                    <a
                      key={social.key}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={social.className}
                      aria-label={social.label}
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Main Navigation - Fixed with top offset */}
        <nav className={`bg-white/95 backdrop-blur-md shadow-lg fixed w-full z-40 border-b border-gray-100 ${hasTopStrip ? 'top-14 md:top-8' : 'top-0'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="flex items-center space-x-3 group">
                  <div className="relative">
                    <img
                        src={publicSettings.logo_url}
                        alt={publicSettings.site_name}
                        className="h-14 w-100 object-cover shadow-md group-hover:shadow-lg transition-shadow duration-300"
                        onError={(e) => {
                          // Fallback to loading GIF with proper sizing
                          (e.target as HTMLImageElement).src = buildAssetUrl('/htginfotech-logo.png');
                          (e.target as HTMLImageElement).className = 'h-14 w-100 object-contain';
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </Link>
              </div>

              {/* Desktop Menu */}
              <div className="hidden lg:flex items-center space-x-1">
                <Link
                    to="/"
                    className={getDesktopNavClassName(location.pathname, '/', 'bg-indigo-50 text-indigo-600', 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50')}
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Link>

                <Link
                    to="/job-seekers"
                    className={getDesktopNavClassName(location.pathname, '/job-seekers', 'bg-blue-50 text-blue-600', 'text-gray-700 hover:text-blue-600 hover:bg-blue-50')}
                >
                  <Users className="h-4 w-4" />
                  <span>Job Seekers</span>
                </Link>

                <Link
                    to="/job-providers"
                    className={getDesktopNavClassName(location.pathname, '/job-providers', 'bg-green-50 text-green-600', 'text-gray-700 hover:text-green-600 hover:bg-green-50')}
                >
                  <Building className="h-4 w-4" />
                  <span>Job Providers</span>
                </Link>

                <Link
                    to="/tutors"
                    className={getDesktopNavClassName(location.pathname, '/tutors', 'bg-purple-50 text-purple-600', 'text-gray-700 hover:text-purple-600 hover:bg-purple-50')}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Tutors</span>
                </Link>

                <Link
                    to="/learners"
                    className={getDesktopNavClassName(location.pathname, '/learners', 'bg-orange-50 text-orange-600', 'text-gray-700 hover:text-orange-600 hover:bg-orange-50')}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Learners</span>
                </Link>

                <Link
                    to="/courses"
                    className={getDesktopNavClassName(location.pathname, '/courses', 'bg-pink-50 text-pink-600', 'text-gray-700 hover:text-pink-600 hover:bg-pink-50')}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>All Courses</span>
                </Link>

                {/* Auth Buttons */}
                <div className="flex items-center space-x-3 ml-6 pl-6 border-l border-gray-200">
                  {!displayUser ? (
                      <>
                        <Link
                            to="/login"
                            className="flex items-center space-x-2 px-6 py-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                        >
                          <LogIn className="h-4 w-4" />
                          <span>Login</span>
                        </Link>
                        <Link
                            to="/register"
                            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                        >
                          <UserPlus className="h-4 w-4" />
                          <span>Sign Up</span>
                        </Link>
                      </>
                  ) : (
                      <div className="relative">
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center space-x-2 px-3 py-[0.3rem] bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border border-blue-200 transition-all duration-200"
                        >
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div className="text-left hidden xl:block">
                            <div className="text-sm font-semibold text-gray-900">
                              {displayUser.firstName || 'User'}
                            </div>
                            <div className="text-xs text-gray-600 capitalize">{displayUser.userType?.replace('_', ' ')}</div>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isUserMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsUserMenuOpen(false)}
                              />
                              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 animate-fade-in">
                                <div className="px-4 py-3 border-b border-gray-100">
                                  <div className="font-semibold text-gray-900">
                                    {displayUser.firstName} {displayUser.lastName}
                                  </div>
                                  <div className="text-sm text-gray-600">{displayUser.email}</div>
                                  <div className="text-xs text-gray-500 capitalize mt-1">
                                    {displayUser.userType?.replace('_', ' ')}
                                  </div>
                                </div>

                                <Link
                                    to={getDashboardLink()}
                                    className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                    onClick={() => setIsUserMenuOpen(false)}
                                >
                                  <Settings className="h-4 w-4" />
                                  <span className="font-medium">Dashboard</span>
                                </Link>

                                <Link
                                    to="/profile"
                                    className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                    onClick={() => setIsUserMenuOpen(false)}
                                >
                                  <User className="h-4 w-4" />
                                  <span className="font-medium">Profile</span>
                                </Link>

                                <Link
                                    to="/update-password"
                                    className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                                    onClick={() => setIsUserMenuOpen(false)}
                                >
                                  <KeyRound className="h-4 w-4" />
                                  <span className="font-medium">Change Password</span>
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                  <LogOut className="h-4 w-4" />
                                  <span className="font-medium">Logout</span>
                                </button>
                              </div>
                            </>
                        )}
                      </div>
                  )}
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="lg:hidden">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 rounded-xl text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200"
                >
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
              <div className="lg:hidden bg-white/95 backdrop-blur-md border-t border-gray-100">
                <div className="px-4 pt-2 pb-3 space-y-1">
                  <Link
                      to="/"
                      className={getMobileNavClassName(location.pathname, '/', 'bg-indigo-50 text-indigo-600', 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50')}
                      onClick={() => setIsMenuOpen(false)}
                  >
                    <Home className="h-5 w-5" />
                    <span className="font-medium">Home</span>
                  </Link>

                  <Link
                      to="/job-seekers"
                      className={getMobileNavClassName(location.pathname, '/job-seekers', 'bg-blue-50 text-blue-600', 'text-gray-700 hover:text-blue-600 hover:bg-blue-50')}
                      onClick={() => setIsMenuOpen(false)}
                  >
                    <Users className="h-5 w-5" />
                    <span className="font-medium">Job Seekers</span>
                  </Link>

                  <Link
                      to="/job-providers"
                      className={getMobileNavClassName(location.pathname, '/job-providers', 'bg-green-50 text-green-600', 'text-gray-700 hover:text-green-600 hover:bg-green-50')}
                      onClick={() => setIsMenuOpen(false)}
                  >
                    <Building className="h-5 w-5" />
                    <span className="font-medium">Job Providers</span>
                  </Link>

                  <Link
                      to="/tutors"
                      className={getMobileNavClassName(location.pathname, '/tutors', 'bg-purple-50 text-purple-600', 'text-gray-700 hover:text-purple-600 hover:bg-purple-50')}
                      onClick={() => setIsMenuOpen(false)}
                  >
                    <GraduationCap className="h-5 w-5" />
                    <span className="font-medium">Tutors</span>
                  </Link>

                  <Link
                      to="/learners"
                      className={getMobileNavClassName(location.pathname, '/learners', 'bg-orange-50 text-orange-600', 'text-gray-700 hover:text-orange-600 hover:bg-orange-50')}
                      onClick={() => setIsMenuOpen(false)}
                  >
                    <BookOpen className="h-5 w-5" />
                    <span className="font-medium">Learners</span>
                  </Link>

                  <Link
                      to="/courses"
                      className={getMobileNavClassName(location.pathname, '/courses', 'bg-pink-50 text-pink-600', 'text-gray-700 hover:text-pink-600 hover:bg-pink-50')}
                      onClick={() => setIsMenuOpen(false)}
                  >
                    <BookOpen className="h-5 w-5" />
                    <span>All Courses</span>
                  </Link>

                  {/* Mobile Auth Buttons */}
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    {!displayUser ? (
                        <div className="space-y-2">
                          <Link
                              to="/login"
                              className="flex items-center space-x-3 px-4 py-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 font-medium"
                              onClick={() => setIsMenuOpen(false)}
                          >
                            <LogIn className="h-5 w-5" />
                            <span>Login</span>
                          </Link>
                          <Link
                              to="/register"
                              className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium"
                              onClick={() => setIsMenuOpen(false)}
                          >
                            <UserPlus className="h-5 w-5" />
                            <span>Sign Up</span>
                          </Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                              <User className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {displayUser.firstName || 'User'}
                              </div>
                              <div className="text-sm text-gray-500 capitalize">{displayUser.userType?.replace('_', ' ')}</div>
                            </div>
                          </div>

                          <Link
                              to="/profile"
                              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 font-medium"
                              onClick={() => setIsMenuOpen(false)}
                          >
                            <User className="h-5 w-5" />
                            <span>Profile</span>
                          </Link>

                          <Link
                              to={getDashboardLink()}
                              className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium"
                              onClick={() => setIsMenuOpen(false)}
                          >
                            <Settings className="h-5 w-5" />
                            <span>Dashboard</span>
                          </Link>

                          <Link
                              to="/update-password"
                              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200 font-medium"
                              onClick={() => setIsMenuOpen(false)}
                          >
                            <KeyRound className="h-5 w-5" />
                            <span>Change Password</span>
                          </Link>

                          <button
                              onClick={handleLogout}
                              className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 w-full font-medium"
                          >
                            <LogOut className="h-5 w-5" />
                            <span>Logout</span>
                          </button>
                        </div>
                    )}
                  </div>
                </div>
              </div>
          )}
        </nav>
      </>
  );
};

export default Navbar;
