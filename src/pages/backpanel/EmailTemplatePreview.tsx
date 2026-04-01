import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/adminClient';
import { useAdmin } from '../../contexts/AdminContext';
import { normalizeEmailMarkup, replaceTemplatePlaceholders, stripWordBreakTags } from '../../lib/emailTemplateDefaults';
import { AlertCircle, Loader2 } from 'lucide-react';
import { getBaseUrl } from '../../utils/baseUrl';

interface EmailTemplateRow {
  tet_id: string;
  tet_name: 'verification_email' | 'welcome_email' | 'contact_admin_email' | 'contact_confirmation_email' | 'password_reset';
  tet_subject: string;
  tet_body: string;
}

const EmailTemplatePreview: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { settings } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [template, setTemplate] = useState<EmailTemplateRow | null>(null);
  const templateId = searchParams.get('id');
  const baseUrl = settings.website_url || getBaseUrl();
  const logoUrl = `${baseUrl}/htginfotech-logo.png`;

  const previewVariables = useMemo(() => ({
    user_name: 'Test User',
    first_name: 'Test',
    sender_name: 'Test User',
    sender_email: 'test@example.com',
    verification_link: `${baseUrl}/auth/callback?type=email_verification&token=preview-token`,
    reset_password_link: `${baseUrl}/auth/callback?type=recovery&token=preview-reset-token`,
    contact_subject: 'Need help with enrollment',
    message_body: 'Hello team,\nI would like to know more about your available programs and enrollment steps.',
    inquiry_type: 'General',
    submitted_at: new Date().toLocaleString(),
    page_url: baseUrl,
    support_email: settings.primary_email || 'support@example.com',
    asset_url: baseUrl,
    website_url: baseUrl,
    logo_url: logoUrl,
    site_name: settings.site_name || 'HTG Infotech',
    site_url: baseUrl,
    current_year: String(new Date().getFullYear()),
  }), [baseUrl, logoUrl, settings.primary_email, settings.site_name]);

  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId) {
        setError('Template ID is missing.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('tbl_email_templates')
          .select('tet_id, tet_name, tet_subject, tet_body')
          .eq('tet_id', templateId)
          .single();

        if (fetchError || !data) {
          throw new Error('Email template not found.');
        }

        if (!data.tet_body || !data.tet_body.trim()) {
          throw new Error('Email template HTML is empty.');
        }

        setTemplate(data as EmailTemplateRow);
      } catch (err) {
        console.error('Failed to load email template preview:', err);
        setError(err instanceof Error ? err.message : 'Failed to load email template preview.');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId]);

  const renderedHtml = template
    ? normalizeEmailMarkup(stripWordBreakTags(replaceTemplatePlaceholders(template.tet_body, previewVariables)))
    : '';

  useEffect(() => {
    if (template?.tet_subject) {
      document.title = `${template.tet_subject} - Email Preview`;
    }
  }, [template?.tet_subject]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="flex items-center space-x-3 rounded-xl bg-white px-6 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span className="text-sm font-medium text-gray-700">Loading email preview...</span>
        </div>
      </div>
    );
  }

  if (error || !template || !renderedHtml.trim()) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-lg rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-4 flex items-center space-x-3">
            <div className="rounded-full bg-red-100 p-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Preview Unavailable</h1>
              <p className="text-sm text-gray-600">The selected template could not be rendered.</p>
            </div>
          </div>
          <p className="text-sm text-red-700">{error || 'Email template HTML is invalid.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">{template.tet_subject}</h1>
        <p className="text-sm text-gray-600">Rendered preview with test placeholder values.</p>
      </div>
      <iframe
        title="Email Template Preview"
        srcDoc={renderedHtml}
        className="h-[calc(100vh-73px)] w-full bg-white"
        sandbox="allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
};

export default EmailTemplatePreview;
