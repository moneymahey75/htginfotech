import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Eye,
  FileText,
  Loader2,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Rows3,
  Trash2,
  X,
} from 'lucide-react';
import { emailTemplateDefaults, normalizeEmailMarkup, stripWordBreakTags } from '../../lib/emailTemplateDefaults';
import { supabase as adminSupabase } from '../../lib/adminClient';

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

interface EmailTemplateRow {
  tet_id: string;
  tet_name: string;
  tet_subject: string;
  tet_body: string | null;
  tet_html_body: string | null;
  tet_text_body: string | null;
  tet_template_type: string | null;
  tet_variables: string[] | null;
  tet_is_active: boolean | null;
  tet_updated_at: string | null;
  tet_created_at: string | null;
  tet_description: string | null;
  tet_category: string | null;
  tet_version: number | null;
  tet_created_by: string | null;
  tet_last_modified_by: string | null;
  tet_cc: string[] | null;
  tet_bcc: string[] | null;
  tet_from_email: string | null;
  tet_from_name: string | null;
  tet_reply_to: string | null;
  tet_metadata: Record<string, Json> | null;
}

interface EmailTemplateFormState {
  tet_id?: string;
  tet_name: string;
  tet_subject: string;
  tet_html_body: string;
  tet_template_type: string;
  tet_variables_input: string;
  tet_description: string;
  tet_cc_input: string;
  tet_bcc_input: string;
  tet_from_email: string;
  tet_from_name: string;
  tet_reply_to: string;
  tet_metadata_input: string;
}

interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const modalBackdropClassName = 'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4 py-6';
const modalPanelClassName = 'flex w-full max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FALLBACK_PLACEHOLDERS = [
  'user_name',
  'verification_link',
  'asset_url',
  'website_url',
  'logo_url',
  'site_name',
  'site_url',
];

const formatTemplateName = (templateName: string) =>
  templateName
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const parseCommaSeparatedList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const stringifyCommaSeparatedList = (value?: string[] | null) => (value && value.length ? value.join(', ') : '');

const sanitizePreviewHtml = (value: string) =>
  normalizeEmailMarkup(stripWordBreakTags(value || ''))
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .trim();

const getTemplateHtml = (template: Pick<EmailTemplateRow, 'tet_html_body' | 'tet_body'>) =>
  template.tet_html_body?.trim() || template.tet_body?.trim() || '';

const createEmptyFormState = (): EmailTemplateFormState => ({
  tet_name: '',
  tet_subject: '',
  tet_html_body: '',
  tet_template_type: '',
  tet_variables_input: '',
  tet_description: '',
  tet_cc_input: '',
  tet_bcc_input: '',
  tet_from_email: '',
  tet_from_name: '',
  tet_reply_to: '',
  tet_metadata_input: '{}',
});

const mapTemplateToFormState = (template: EmailTemplateRow): EmailTemplateFormState => ({
  tet_id: template.tet_id,
  tet_name: template.tet_name || '',
  tet_subject: template.tet_subject || '',
  tet_html_body: getTemplateHtml(template),
  tet_template_type: template.tet_template_type || '',
  tet_variables_input: stringifyCommaSeparatedList(template.tet_variables),
  tet_description: template.tet_description || '',
  tet_cc_input: stringifyCommaSeparatedList(template.tet_cc),
  tet_bcc_input: stringifyCommaSeparatedList(template.tet_bcc),
  tet_from_email: template.tet_from_email || '',
  tet_from_name: template.tet_from_name || '',
  tet_reply_to: template.tet_reply_to || '',
  tet_metadata_input: JSON.stringify(template.tet_metadata || {}, null, 2),
});

const buildInsertPayload = (template: typeof emailTemplateDefaults[number]) => ({
  tet_name: template.name,
  tet_subject: template.subject,
  tet_body: template.body,
  tet_html_body: template.body,
  tet_text_body: '',
  tet_template_type: template.templateType,
  tet_variables: template.variables,
  tet_is_active: true,
  tet_category: 'general',
  tet_description: `${template.label} default template`,
  tet_metadata: {},
});

const getFunctionClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const adminSession =
    typeof window !== 'undefined' ? localStorage.getItem('admin_session_token') || '' : '';

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Admin-Session': adminSession,
      },
    },
  });
};

