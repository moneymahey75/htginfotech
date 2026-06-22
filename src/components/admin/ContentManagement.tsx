import React, { useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ArrowLeft, Edit, FileText, Loader2, RefreshCw, Save, X } from 'lucide-react';
import {
  AboutUsContent,
  ContactUsContent,
  ContentEntry,
  ContentKey,
  contentDefinitions,
  CONTENT_NOT_AVAILABLE,
  defaultAboutUsContent,
  defaultContactUsContent,
  listContentEntriesForAdmin,
  parseAboutUsContent,
  parseContactUsContent,
  updateContentByKeyForAdmin,
} from '../../lib/content';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const formatUpdatedAt = (value?: string | null) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

const quillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'link',
  'image',
];

const aboutIconOptions: AboutUsContent['values']['items'][number]['icon'][] = ['shield', 'heart', 'users', 'zap'];
const impactIconOptions: AboutUsContent['impact']['stats'][number]['icon'][] = ['users', 'globe', 'trending', 'award'];

const ContentManagement: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<ContentKey | null>(null);
  const [draftContent, setDraftContent] = useState('');

  const canWrite = hasPermission('content', 'write');

  const entriesByKey = useMemo(() => {
    return new Map(entries.map((entry) => [entry.key, entry]));
  }, [entries]);

  const editingEntry = editingKey ? entriesByKey.get(editingKey) : null;
  const editingDefinition = editingKey ? contentDefinitions.find((item) => item.key === editingKey) : null;
  const aboutDraft = useMemo(() => parseAboutUsContent(draftContent), [draftContent]);
  const contactDraft = useMemo(() => parseContactUsContent(draftContent), [draftContent]);
  const copyrightVariables = useMemo(
    () => [
      { token: '{{year}}', value: String(new Date().getFullYear()) },
      { token: '{{current_year}}', value: String(new Date().getFullYear()) },
      { token: '{{copyright_symbol}}', value: '(c)' },
      { token: '{{rights_reserved}}', value: 'All rights reserved.' },
    ],
    []
  );

  const loadEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listContentEntriesForAdmin();
      setEntries(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load content entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const startEditing = (key: ContentKey) => {
    const entry = entriesByKey.get(key);
    setEditingKey(key);
    setDraftContent(entry?.content || '');
    setError(null);
    setSuccess(null);
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setDraftContent('');
    setError(null);
    setSuccess(null);
  };

  const saveContent = async () => {
    if (!editingKey || !canWrite) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedEntry = await updateContentByKeyForAdmin(editingKey, draftContent);
      setEntries((current) =>
        current.map((entry) =>
          entry.key === editingKey
            ? {
                ...entry,
                content: updatedEntry.content ?? draftContent,
                updated_at: updatedEntry.updated_at || new Date().toISOString(),
              }
            : entry
        )
      );
      setSuccess('Content saved successfully.');
      setEditingKey(null);
      setDraftContent('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save content.');
    } finally {
      setSaving(false);
    }
  };

  const appendTokenToDraft = (token: string) => {
    setDraftContent((current) => `${current}${current && !/\s$/.test(current) ? ' ' : ''}${token}`);
  };

  const setAboutDraft = (updater: (current: AboutUsContent) => AboutUsContent) => {
    setDraftContent((current) => JSON.stringify(updater(parseAboutUsContent(current)), null, 2));
  };

  const updateAboutSection = <Section extends keyof AboutUsContent>(
    section: Section,
    field: keyof AboutUsContent[Section],
    value: string
  ) => {
    setAboutDraft((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const updateMilestone = (
    index: number,
    field: keyof AboutUsContent['story']['milestones'][number],
    value: string
  ) => {
    setAboutDraft((current) => ({
      ...current,
      story: {
        ...current.story,
        milestones: current.story.milestones.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const updateValueItem = (
    index: number,
    field: keyof AboutUsContent['values']['items'][number],
    value: string
  ) => {
    setAboutDraft((current) => ({
      ...current,
      values: {
        ...current.values,
        items: current.values.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const updateLeader = (
    index: number,
    field: keyof AboutUsContent['leadership']['members'][number],
    value: string
  ) => {
    setAboutDraft((current) => ({
      ...current,
      leadership: {
        ...current.leadership,
        members: current.leadership.members.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const updateImpactStat = (
    index: number,
    field: keyof AboutUsContent['impact']['stats'][number],
    value: string
  ) => {
    setAboutDraft((current) => ({
      ...current,
      impact: {
        ...current.impact,
        stats: current.impact.stats.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const resetAboutDraft = () => {
    setDraftContent(JSON.stringify(defaultAboutUsContent, null, 2));
  };

  const setContactDraft = (updater: (current: ContactUsContent) => ContactUsContent) => {
    setDraftContent((current) => JSON.stringify(updater(parseContactUsContent(current)), null, 2));
  };

  const updateContactSection = <Section extends keyof ContactUsContent>(
    section: Section,
    field: keyof ContactUsContent[Section],
    value: string
  ) => {
    setContactDraft((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const updateContactFaqItem = (
    index: number,
    field: keyof ContactUsContent['faq']['items'][number],
    value: string
  ) => {
    setContactDraft((current) => ({
      ...current,
      faq: {
        ...current.faq,
        items: current.faq.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const resetContactDraft = () => {
    setDraftContent(JSON.stringify(defaultContactUsContent, null, 2));
  };

  if (editingKey && editingDefinition) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <button
              type="button"
              onClick={cancelEditing}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Content List
            </button>
            <h3 className="text-xl font-semibold text-gray-900">Edit Content</h3>
            <p className="mt-1 text-sm text-gray-600">Update static website content displayed on the public site.</p>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-gray-700">Title</span>
            <input
              type="text"
              value={editingEntry?.title || editingDefinition.title}
              readOnly
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700"
            />
          </label>

          {editingDefinition.editor === 'contact' ? (
            <div className="space-y-8">
              <div className="rounded-lg border border-gray-200 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h4 className="font-semibold text-gray-900">Contact Page Layout Content</h4>
                  <button
                    type="button"
                    onClick={resetContactDraft}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Reset Default Layout
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Manage the Contact Us hero, form heading, and FAQ cards shown below the form.
                </p>
              </div>

              <div className="grid gap-4 rounded-lg border border-gray-200 p-5 md:grid-cols-2">
                <h4 className="md:col-span-2 font-semibold text-gray-900">Hero</h4>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">Title</span>
                  <input
                    type="text"
                    value={contactDraft.hero.title}
                    onChange={(event) => updateContactSection('hero', 'title', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">Form Title</span>
                  <input
                    type="text"
                    value={contactDraft.form.title}
                    onChange={(event) => updateContactSection('form', 'title', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Subtitle</span>
                  <textarea
                    rows={2}
                    value={contactDraft.hero.subtitle}
                    onChange={(event) => updateContactSection('hero', 'subtitle', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
              </div>

              <div className="space-y-5 rounded-lg border border-gray-200 p-5">
                <div>
                  <h4 className="font-semibold text-gray-900">Frequently Asked Questions</h4>
                  <p className="mt-1 text-sm text-gray-600">These cards appear below the contact form.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-gray-700">FAQ Title</span>
                    <input
                      type="text"
                      value={contactDraft.faq.title}
                      onChange={(event) => updateContactSection('faq', 'title', event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-gray-700">FAQ Subtitle</span>
                    <textarea
                      rows={2}
                      value={contactDraft.faq.subtitle}
                      onChange={(event) => updateContactSection('faq', 'subtitle', event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {contactDraft.faq.items.map((item, index) => (
                    <div key={index} className="space-y-3 rounded-lg bg-gray-50 p-4">
                      <p className="text-sm font-semibold text-gray-900">FAQ Card {index + 1}</p>
                      <input
                        type="text"
                        value={item.question}
                        onChange={(event) => updateContactFaqItem(index, 'question', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Question"
                      />
                      <textarea
                        rows={4}
                        value={item.answer}
                        onChange={(event) => updateContactFaqItem(index, 'answer', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Answer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : editingDefinition.editor === 'about' ? (
            <div className="space-y-8">
              <div className="rounded-lg border border-gray-200 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h4 className="font-semibold text-gray-900">About Page Layout Content</h4>
                  <button
                    type="button"
                    onClick={resetAboutDraft}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Reset Default Layout
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Update the text and image URLs used by the public About Us page sections.
                </p>
              </div>

              <div className="grid gap-4 rounded-lg border border-gray-200 p-5 md:grid-cols-2">
                <h4 className="md:col-span-2 font-semibold text-gray-900">Hero</h4>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">Title</span>
                  <input
                    type="text"
                    value={aboutDraft.hero.title}
                    onChange={(event) => updateAboutSection('hero', 'title', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">Hero Image URL</span>
                  <input
                    type="url"
                    value={aboutDraft.hero.imageUrl}
                    onChange={(event) => updateAboutSection('hero', 'imageUrl', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Subtitle</span>
                  <textarea
                    rows={2}
                    value={aboutDraft.hero.subtitle}
                    onChange={(event) => updateAboutSection('hero', 'subtitle', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
              </div>

              <div className="grid gap-4 rounded-lg border border-gray-200 p-5 md:grid-cols-2">
                <h4 className="md:col-span-2 font-semibold text-gray-900">Mission Section</h4>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">Eyebrow</span>
                  <input
                    type="text"
                    value={aboutDraft.mission.eyebrow}
                    onChange={(event) => updateAboutSection('mission', 'eyebrow', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">Image URL</span>
                  <input
                    type="url"
                    value={aboutDraft.mission.imageUrl}
                    onChange={(event) => updateAboutSection('mission', 'imageUrl', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Title</span>
                  <input
                    type="text"
                    value={aboutDraft.mission.title}
                    onChange={(event) => updateAboutSection('mission', 'title', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">Body</span>
                  <textarea
                    rows={4}
                    value={aboutDraft.mission.body}
                    onChange={(event) => updateAboutSection('mission', 'body', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">Second Body</span>
                  <textarea
                    rows={4}
                    value={aboutDraft.mission.secondBody}
                    onChange={(event) => updateAboutSection('mission', 'secondBody', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">Stat Value</span>
                  <input
                    type="text"
                    value={aboutDraft.mission.statValue}
                    onChange={(event) => updateAboutSection('mission', 'statValue', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-gray-700">Stat Label</span>
                  <input
                    type="text"
                    value={aboutDraft.mission.statLabel}
                    onChange={(event) => updateAboutSection('mission', 'statLabel', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
              </div>

              <div className="space-y-5 rounded-lg border border-gray-200 p-5">
                <div>
                  <h4 className="font-semibold text-gray-900">Our Story</h4>
                  <p className="mt-1 text-sm text-gray-600">Edit the section heading and three timeline cards.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-gray-700">Title</span>
                    <input
                      type="text"
                      value={aboutDraft.story.title}
                      onChange={(event) => updateAboutSection('story', 'title', event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-gray-700">Subtitle</span>
                    <textarea
                      rows={2}
                      value={aboutDraft.story.subtitle}
                      onChange={(event) => updateAboutSection('story', 'subtitle', event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {aboutDraft.story.milestones.map((milestone, index) => (
                    <div key={index} className="space-y-3 rounded-lg bg-gray-50 p-4">
                      <p className="text-sm font-semibold text-gray-900">Story Card {index + 1}</p>
                      <input
                        type="text"
                        value={milestone.year}
                        onChange={(event) => updateMilestone(index, 'year', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Year"
                      />
                      <input
                        type="text"
                        value={milestone.title}
                        onChange={(event) => updateMilestone(index, 'title', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Title"
                      />
                      <input
                        type="url"
                        value={milestone.imageUrl}
                        onChange={(event) => updateMilestone(index, 'imageUrl', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Image URL"
                      />
                      <textarea
                        rows={3}
                        value={milestone.description}
                        onChange={(event) => updateMilestone(index, 'description', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Description"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5 rounded-lg border border-gray-200 p-5">
                <div>
                  <h4 className="font-semibold text-gray-900">Core Values</h4>
                  <p className="mt-1 text-sm text-gray-600">Choose from the icon options used by the public layout.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    value={aboutDraft.values.title}
                    onChange={(event) => updateAboutSection('values', 'title', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    placeholder="Section title"
                  />
                  <textarea
                    rows={2}
                    value={aboutDraft.values.subtitle}
                    onChange={(event) => updateAboutSection('values', 'subtitle', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    placeholder="Section subtitle"
                  />
                </div>
                <div className="grid gap-4 lg:grid-cols-4">
                  {aboutDraft.values.items.map((item, index) => (
                    <div key={index} className="space-y-3 rounded-lg bg-gray-50 p-4">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(event) => updateValueItem(index, 'title', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Title"
                      />
                      <select
                        value={item.icon}
                        onChange={(event) => updateValueItem(index, 'icon', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        {aboutIconOptions.map((icon) => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                      <textarea
                        rows={4}
                        value={item.description}
                        onChange={(event) => updateValueItem(index, 'description', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Description"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5 rounded-lg border border-gray-200 p-5">
                <div>
                  <h4 className="font-semibold text-gray-900">Leadership Team</h4>
                  <p className="mt-1 text-sm text-gray-600">Edit team member text and profile images.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    value={aboutDraft.leadership.title}
                    onChange={(event) => updateAboutSection('leadership', 'title', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    placeholder="Section title"
                  />
                  <textarea
                    rows={2}
                    value={aboutDraft.leadership.subtitle}
                    onChange={(event) => updateAboutSection('leadership', 'subtitle', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    placeholder="Section subtitle"
                  />
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {aboutDraft.leadership.members.map((member, index) => (
                    <div key={index} className="space-y-3 rounded-lg bg-gray-50 p-4">
                      <input
                        type="text"
                        value={member.name}
                        onChange={(event) => updateLeader(index, 'name', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Name"
                      />
                      <input
                        type="text"
                        value={member.role}
                        onChange={(event) => updateLeader(index, 'role', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Role"
                      />
                      <input
                        type="url"
                        value={member.imageUrl}
                        onChange={(event) => updateLeader(index, 'imageUrl', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Image URL"
                      />
                      <textarea
                        rows={4}
                        value={member.bio}
                        onChange={(event) => updateLeader(index, 'bio', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Bio"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5 rounded-lg border border-gray-200 p-5">
                <h4 className="font-semibold text-gray-900">Impact and CTA</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    value={aboutDraft.impact.title}
                    onChange={(event) => updateAboutSection('impact', 'title', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    placeholder="Impact title"
                  />
                  <textarea
                    rows={2}
                    value={aboutDraft.impact.subtitle}
                    onChange={(event) => updateAboutSection('impact', 'subtitle', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    placeholder="Impact subtitle"
                  />
                </div>
                <div className="grid gap-4 lg:grid-cols-4">
                  {aboutDraft.impact.stats.map((stat, index) => (
                    <div key={index} className="space-y-3 rounded-lg bg-gray-50 p-4">
                      <input
                        type="text"
                        value={stat.value}
                        onChange={(event) => updateImpactStat(index, 'value', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Value"
                      />
                      <input
                        type="text"
                        value={stat.label}
                        onChange={(event) => updateImpactStat(index, 'label', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Label"
                      />
                      <select
                        value={stat.icon}
                        onChange={(event) => updateImpactStat(index, 'icon', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        {impactIconOptions.map((icon) => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    value={aboutDraft.cta.title}
                    onChange={(event) => updateAboutSection('cta', 'title', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    placeholder="CTA title"
                  />
                  <textarea
                    rows={2}
                    value={aboutDraft.cta.subtitle}
                    onChange={(event) => updateAboutSection('cta', 'subtitle', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    placeholder="CTA subtitle"
                  />
                  <input
                    type="text"
                    value={aboutDraft.cta.primaryButtonText}
                    onChange={(event) => updateAboutSection('cta', 'primaryButtonText', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    placeholder="Primary button"
                  />
                  <input
                    type="text"
                    value={aboutDraft.cta.secondaryButtonText}
                    onChange={(event) => updateAboutSection('cta', 'secondaryButtonText', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    placeholder="Secondary button"
                  />
                </div>
              </div>
            </div>
          ) : editingDefinition.editor === 'text' ? (
            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-gray-700">Content</span>
                <input
                  type="text"
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  placeholder={CONTENT_NOT_AVAILABLE}
                />
              </label>

              {editingKey === 'copyright_text' ? (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-4">
                  <p className="mb-3 text-sm font-medium text-gray-700">Dynamic text suggestions</p>
                  <div className="flex flex-wrap gap-2">
                    {copyrightVariables.map((variable) => (
                      <button
                        key={variable.token}
                        type="button"
                        onClick={() => appendTokenToDraft(variable.token)}
                        className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:border-indigo-400 hover:text-indigo-700"
                      >
                        <code className="font-semibold text-indigo-700">{variable.token}</code>
                        <span className="text-gray-500">=</span>
                        <span>{variable.value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Content</span>
              <div className="content-editor rounded-lg border border-gray-300 bg-white">
                <ReactQuill
                  theme="snow"
                  value={draftContent}
                  onChange={setDraftContent}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder={CONTENT_NOT_AVAILABLE}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cancelEditing}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={saveContent}
              disabled={saving || !canWrite}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Content Management</h3>
          <p className="mt-1 text-sm text-gray-600">Manage static website pages and footer copyright text.</p>
        </div>
        <button
          type="button"
          onClick={loadEntries}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="p-6">
        {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
        {success ? <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-600">
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            Loading content entries...
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Last Updated</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {contentDefinitions.map((definition) => {
                  const entry = entriesByKey.get(definition.key);
                  return (
                    <tr key={definition.key} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                            <FileText className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-gray-900">{entry?.title || definition.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatUpdatedAt(entry?.updated_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => startEditing(definition.key)}
                          disabled={!canWrite}
                          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentManagement;
