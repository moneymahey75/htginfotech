import React, { useEffect, useState } from 'react';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';
import { invokeSupabaseFunction } from '../lib/supabase';
import ReCaptcha from '../components/ui/ReCaptcha';
import {
  ContactUsContent,
  defaultContactUsContent,
  getContentByKey,
  parseContactUsContent,
} from '../lib/content';

const ContactUs: React.FC = () => {
  const [content, setContent] = useState<ContactUsContent>(defaultContactUsContent);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      const entry = await getContentByKey('contact_us');
      if (isMounted) {
        setContent(parseContactUsContent(entry?.content));
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetCaptcha = () => {
    setRecaptchaToken(null);
    setCaptchaResetSignal((current) => current + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitResult(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setSubmitResult({
        success: false,
        message: 'Please fill in all required fields before submitting.'
      });
      return;
    }

    if (!recaptchaToken) {
      setSubmitResult({
        success: false,
        message: 'Please complete the Cloudflare verification before submitting.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await invokeSupabaseFunction('send-contact-email', {
        body: {
          ...formData,
          pageUrl: window.location.href,
          sendConfirmation: true,
          metadata: {
            userAgent: navigator.userAgent,
          },
          turnstileToken: recaptchaToken,
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to send your message. Please try again.');
      }

      setSubmitResult({
        success: true,
        message: data?.warning || 'Thank you for your message! We will get back to you within 24 hours.'
      });
      setFormData({ name: '', email: '', subject: '', message: '', type: 'general' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      resetCaptcha();
      console.error('Contact form submission failed:', error);
      const errorMessage = error instanceof Error ? error.message : null;
      const detailedMessage =
        error &&
        typeof error === 'object' &&
        'context' in error &&
        typeof (error as { context?: unknown }).context === 'string'
          ? (() => {
              try {
                const parsed = JSON.parse((error as { context: string }).context);
                return typeof parsed?.error === 'string' ? parsed.error : null;
              } catch {
                return null;
              }
            })()
          : null;

      setSubmitResult({
        success: false,
        message: (detailedMessage || errorMessage)
          ? `${detailedMessage || errorMessage} Please contact the admin if the issue continues.`
          : 'There is some error. Please contact the admin.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
      <div className="min-h-screen bg-gray-50">
        <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">{content.hero.title}</h1>
            <p className="text-xl md:text-2xl text-indigo-100 max-w-3xl mx-auto">
              {content.hero.subtitle}
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex justify-center">
            <div className="w-full">
              <div className="rounded-2xl bg-white p-5 shadow-lg sm:p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{content.form.title}</h2>

                {submitResult && (
                  <div className={`border rounded-lg p-4 mb-6 ${
                    submitResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {submitResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        submitResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {submitResult.message}
                      </span>
                    </div>
                  </div>
                )}

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

                  <ReCaptcha action="contact_us" onVerify={setRecaptchaToken} resetSignal={captchaResetSignal} />

                  <button
                      type="submit"
                      disabled={isSubmitting || !recaptchaToken}
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

          <section className="mt-20">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-gray-900">{content.faq.title}</h2>
              <p className="mt-4 text-gray-600">{content.faq.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {content.faq.items.map((faq) => (
                <article key={faq.question} className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
                  <h3 className="mb-3 font-semibold text-gray-900">{faq.question}</h3>
                  <p className="leading-relaxed text-gray-600">{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
  );
};

export default ContactUs;