const ModalShell = ({
  title,
  description,
  children,
  onClose,
  maxWidth = 'max-w-5xl',
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) => (
  <div className={modalBackdropClassName}>
    <div className={`${modalPanelClassName} ${maxWidth}`}>
      <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-6 py-5">
        <div>
          <h5 className="text-lg font-semibold text-gray-900">{title}</h5>
          {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="block space-y-2">
    <span className="text-sm font-medium text-gray-700">
      {label}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </span>
    {children}
    {hint ? <span className="block text-xs text-gray-500">{hint}</span> : null}
  </label>
);

const RichHtmlEditor = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const [isSourceMode, setIsSourceMode] = useState(true);

  const applyCommand = (command: string, commandValue?: string) => {
    if (typeof document === 'undefined') {
      return;
    }

    document.execCommand(command, false, commandValue);
    const editor = document.getElementById('email-html-editor');
    if (editor) {
      onChange(editor.innerHTML);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSourceMode(false)}
            className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
              !isSourceMode ? 'bg-indigo-600 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Rows3 className="mr-2 h-4 w-4" />
            Visual
          </button>
          <button
            type="button"
            onClick={() => setIsSourceMode(true)}
            className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
              isSourceMode ? 'bg-indigo-600 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Code2 className="mr-2 h-4 w-4" />
            HTML
          </button>
        </div>

        {!isSourceMode ? (
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'B', action: () => applyCommand('bold') },
              { label: 'I', action: () => applyCommand('italic') },
              { label: 'U', action: () => applyCommand('underline') },
              { label: 'H2', action: () => applyCommand('formatBlock', 'h2') },
              { label: 'P', action: () => applyCommand('formatBlock', 'p') },
              { label: 'UL', action: () => applyCommand('insertUnorderedList') },
              { label: 'OL', action: () => applyCommand('insertOrderedList') },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="inline-flex min-w-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isSourceMode ? (
        <textarea
          rows={16}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border-0 px-4 py-3 font-mono text-sm text-gray-900 outline-none focus:ring-0"
          placeholder="<html>...</html>"
        />
      ) : (
        <div
          id="email-html-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={(event) => onChange(event.currentTarget.innerHTML)}
          dangerouslySetInnerHTML={{ __html: value }}
          className="min-h-[420px] w-full overflow-y-auto px-4 py-3 text-sm text-gray-900 outline-none"
        />
      )}
    </div>
  );
};

const EmailTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplateRow | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateRow | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [formState, setFormState] = useState<EmailTemplateFormState>(createEmptyFormState);
  const [testTemplate, setTestTemplate] = useState<EmailTemplateRow | null>(null);
  const [testEmail, setTestEmail] = useState('');

  const functionClient = useMemo(() => getFunctionClient(), []);

  const supportedPlaceholders = useMemo(() => {
    const values = new Set(FALLBACK_PLACEHOLDERS);

    templates.forEach((template) => {
      (template.tet_variables || []).forEach((variable) => values.add(variable));
    });

    emailTemplateDefaults.forEach((template) => {
      template.variables.forEach((variable) => values.add(variable));
    });

    return Array.from(values).sort();
  }, [templates]);

  useEffect(() => {
    if (!toasts.length) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [toasts]);

  const pushToast = (type: ToastMessage['type'], message: string) => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), type, message }]);
  };

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await adminSupabase
        .from('tbl_email_templates')
        .select(
          'tet_id, tet_name, tet_subject, tet_body, tet_html_body, tet_text_body, tet_template_type, tet_variables, tet_is_active, tet_updated_at, tet_created_at, tet_description, tet_category, tet_version, tet_created_by, tet_last_modified_by, tet_cc, tet_bcc, tet_from_email, tet_from_name, tet_reply_to, tet_metadata'
        )
        .order('tet_updated_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError);
      }

      const rows = (data || []) as EmailTemplateRow[];
      const existingNames = new Set(rows.map((template) => template.tet_name));
      const missingDefaults = emailTemplateDefaults.filter((template) => !existingNames.has(template.name));

      if (missingDefaults.length) {
        const { data: insertedRows, error: insertError } = await adminSupabase
          .from('tbl_email_templates')
          .insert(missingDefaults.map(buildInsertPayload))
          .select(
            'tet_id, tet_name, tet_subject, tet_body, tet_html_body, tet_text_body, tet_template_type, tet_variables, tet_is_active, tet_updated_at, tet_created_at, tet_description, tet_category, tet_version, tet_created_by, tet_last_modified_by, tet_cc, tet_bcc, tet_from_email, tet_from_name, tet_reply_to, tet_metadata'
          );

        if (insertError) {
          throw new Error(insertError);
        }

        setTemplates([...(insertedRows as EmailTemplateRow[]), ...rows].sort((a, b) => a.tet_name.localeCompare(b.tet_name)));
        return;
      }

      setTemplates(rows.sort((a, b) => a.tet_name.localeCompare(b.tet_name)));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load email templates.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormState(createEmptyFormState());
    setIsEditorOpen(true);
  };

  const openEditModal = (template: EmailTemplateRow) => {
    setEditingTemplate(template);
    setFormState(mapTemplateToFormState(template));
    setIsEditorOpen(true);
  };

  const closeEditorModal = () => {
    if (saving) {
      return;
    }

    setIsEditorOpen(false);
    setEditingTemplate(null);
    setFormState(createEmptyFormState());
  };

  const handleDeleteTemplate = async (template: EmailTemplateRow) => {
    const templateLabel = formatTemplateName(template.tet_name);
    const confirmed = window.confirm(`Delete the "${templateLabel}" email template?`);

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: deleteError } = await adminSupabase
        .from('tbl_email_templates')
        .delete()
        .eq('tet_id', template.tet_id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setTemplates((current) => current.filter((item) => item.tet_id !== template.tet_id));
      pushToast('success', 'Email template deleted successfully.');

      if (previewTemplate?.tet_id === template.tet_id) {
        setPreviewTemplate(null);
      }

      if (testTemplate?.tet_id === template.tet_id) {
        setTestTemplate(null);
        setTestEmail('');
      }

      if (editingTemplate?.tet_id === template.tet_id) {
        closeEditorModal();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete email template.');
    } finally {
      setSaving(false);
    }
  };

  const handleFormFieldChange = <K extends keyof EmailTemplateFormState>(
    key: K,
    value: EmailTemplateFormState[K]
  ) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const handleTemplateNameBlur = () => {
    if (editingTemplate || !formState.tet_name.trim()) {
      return;
    }

    const matchedDefault = emailTemplateDefaults.find((template) => template.name === formState.tet_name.trim());
    if (!matchedDefault) {
      return;
    }

    setFormState((current) => ({
      ...current,
      tet_subject: current.tet_subject || matchedDefault.subject,
      tet_html_body: current.tet_html_body || matchedDefault.body,
      tet_template_type: current.tet_template_type || matchedDefault.templateType,
      tet_variables_input: current.tet_variables_input || matchedDefault.variables.join(', '),
      tet_description: current.tet_description || `${matchedDefault.label} default template`,
    }));
  };

  const handleSaveTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const templateName = formState.tet_name.trim();
    const subject = formState.tet_subject.trim();
    const htmlBody = sanitizePreviewHtml(formState.tet_html_body);
    const textBody = editingTemplate?.tet_text_body?.trim() || '';
    const templateType = formState.tet_template_type.trim() || null;
    const variables = parseCommaSeparatedList(formState.tet_variables_input);
    const cc = parseCommaSeparatedList(formState.tet_cc_input);
    const bcc = parseCommaSeparatedList(formState.tet_bcc_input);
    const fromEmail = formState.tet_from_email.trim();
    const replyTo = formState.tet_reply_to.trim();

    if (!templateName || !subject || !htmlBody) {
      setError('Template name, subject, and HTML body are required.');
      return;
    }

    if (fromEmail && !emailPattern.test(fromEmail)) {
      setError('From email address is invalid.');
      return;
    }

    if (replyTo && !emailPattern.test(replyTo)) {
      setError('Reply-to email address is invalid.');
      return;
    }

    let metadata: Record<string, Json> = {};
    try {
      const parsedMetadata = formState.tet_metadata_input.trim() ? JSON.parse(formState.tet_metadata_input) : {};
      if (parsedMetadata && typeof parsedMetadata === 'object' && !Array.isArray(parsedMetadata)) {
        metadata = parsedMetadata as Record<string, Json>;
      } else {
        throw new Error('Metadata must be a JSON object.');
      }
    } catch (metadataError) {
      setError(metadataError instanceof Error ? metadataError.message : 'Metadata must be valid JSON.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        tet_name: templateName,
        tet_subject: subject,
        tet_body: htmlBody,
        tet_html_body: htmlBody,
        tet_text_body: textBody || null,
        tet_template_type: templateType,
        tet_variables: variables,
        tet_description: formState.tet_description.trim() || null,
        tet_category: editingTemplate?.tet_category?.trim() || 'general',
        tet_is_active: editingTemplate?.tet_is_active ?? true,
        tet_cc: cc.length ? cc : null,
        tet_bcc: bcc.length ? bcc : null,
        tet_from_email: fromEmail || null,
        tet_from_name: formState.tet_from_name.trim() || null,
        tet_reply_to: replyTo || null,
        tet_metadata: metadata,
      };

      if (editingTemplate?.tet_id) {
        const { data: updatedRows, error: updateError } = await adminSupabase
          .from('tbl_email_templates')
          .update(payload)
          .eq('tet_id', editingTemplate.tet_id)
          .select(
            'tet_id, tet_name, tet_subject, tet_body, tet_html_body, tet_text_body, tet_template_type, tet_variables, tet_is_active, tet_updated_at, tet_created_at, tet_description, tet_category, tet_version, tet_created_by, tet_last_modified_by, tet_cc, tet_bcc, tet_from_email, tet_from_name, tet_reply_to, tet_metadata'
          );

        if (updateError) {
          throw new Error(updateError);
        }

        const updatedTemplate = ((updatedRows as EmailTemplateRow[] | null) || [])[0];
        if (!updatedTemplate) {
          throw new Error('Template update did not return a record.');
        }

        setTemplates((current) =>
          current
            .map((template) => (template.tet_id === updatedTemplate.tet_id ? updatedTemplate : template))
            .sort((a, b) => a.tet_name.localeCompare(b.tet_name))
        );
        pushToast('success', 'Email template updated successfully.');
      } else {
        const { data: insertedRows, error: insertError } = await adminSupabase
          .from('tbl_email_templates')
          .insert(payload)
          .select(
            'tet_id, tet_name, tet_subject, tet_body, tet_html_body, tet_text_body, tet_template_type, tet_variables, tet_is_active, tet_updated_at, tet_created_at, tet_description, tet_category, tet_version, tet_created_by, tet_last_modified_by, tet_cc, tet_bcc, tet_from_email, tet_from_name, tet_reply_to, tet_metadata'
          );

        if (insertError) {
          throw new Error(insertError);
        }

        const insertedTemplate = ((insertedRows as EmailTemplateRow[] | null) || [])[0];
        if (!insertedTemplate) {
          throw new Error('Template creation did not return a record.');
        }

        setTemplates((current) => [...current, insertedTemplate].sort((a, b) => a.tet_name.localeCompare(b.tet_name)));
        pushToast('success', 'Email template created successfully.');
      }

      closeEditorModal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save email template.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!functionClient || !testTemplate) {
      return;
    }

    const normalizedEmail = testEmail.trim();
    if (!emailPattern.test(normalizedEmail)) {
      setError('Please enter a valid test email address.');
      return;
    }

    setSendingTest(true);
    setError(null);

    try {
      const { data, error: invokeError } = await functionClient.functions.invoke('send-template-test-email', {
        body: {
          templateName: testTemplate.tet_name,
          email: normalizedEmail,
        },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send test email.');
      }

      pushToast('success', `Test email sent to ${normalizedEmail}.`);
      setTestEmail('');
      setTestTemplate(null);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send test email.');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="mt-8 border-t border-gray-200 pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-indigo-100 p-3">
            <FileText className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Email Templates</h4>
            <p className="text-gray-600">
              Manage email templates.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadTemplates()}
            disabled={loading}
            className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          ><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /></button>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">Something went wrong</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Template Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Subject
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <div className="inline-flex items-center gap-3 rounded-full bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    Loading templates...
                  </div>
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500">
                  No email templates found.
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.tet_id}>
                  <td className="px-4 py-4 align-top">
                    <div className="text-sm font-medium text-gray-900">{formatTemplateName(template.tet_name)}</div>
                    <div className="mt-1 text-xs text-gray-500">{template.tet_category || 'general'}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">{template.tet_subject}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        template.tet_is_active
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
                      }`}
                    >
                      {template.tet_is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewTemplate(template)}
                        title="View template"
                        aria-label={`View ${formatTemplateName(template.tet_name)}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-700 transition hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(template)}
                        title="Edit template"
                        aria-label={`Edit ${formatTemplateName(template.tet_name)}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-200 text-indigo-700 transition hover:bg-indigo-50"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTestTemplate(template);
                          setTestEmail('');
                        }}
                        title="Send test email"
                        aria-label={`Send test email for ${formatTemplateName(template.tet_name)}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-300 text-indigo-700 transition hover:bg-indigo-50"
                      >
                        <Mail className="h-4 w-4" />
                        <span className="sr-only">Send Test Email</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(template)}
                        title="Delete template"
                        aria-label={`Delete ${formatTemplateName(template.tet_name)}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
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
        Supported placeholders:{' '}
        {supportedPlaceholders.map((placeholder, index) => (
          <React.Fragment key={placeholder}>
            <code className="rounded bg-white px-1.5 py-0.5 text-[13px] text-gray-700">{`{{${placeholder}}}`}</code>
            {index < supportedPlaceholders.length - 1 ? ', ' : ''}
          </React.Fragment>
        ))}
      </div>

      {isEditorOpen ? (
        <ModalShell
          title={editingTemplate ? 'Edit Email Template' : 'Add New Email Template'}
          description="Update template content, delivery fields, and supported placeholders."
          onClose={closeEditorModal}
        >
          <form onSubmit={handleSaveTemplate} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="grid flex-1 gap-5 overflow-y-auto px-6 py-5 lg:grid-cols-2">
              <Field label="Template Name" required hint="Use a unique snake_case key such as verification_email.">
                <input
                  type="text"
                  value={formState.tet_name}
                  onChange={(event) => handleFormFieldChange('tet_name', event.target.value)}
                  onBlur={handleTemplateNameBlur}
                  disabled={Boolean(editingTemplate)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="verification_email"
                />
              </Field>

              <Field label="Template Type" hint="Optional internal type for downstream email logic.">
                <input
                  type="text"
                  value={formState.tet_template_type}
                  onChange={(event) => handleFormFieldChange('tet_template_type', event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  placeholder="email_verification"
                />
              </Field>

              <div className="lg:col-span-2">
                <Field label="Subject" required>
                  <input
                    type="text"
                    value={formState.tet_subject}
                    onChange={(event) => handleFormFieldChange('tet_subject', event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    placeholder="Verify your email address - {{site_name}}"
                  />
                </Field>
              </div>

              <div className="lg:col-span-2">
                <Field
                  label="HTML Body"
                  required
                  hint="Rendered in the preview modal inside a sandboxed iframe."
                >
                  <RichHtmlEditor
                    value={formState.tet_html_body}
                    onChange={(value) => handleFormFieldChange('tet_html_body', value)}
                  />
                </Field>
              </div>

              <div className="lg:col-span-2">
                <Field label="Variables" hint="Comma-separated list that will be saved as a JSON array.">
                  <textarea
                    rows={3}
                    value={formState.tet_variables_input}
                    onChange={(event) => handleFormFieldChange('tet_variables_input', event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    placeholder="user_name, verification_link, site_name"
                  />
                </Field>
              </div>

            </div>

            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={closeEditorModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {previewTemplate ? (
        <ModalShell
          title={formatTemplateName(previewTemplate.tet_name)}
          description={previewTemplate.tet_subject}
          onClose={() => setPreviewTemplate(null)}
          maxWidth="max-w-6xl"
        >
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                Preview is sandboxed inside an iframe for safer rendering of template HTML.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <iframe
                title={`Preview ${previewTemplate.tet_name}`}
                srcDoc={sanitizePreviewHtml(getTemplateHtml(previewTemplate))}
                className="h-[70vh] w-full bg-white"
                sandbox="allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>
        </ModalShell>
      ) : null}

      {testTemplate ? (
        <ModalShell
          title="Send Test Email"
          description={`Send a test copy of ${formatTemplateName(testTemplate.tet_name)} to any email address.`}
          onClose={() => {
            if (!sendingTest) {
              setTestTemplate(null);
              setTestEmail('');
            }
          }}
          maxWidth="max-w-md"
        >
          <div className="space-y-5 px-6 py-5">
            <Field label="Email Address" required>
              <input
                type="email"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="test@example.com"
              />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={() => {
                setTestTemplate(null);
                setTestEmail('');
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={sendingTest}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              {sendingTest ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </ModalShell>
      ) : null}

      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border p-4 shadow-lg ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-white'
                : 'border-red-200 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
              )}
              <p className="text-sm font-medium text-gray-800">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailTemplateManager;
