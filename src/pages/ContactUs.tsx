import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare, User, Building } from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext'; // Adjust path as needed

const ContactUs: React.FC = () => {
  const { settings } = useAdmin();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));

    alert('Thank you for your message! We will get back to you within 24 hours.');
    setFormData({ name: '', email: '', subject: '', message: '', type: 'general' });
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Contact Us</h1>
            <p className="text-xl md:text-2xl text-indigo-100 max-w-3xl mx-auto">
              We're here to help you succeed. Get in touch with our support team.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Information */}
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Get in Touch</h2>

              <div className="space-y-6">
                {/* Primary Email */}
                {settings.primaryEmail && (
                    <div className="flex items-start space-x-4">
                      <div className="bg-indigo-100 p-3 rounded-lg">
                        <Mail className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Email Support</h3>
                        <a
                            href={`mailto:${settings.primaryEmail}`}
                            className="text-gray-600 hover:text-indigo-600 transition-colors"
                        >
                          {settings.primaryEmail}
                        </a>
                        {settings.primaryEmailTagline && (
                            <p className="text-sm text-gray-500">{settings.primaryEmailTagline}</p>
                        )}
                      </div>
                    </div>
                )}

                {/* Support Email */}
                {settings.supportEmail && (
                    <div className="flex items-start space-x-4">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Mail className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Support Email</h3>
                        <a
                            href={`mailto:${settings.supportEmail}`}
                            className="text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          {settings.supportEmail}
                        </a>
                        {settings.supportEmailTagline && (
                            <p className="text-sm text-gray-500">{settings.supportEmailTagline}</p>
                        )}
                      </div>
                    </div>
                )}

                {/* Primary Phone */}
                {settings.primaryPhone && (
                    <div className="flex items-start space-x-4">
                      <div className="bg-green-100 p-3 rounded-lg">
                        <Phone className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Phone Support</h3>
                        <a
                            href={`tel:${settings.primaryPhone}`}
                            className="text-gray-600 hover:text-green-600 transition-colors"
                        >
                          {settings.primaryPhone}
                        </a>
                        {settings.primaryPhoneTagline && (
                            <p className="text-sm text-gray-500">{settings.primaryPhoneTagline}</p>
                        )}
                      </div>
                    </div>
                )}

                {/* Secondary Phone */}
                {settings.secondaryPhone && (
                    <div className="flex items-start space-x-4">
                      <div className="bg-teal-100 p-3 rounded-lg">
                        <Phone className="h-6 w-6 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Secondary Phone</h3>
                        <a
                            href={`tel:${settings.secondaryPhone}`}
                            className="text-gray-600 hover:text-teal-600 transition-colors"
                        >
                          {settings.secondaryPhone}
                        </a>
                        {settings.secondaryPhoneTagline && (
                            <p className="text-sm text-gray-500">{settings.secondaryPhoneTagline}</p>
                        )}
                      </div>
                    </div>
                )}

                {/* WhatsApp */}
                {settings.whatsappNumber && (
                    <div className="flex items-start space-x-4">
                      <div className="bg-green-100 p-3 rounded-lg">
                        <MessageSquare className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">WhatsApp</h3>
                        <a
                            href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-green-600 transition-colors"
                        >
                          {settings.whatsappNumber}
                        </a>
                        <p className="text-sm text-gray-500">Chat with us on WhatsApp</p>
                      </div>
                    </div>
                )}

                {/* Office Address */}
                {settings.address && (
                    <div className="flex items-start space-x-4">
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <MapPin className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Office Address</h3>
                        <p className="text-gray-600 whitespace-pre-line">
                          {formatAddress()}
                        </p>
                      </div>
                    </div>
                )}

                {/* Business Hours */}
                {settings.businessHours && (
                    <div className="flex items-start space-x-4">
                      <div className="bg-yellow-100 p-3 rounded-lg">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Business Hours</h3>
                        <p className="text-gray-600 whitespace-pre-line">
                          {settings.businessHours}
                        </p>
                      </div>
                    </div>
                )}
              </div>

              {/* Social Media Links */}
              {(settings.facebookUrl || settings.instagramUrl || settings.linkedinUrl || settings.twitterUrl || settings.youtubeUrl) && (
                  <div className="mt-12">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow Us</h3>
                    <div className="flex space-x-4">
                      {settings.facebookUrl && (
                          <a
                              href={settings.facebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <span className="sr-only">Facebook</span>
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                              <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                            </svg>
                          </a>
                      )}
                      {settings.instagramUrl && (
                          <a
                              href={settings.instagramUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-pink-600 transition-colors"
                          >
                            <span className="sr-only">Instagram</span>
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                              <path fillRule="evenodd" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987c6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.611-3.189-1.551-.741-.94-.741-2.137 0-3.077.741-.94 1.892-1.551 3.189-1.551 1.297 0 2.448.611 3.189 1.551.741.94.741 2.137 0 3.077-.741.94-1.892 1.551-3.189 1.551z" clipRule="evenodd" />
                            </svg>
                          </a>
                      )}
                      {settings.linkedinUrl && (
                          <a
                              href={settings.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-blue-700 transition-colors"
                          >
                            <span className="sr-only">LinkedIn</span>
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          </a>
                      )}
                      {settings.twitterUrl && (
                          <a
                              href={settings.twitterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-sky-500 transition-colors"
                          >
                            <span className="sr-only">Twitter</span>
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                            </svg>
                          </a>
                      )}
                      {settings.youtubeUrl && (
                          <a
                              href={settings.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <span className="sr-only">YouTube</span>
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                          </a>
                      )}
                    </div>
                  </div>
              )}

              {/* Quick Links */}
              <div className="mt-12">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Support</h3>
                <div className="space-y-3">
                  <a href="#" className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700">
                    <MessageSquare className="h-4 w-4" />
                    <span>Live Chat Support</span>
                  </a>
                  <a href="#" className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700">
                    <User className="h-4 w-4" />
                    <span>Customer Portal</span>
                  </a>
                  <a href="#" className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700">
                    <Building className="h-4 w-4" />
                    <span>Business Support</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                      Inquiry Type
                    </label>
                    <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="billing">Billing Question</option>
                      <option value="partnership">Partnership</option>
                      <option value="feedback">Feedback</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <input
                        type="text"
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Brief subject of your message"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                        id="message"
                        name="message"
                        required
                        rows={6}
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Please describe your inquiry in detail..."
                    />
                  </div>

                  <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Sending...</span>
                        </>
                    ) : (
                        <>
                          <Send className="h-5 w-5" />
                          <span>Send Message</span>
                        </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <p className="text-gray-600">Quick answers to common questions</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  question: "How quickly will I receive a response?",
                  answer: "We typically respond to all inquiries within 24 hours during business days. For urgent matters, please call our support line."
                },
                {
                  question: "What information should I include in my message?",
                  answer: "Please include your account details (if applicable), a clear description of your issue, and any relevant screenshots or error messages."
                },
                {
                  question: "Do you offer phone support?",
                  answer: `Yes, we offer phone support. You can reach us at ${settings.primaryPhone || 'our support number'}.`
                },
                {
                  question: "Can I schedule a consultation?",
                  answer: "Absolutely! We offer free consultations for potential business partners and enterprise clients. Please mention this in your message."
                }
              ].map((faq, index) => (
                  <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-3">{faq.question}</h3>
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
};

export default ContactUs;