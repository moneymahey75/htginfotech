import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/adminClient';
import { emailTemplateDefaults, stripWordBreakTags } from '../../lib/emailTemplateDefaults';
import { Eye, Mail, Pencil, Save, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { buildAbsoluteUrl } from '../../utils/baseUrl';

interface EmailTemplateRow {
  tet_id?: string;
  tet_name: 'verification_email' | 'welcome_email';
  tet_subject: string;
  tet_body: string;
  tet_template_type: string;
  tet_variables: string[];
  tet_is_active?: boolean;
  tet_updated_at?: string;
}

const formatTemplateName = (templateName: string) =>
  templateName === 'verification_email' ? 'Verification Email' : 'Welcome Email';

const formatDate = (value?: string) => {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Never';
  }

  return date.toLocaleString();
};

const EmailTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateRow | null>(null);
  const [editForm, setEditForm] = useState({ subject: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [testTemplate, setTestTemplate] = useState<EmailTemplateRow | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data: existingTemplates, error } = await supabase
        .from('tbl_email_templates')
        .select('*')
        .in('tet_name', ['verification_email', 'welcome_email'])
        .order('tet_name');

      if (error) {
        throw new Error(error.message);
      }

      const existingNames = new Set((existingTemplates || []).map((template: any) => template.tet_name));
      const missingTemplates = emailTemplateDefaults
        .filter((template) => !existingNames.has(template.name))
        .map((template) => ({
          tet_name: template.name,
          tet_subject: template.subject,
          tet_body: template.body,
          tet_template_type: template.templateType,
          tet_variables: template.variables,
          tet_is_active: true,
          tet_updated_at: new Date().toISOString(),
        }));

      let finalTemplates = (existingTemplates || []) as EmailTemplateRow[];

      if (missingTemplates.length > 0) {
        const { data: insertedTemplates, error: insertError } = await supabase
          .from('tbl_email_templates')
          .insert(missingTemplates)
          .select('*');

        if (insertError) {
          throw new Error(insertError.message);
        }

        finalTemplates = [...finalTemplates, ...((insertedTemplates || []) as EmailTemplateRow[])];
      }

      const templatesNeedingCleanup = finalTemplates.filter((template) => {
        const cleanedSubject = stripWordBreakTags(template.tet_subject || '');
        const cleanedBody = stripWordBreakTags(template.tet_body || '');
        return cleanedSubject !== template.tet_subject || cleanedBody !== template.tet_body;
      });

      if (templatesNeedingCleanup.length > 0) {
        await Promise.all(
          templatesNeedingCleanup.map((template) =>
            supabase
              .from('tbl_email_templates')
              .update({
                tet_subject: stripWordBreakTags(template.tet_subject || ''),
                tet_body: stripWordBreakTags(template.tet_body || ''),
                tet_updated_at: new Date().toISOString(),
              })
              .eq('tet_name', template.tet_name)
          )
        );

        finalTemplates = finalTemplates.map((template) => ({
          ...template,
          tet_subject: stripWordBreakTags(template.tet_subject || ''),
          tet_body: stripWordBreakTags(template.tet_body || ''),
        }));
      }

      finalTemplates.sort((a, b) => a.tet_name.localeCompare(b.tet_name));
      setTemplates(finalTemplates);
    } catch (error) {
      console.error('Failed to load email templates:', error);
      setResult({
        success: false,
        message: 'Failed to load email templates.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openPreview = (template: EmailTemplateRow) => {
    if (!template.tet_id) {
      setResult({
        success: false,
        message: 'Template preview is unavailable because the template record is missing.',
      });
      return;
    }

    if (!template.tet_body || !template.tet_body.trim()) {
      setResult({
        success: false,
        message: 'Template HTML is empty. Please update the template before previewing it.',
      });
      return;
    }

    const previewUrl = `${buildAbsoluteUrl('/admin/email-template/preview')}?id=${encodeURIComponent(template.tet_id)}`;
    const previewWindow = window.open(previewUrl, '_blank', 'noopener,noreferrer');

    if (!previewWindow) {
      setResult({
        success: false,
        message: 'Preview tab was blocked by the browser.',
      });
    }
  };

  const openEditModal = (template: EmailTemplateRow) => {
    setEditingTemplate(template);
    setEditForm({
      subject: template.tet_subject,
      body: template.tet_body,
    });
  };

  const saveTemplate = async () => {
    if (!editingTemplate) {
      return;
    }

    setSaving(true);
    setResult(null);

    try {
      const { error } = await supabase
        .from('tbl_email_templates')
        .update({
          tet_subject: stripWordBreakTags(editForm.subject),
          tet_body: stripWordBreakTags(editForm.body),
          tet_updated_at: new Date().toISOString(),
        })
        .eq('tet_name', editingTemplate.tet_name);

      if (error) {
        throw new Error(error.message);
      }

      setResult({
        success: true,
        message: `${formatTemplateName(editingTemplate.tet_name)} updated successfully.`,
      });
      setEditingTemplate(null);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to save email template:', error);
      setResult({
        success: false,
        message: 'Failed to save email template.',
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testTemplate) {
      return;
    }

    const normalizedEmail = testEmail.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      setResult({
        success: false,
        message: 'Please enter a valid email address for the test email.',
      });
      return;
    }

    setSendingTest(true);
    setResult(null);

    try {
      const adminSession = localStorage.getItem('admin_session_token');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-template-test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Session': adminSession || '',
        },
        body: JSON.stringify({
          templateName: testTemplate.tet_name,
          email: normalizedEmail,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to send test email');
      }

      setResult({
        success: true,
        message: `Test email sent to ${normalizedEmail}.`,
      });
      setTestTemplate(null);
      setTestEmail('');
    } catch (error) {
      console.error('Failed to send test email:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send test email.',
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="mt-8 border-t border-gray-200 pt-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-indigo-100 p-3 rounded-lg">
          <FileText className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Email Templates</h4>
          <p className="text-gray-600">Manage signup-related email templates used for verification and welcome emails.</p>
        </div>
      </div>

      {result && (
        <div className={`border rounded-lg p-4 mb-6 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center space-x-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.message}
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Template Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Last Updated</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-gray-500">Loading templates...</td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-gray-500">No email templates found.</td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.tet_name}>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">{formatTemplateName(template.tet_name)}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{template.tet_subject}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{formatDate(template.tet_updated_at)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openPreview(template)}
                        className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestTemplate(template)}
                        className="inline-flex items-center rounded-lg border border-indigo-300 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Send Test Email
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(template)}
                        className="inline-flex items-center rounded-lg border border-purple-300 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Template
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
        Supported placeholders: <code>{'{{user_name}}'}</code>, <code>{'{{verification_link}}'}</code>, <code>{'{{logo_url}}'}</code>, <code>{'{{site_name}}'}</code>, <code>{'{{site_url}}'}</code>
      </div>

      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h5 className="text-lg font-semibold text-gray-900">Edit {formatTemplateName(editingTemplate.tet_name)}</h5>
                <p className="text-sm text-gray-600">Update the subject and HTML content used at runtime.</p>
              </div>
              <button type="button" onClick={() => setEditingTemplate(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  value={editForm.subject}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, subject: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">HTML Content</label>
                <textarea
                  value={editForm.body}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, body: event.target.value }))}
                  rows={18}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTemplate}
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {testTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h5 className="text-lg font-semibold text-gray-900">Send Test Email</h5>
                <p className="text-sm text-gray-600">{formatTemplateName(testTemplate.tet_name)}</p>
              </div>
              <button type="button" onClick={() => setTestTemplate(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="test@example.com"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setTestTemplate(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendTestEmail}
                disabled={sendingTest}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mail className="mr-2 h-4 w-4" />
                {sendingTest ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateManager;
