import React from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Youtube, MessageCircle } from 'lucide-react';

const Footer: React.FC = () => {
  const { settings } = useAdmin();

  // Format the full address from individual components
  const formatAddress = () => {
    const parts = [
      settings.address,
      settings.city,
      settings.state,
      settings.zipCode,
      settings.country
    ].filter(part => part && part.trim() !== '');

    return parts.join(', ');
  };

  return (
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative">
                  <img
                      src={settings.logoUrl}
                      alt={settings.siteName}
                      className="h-12 w-12 object-cover rounded-lg shadow-lg"
                      onError={(e) => {
                        // Fallback to default logo if image fails to load
                        (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop';
                      }}
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    {settings.siteName}
                  </h2>
                  {settings.tagline && (
                      <p className="text-gray-300 text-sm mt-1">{settings.tagline}</p>
                  )}
                </div>
              </div>

              {settings.aboutText ? (
                  <p className="text-gray-300 mb-6 leading-relaxed max-w-md">
                    {settings.aboutText}
                  </p>
              ) : (
                  <p className="text-gray-300 mb-6 leading-relaxed max-w-md">
                    {settings.siteName} is your gateway to growth - a comprehensive platform connecting learners, trainers, job seekers, and job providers.
                    We bridge the gap between education and opportunities, empowering you to learn, get hired, build teams, and share knowledge - all in one place.
                  </p>
              )}

              {/* Contact Info */}
              <div className="space-y-3">
                {/* Primary Email */}
                {settings.primaryEmail && (
                    <a
                        href={`mailto:${settings.primaryEmail}`}
                        className="flex items-center space-x-3 text-gray-300 hover:text-emerald-400 transition-colors duration-200 group"
                    >
                      <div className="bg-emerald-600 p-2 rounded-lg group-hover:bg-emerald-500 transition-colors">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <span>{settings.primaryEmail}</span>
                        {settings.primaryEmailTagline && (
                            <span className="text-sm text-gray-400 block">{settings.primaryEmailTagline}</span>
                        )}
                      </div>
                    </a>
                )}

                {/* Support Email */}
                {settings.supportEmail && settings.supportEmail !== settings.primaryEmail && (
                    <a
                        href={`mailto:${settings.supportEmail}`}
                        className="flex items-center space-x-3 text-gray-300 hover:text-blue-400 transition-colors duration-200 group"
                    >
                      <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-500 transition-colors">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <span>{settings.supportEmail}</span>
                        {settings.supportEmailTagline && (
                            <span className="text-sm text-gray-400 block">{settings.supportEmailTagline}</span>
                        )}
                      </div>
                    </a>
                )}

                {/* Primary Phone */}
                {settings.primaryPhone && (
                    <a
                        href={`tel:${settings.primaryPhone}`}
                        className="flex items-center space-x-3 text-gray-300 hover:text-teal-400 transition-colors duration-200 group"
                    >
                      <div className="bg-teal-600 p-2 rounded-lg group-hover:bg-teal-500 transition-colors">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div>
                        <span>{settings.primaryPhone}</span>
                        {settings.primaryPhoneTagline && (
                            <span className="text-sm text-gray-400 block">{settings.primaryPhoneTagline}</span>
                        )}
                      </div>
                    </a>
                )}

                {/* Secondary Phone */}
                {settings.secondaryPhone && (
                    <a
                        href={`tel:${settings.secondaryPhone}`}
                        className="flex items-center space-x-3 text-gray-300 hover:text-cyan-400 transition-colors duration-200 group"
                    >
                      <div className="bg-cyan-600 p-2 rounded-lg group-hover:bg-cyan-500 transition-colors">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div>
                        <span>{settings.secondaryPhone}</span>
                        {settings.secondaryPhoneTagline && (
                            <span className="text-sm text-gray-400 block">{settings.secondaryPhoneTagline}</span>
                        )}
                      </div>
                    </a>
                )}

                {/* WhatsApp */}
                {settings.whatsappNumber && (
                    <a
                        href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 text-gray-300 hover:text-green-400 transition-colors duration-200 group"
                    >
                      <div className="bg-green-600 p-2 rounded-lg group-hover:bg-green-500 transition-colors">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <span>WhatsApp: {settings.whatsappNumber}</span>
                        <span className="text-sm text-gray-400 block">Chat with us</span>
                      </div>
                    </a>
                )}

                {/* Address */}
                {settings.address && (
                    <div className="flex items-start space-x-3 text-gray-300">
                      <div className="bg-purple-600 p-2 rounded-lg">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <p className="text-gray-300 text-sm whitespace-pre-line">
                          <address>
                            {formatAddress()}
                          </address>
                        </p>
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
              {settings.businessHours && (
                  <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <h4 className="font-semibold text-white mb-2">Business Hours</h4>
                    <p className="text-gray-300 text-sm whitespace-pre-line">
                      {settings.businessHours}
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
                    href: settings.facebookUrl,
                    color: "hover:text-blue-400",
                    label: "Facebook"
                  },
                  {
                    icon: Twitter,
                    href: settings.twitterUrl,
                    color: "hover:text-sky-400",
                    label: "Twitter"
                  },
                  {
                    icon: Linkedin,
                    href: settings.linkedinUrl,
                    color: "hover:text-blue-500",
                    label: "LinkedIn"
                  },
                  {
                    icon: Instagram,
                    href: settings.instagramUrl,
                    color: "hover:text-pink-400",
                    label: "Instagram"
                  },
                  {
                    icon: Youtube,
                    href: settings.youtubeUrl,
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
                  © {new Date().getFullYear()} {settings.siteName || 'HTG Infotech'}. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
  );
};

export default Footer;