import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { Link, useLocation } from 'react-router-dom';
import { getSystemSettings } from '../../lib/supabase';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Youtube, MessageCircle } from 'lucide-react';

const Footer: React.FC = () => {
  const { settings } = useAdmin();
  const location = useLocation();
  const [publicSettings, setPublicSettings] = useState<any>(settings);

  useEffect(() => {
    setPublicSettings(settings);
  }, [settings]);

  useEffect(() => {
    const loadPublicSettings = async () => {
      try {
        const publicSystemSettings = await getSystemSettings();
        setPublicSettings((prev: any) => ({ ...prev, ...publicSystemSettings }));
      } catch (error) {
        console.warn('Failed to load public system settings for footer:', error);
      }
    };

    loadPublicSettings();
  }, []);

  // Format the full address from individual components
  const formatAddress = () => {
    const parts = [
      publicSettings.address,
      publicSettings.city,
      publicSettings.state,
      publicSettings.zip_code,
      publicSettings.country
    ].filter(part => part && part.trim() !== '');

    return parts.join(', ');
  };

  // Handle logo click to scroll to top
  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <Link
                  to="/"
                  onClick={handleLogoClick}
                  className="flex items-center space-x-3 mb-6 group"
              >
                <div className="relative transition-transform duration-200 group-hover:scale-105">
                  <img
                      src={publicSettings.logo_url}
                      alt={publicSettings.site_name}
                      className="h-14 w-auto object-cover rounded-lg shadow-lg"
                      onError={(e) => {
                        // Fallback to default logo if image fails to load
                        (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop';
                      }}
                  />
                </div>
                <div>
                  <p className="text-gray-300 text-sm mt-1">{publicSettings.site_name}</p>
                </div>
              </Link>

              <p className="text-gray-300 mb-6 leading-relaxed max-w-md">
                {publicSettings.site_name} is your gateway to growth - a comprehensive platform connecting learners, trainers, job seekers, and job providers.
                We bridge the gap between education and opportunities, empowering you to learn, get hired, build teams, and share knowledge - all in one place.
              </p>

              {/* Contact Info */}
              <div className="space-y-3">
                {/* Primary Email */}
                {publicSettings.primary_email && (
                    <a
                        href={`mailto:${publicSettings.primary_email}`}
                        className="flex items-center space-x-3 text-gray-300 hover:text-emerald-400 transition-colors duration-200 group"
                    >
                      <div className="bg-emerald-600 p-2 rounded-lg group-hover:bg-emerald-500 transition-colors">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <span>{publicSettings.primary_email}</span>
                        {publicSettings.primary_email_tagline && (
                            <span className="text-sm text-gray-400 block">{publicSettings.primary_email_tagline}</span>
                        )}
                      </div>
                    </a>
                )}

                {/* Support Email */}
                {publicSettings.support_email && publicSettings.support_email !== publicSettings.primary_email && (
                    <a
                        href={`mailto:${publicSettings.support_email}`}
                        className="flex items-center space-x-3 text-gray-300 hover:text-blue-400 transition-colors duration-200 group"
                    >
                      <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-500 transition-colors">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <span>{publicSettings.support_email}</span>
                        {publicSettings.support_email_tagline && (
                            <span className="text-sm text-gray-400 block">{publicSettings.support_email_tagline}</span>
                        )}
                      </div>
                    </a>
                )}

                {/* Primary Phone */}
                {publicSettings.primary_phone && (
                    <a
                        href={`tel:${publicSettings.primary_phone}`}
                        className="flex items-center space-x-3 text-gray-300 hover:text-teal-400 transition-colors duration-200 group"
                    >
                      <div className="bg-teal-600 p-2 rounded-lg group-hover:bg-teal-500 transition-colors">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div>
                        <span>{publicSettings.primary_phone}</span>
                        {publicSettings.primary_phone_tagline && (
                            <span className="text-sm text-gray-400 block">{publicSettings.primary_phone_tagline}</span>
                        )}
                      </div>
                    </a>
                )}

                {/* Secondary Phone */}
                {publicSettings.secondary_phone && (
                    <a
                        href={`tel:${publicSettings.secondary_phone}`}
                        className="flex items-center space-x-3 text-gray-300 hover:text-cyan-400 transition-colors duration-200 group"
                    >
                      <div className="bg-cyan-600 p-2 rounded-lg group-hover:bg-cyan-500 transition-colors">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div>
                        <span>{publicSettings.secondary_phone}</span>
                        {publicSettings.secondary_phone_tagline && (
                            <span className="text-sm text-gray-400 block">{publicSettings.secondary_phone_tagline}</span>
                        )}
                      </div>
                    </a>
                )}

                {/* WhatsApp */}
                {publicSettings.whatsapp_number && (
                    <a
                        href={`https://wa.me/${publicSettings.whatsapp_number.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 text-gray-300 hover:text-green-400 transition-colors duration-200 group"
                    >
                      <div className="bg-green-600 p-2 rounded-lg group-hover:bg-green-500 transition-colors">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <span>WhatsApp: {publicSettings.whatsapp_number}</span>
                        <span className="text-sm text-gray-400 block">Chat with us</span>
                      </div>
                    </a>
                )}

                {/* Address */}
                {publicSettings.address && (
                    <div className="flex items-start space-x-3 text-gray-300">
                      <div className="bg-purple-600 p-2 rounded-lg">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <address className="text-gray-300 text-sm not-italic">
                          {formatAddress()}
                        </address>
                      </div>
                    </div>
                )}

              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Quick Links</h3>
              <ul className="space-y-3">
                {[
                  { to: "/learners", label: "Join as Learner" },
                  { to: "/tutors", label: "Join as Tutor" },
                  { to: "/job-seekers", label: "Job Seeker" },
                  { to: "/job-providers", label: "Job Provider" },
                  { to: "/courses", label: "All Courses" },
                ].map((link, index) => (
                    <li key={index}>
                      <Link
                          to={link.to}
                          className="text-gray-300 hover:text-emerald-400 transition-colors duration-200 flex items-center space-x-2 group"
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      >
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full group-hover:bg-emerald-400 transition-colors"></div>
                        <span>{link.label}</span>
                      </Link>
                    </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Support</h3>
              <ul className="space-y-3">
                {[
                  { label: "Contact Us", to: "/contact" },
                  { label: "Privacy Policy", to: "/policies" },
                  { label: "FAQ", to: "/faq" },
                  { to: "/about", label: "About Us" }
                ].map((link, index) => (
                    <li key={index}>
                      <Link
                          to={link.to}
                          className="text-gray-300 hover:text-teal-400 transition-colors duration-200 flex items-center space-x-2 group"
                          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      >
                        <div className="w-1.5 h-1.5 bg-teal-500 rounded-full group-hover:bg-teal-400 transition-colors"></div>
                        <span>{link.label}</span>
                      </Link>
                    </li>
                ))}
              </ul>

              {/* Business Hours */}
              {publicSettings.business_hours && (
                  <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <h4 className="font-semibold text-white mb-2">Business Hours</h4>
                    <p className="text-gray-300 text-sm whitespace-pre-line">
                      {publicSettings.business_hours}
                    </p>
                  </div>
              )}
            </div>
          </div>

          {/* Social Media & Copyright */}
          <div className="border-t border-gray-700 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              {/* Social Media Links */}
              <div className="flex space-x-3">
                {[
                  {
                    icon: Facebook,
                    href: publicSettings.facebook_url,
                    color: "hover:text-blue-400",
                    label: "Facebook"
                  },
                  {
                    icon: Twitter,
                    href: publicSettings.twitter_url,
                    color: "hover:text-sky-400",
                    label: "Twitter"
                  },
                  {
                    icon: Linkedin,
                    href: publicSettings.linkedin_url,
                    color: "hover:text-blue-500",
                    label: "LinkedIn"
                  },
                  {
                    icon: Instagram,
                    href: publicSettings.instagram_url,
                    color: "hover:text-pink-400",
                    label: "Instagram"
                  },
                  {
                    icon: Youtube,
                    href: publicSettings.youtube_url,
                    color: "hover:text-red-400",
                    label: "YouTube"
                  }
                ].map((social, index) => (
                    social.href && (
                        <a
                            key={index}
                            href={social.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`bg-gray-800 p-3 rounded-xl text-gray-400 ${social.color} transition-all duration-200 hover:bg-gray-700 transform hover:scale-110`}
                            aria-label={social.label}
                        >
                          <social.icon className="h-5 w-5" />
                        </a>
                    )
                ))}
              </div>

              <div className="text-center md:text-right">
                <p className="text-gray-400 text-sm">
                  © {new Date().getFullYear()} {publicSettings.site_name || 'HTG Infotech'}. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
  );
};

export default Footer;
