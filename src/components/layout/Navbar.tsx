import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { Menu, X, User, LogOut, Settings, Home, ChevronDown, Building, BookOpen, GraduationCap, Users, Briefcase, LogIn, UserPlus, Phone, Mail, MessageCircle, KeyRound } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
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
    if (!user) return '/';
    switch (user.userType) {
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
        <div className="bg-gray-900 text-white py-2 text-sm fixed w-full top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
              {/* Left Side - Contact Info */}
              <div className="flex items-center space-x-6">
                {settings.primaryPhone && (
                    <a
                        href={`tel:${settings.primaryPhone}`}
                        className="flex items-center space-x-2 hover:text-indigo-300 transition-colors duration-200"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{settings.primaryPhone}</span>
                    </a>
                )}

                {settings.primaryEmail && (
                    <a
                        href={`mailto:${settings.primaryEmail}`}
                        className="flex items-center space-x-2 hover:text-indigo-300 transition-colors duration-200"
                    >
                      <Mail className="h-3 w-3" />
                      <span>{settings.primaryEmail}</span>
                    </a>
                )}
              </div>

              {/* Right Side - Social Media Icons */}
              <div className="flex items-center space-x-4">
                {settings.facebookUrl && (
                    <a
                        href={settings.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-400 transition-colors duration-200"
                        aria-label="Facebook"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                      </svg>
                    </a>
                )}

                {settings.twitterUrl && (
                    <a
                        href={settings.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-sky-400 transition-colors duration-200"
                        aria-label="Twitter"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                    </a>
                )}

                {settings.instagramUrl && (
                    <a
                        href={settings.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-pink-400 transition-colors duration-200"
                        aria-label="Instagram"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987c6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.611-3.189-1.551-.741-.94-.741-2.137 0-3.077.741-.94 1.892-1.551 3.189-1.551 1.297 0 2.448.611 3.189 1.551.741.94.741 2.137 0 3.077-.741.94-1.892 1.551-3.189 1.551z" clipRule="evenodd" />
                      </svg>
                    </a>
                )}

                {settings.linkedinUrl && (
                    <a
                        href={settings.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-400 transition-colors duration-200"
                        aria-label="LinkedIn"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                )}

                {settings.youtubeUrl && (
                    <a
                        href={settings.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-red-400 transition-colors duration-200"
                        aria-label="YouTube"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation - Fixed with top offset */}
        <nav className="bg-white/95 backdrop-blur-md shadow-lg fixed w-full top-8 z-40 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="flex items-center space-x-3 group">
                  <div className="relative">
                    <img
                        src={settings.logoUrl}
                        alt={settings.siteName}
                        className="h-14 w-100 object-cover shadow-md group-hover:shadow-lg transition-shadow duration-300"
                        onError={(e) => {
                          // Fallback to loading GIF with proper sizing
                          (e.target as HTMLImageElement).src = '/htginfotech-logo.png';
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
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 font-medium"
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Link>

                <Link
                    to="/job-seekers"
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
                >
                  <Users className="h-4 w-4" />
                  <span>Job Seekers</span>
                </Link>

                <Link
                    to="/job-providers"
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-700 hover:text-green-600 hover:bg-green-50 transition-all duration-200 font-medium"
                >
                  <Building className="h-4 w-4" />
                  <span>Job Providers</span>
                </Link>

                <Link
                    to="/tutors"
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200 font-medium"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Tutors</span>
                </Link>

                <Link
                    to="/learners"
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200 font-medium"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Learners</span>
                </Link>

                <Link
                    to="/courses"
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-700 hover:text-pink-600 hover:bg-pink-50 transition-all duration-200 font-medium"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>All Courses</span>
                </Link>

                {/* Auth Buttons */}
                <div className="flex items-center space-x-3 ml-6 pl-6 border-l border-gray-200">
                  {!user ? (
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
                            className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border border-blue-200 transition-all duration-200"
                        >
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div className="text-left hidden xl:block">
                            <div className="text-sm font-semibold text-gray-900">
                              {user.firstName || 'User'}
                            </div>
                            <div className="text-xs text-gray-600 capitalize">{user.userType?.replace('_', ' ')}</div>
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
                                    {user.firstName} {user.lastName}
                                  </div>
                                  <div className="text-sm text-gray-600">{user.email}</div>
                                  <div className="text-xs text-gray-500 capitalize mt-1">
                                    {user.userType?.replace('_', ' ')}
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
                                    to="/update-password"
                                    className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                                    onClick={() => setIsUserMenuOpen(false)}
                                >
                                  <KeyRound className="h-4 w-4" />
                                  <span className="font-medium">Update Password</span>
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
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
                      onClick={() => setIsMenuOpen(false)}
                  >
                    <Home className="h-5 w-5" />
                    <span className="font-medium">Home</span>
                  </Link>

                  <Link
                      to="/job-seekers"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                      onClick={() => setIsMenuOpen(false)}
                  >
                    <Users className="h-5 w-5" />
                    <span className="font-medium">Job Seekers</span>
                  </Link>

                  <Link
                      to="/job-providers"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200"
                      onClick={() => setIsMenuOpen(false)}
                  >
                    <Building className="h-5 w-5" />
                    <span className="font-medium">Job Providers</span>
                  </Link>

                  <Link
                      to="/tutors"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200"
                      onClick={() => setIsMenuOpen(false)}
                  >
                    <GraduationCap className="h-5 w-5" />
                    <span className="font-medium">Tutors</span>
                  </Link>

                  <Link
                      to="/learners"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-200"
                      onClick={() => setIsMenuOpen(false)}
                  >
                    <BookOpen className="h-5 w-5" />
                    <span className="font-medium">Learners</span>
                  </Link>

                  <Link
                      to="/courses"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all duration-200"
                      onClick={() => setIsMenuOpen(false)}
                  >
                    <BookOpen className="h-5 w-5" />
                    <span>All Courses</span>
                  </Link>

                  {/* Mobile Auth Buttons */}
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    {!user ? (
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
                                {user.firstName || 'User'}
                              </div>
                              <div className="text-sm text-gray-500 capitalize">{user.userType?.replace('_', ' ')}</div>
                            </div>
                          </div>

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
                            <span>Update Password</span>
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