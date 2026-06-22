import React, { useEffect, useMemo, useState } from 'react';
import {
  HelpCircle,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  FAQCategoryIcon,
  FAQContent,
  createFAQCategory,
  createFAQItem,
  defaultFAQContent,
  getFAQContentForAdmin,
  saveFAQContentForAdmin,
} from '../../lib/faq';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const iconOptions: FAQCategoryIcon[] = ['help', 'users', 'card', 'shield', 'settings'];

const FAQManagement: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const canWrite = hasPermission('content', 'write');
  const [content, setContent] = useState<FAQContent>(defaultFAQContent);
  const [activeCategoryId, setActiveCategoryId] = useState(defaultFAQContent.categories[0]?.id || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeCategory = useMemo(
    () => content.categories.find((category) => category.id === activeCategoryId) || content.categories[0],
    [activeCategoryId, content.categories]
  );

  const loadFAQ = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFAQContentForAdmin();
      setContent(data);
      setActiveCategoryId(data.categories[0]?.id || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load FAQ content.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFAQ();
  }, []);

  const saveFAQ = async () => {
    if (!canWrite) {
      setError('You do not have permission to save FAQ content.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const currentCategoryId = activeCategory?.id || activeCategoryId;
      const normalizedContent = await saveFAQContentForAdmin(content);
      setContent(normalizedContent);
      setActiveCategoryId(
        normalizedContent.categories.some((category) => category.id === currentCategoryId)
          ? currentCategoryId
          : normalizedContent.categories[0]?.id || ''
      );
      setSuccess('FAQ saved successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save FAQ content.');
    } finally {
      setSaving(false);
    }
  };

  const updateHero = (field: keyof FAQContent['hero'], value: string) => {
    setContent((current) => ({
      ...current,
      hero: { ...current.hero, [field]: value },
    }));
  };

  const updateCta = (field: keyof FAQContent['cta'], value: string) => {
    setContent((current) => ({
      ...current,
      cta: { ...current.cta, [field]: value },
    }));
  };

  const updateCategory = (categoryId: string, field: 'title' | 'icon', value: string) => {
    setContent((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId ? { ...category, [field]: value } : category
      ),
    }));
  };

  const addCategory = () => {
    const category = createFAQCategory();
    setContent((current) => ({
      ...current,
      categories: [...current.categories, category],
    }));
    setActiveCategoryId(category.id);
  };

  const deleteCategory = (categoryId: string) => {
    setContent((current) => {
      const nextCategories = current.categories.filter((category) => category.id !== categoryId);
      setActiveCategoryId(nextCategories[0]?.id || '');
      return {
        ...current,
        categories: nextCategories.length ? nextCategories : [createFAQCategory('General')],
      };
    });
  };

  const addQuestion = (categoryId: string) => {
    setContent((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId
          ? { ...category, items: [...category.items, createFAQItem()] }
          : category
      ),
    }));
  };

  const updateQuestion = (
    categoryId: string,
    questionId: string,
    field: 'question' | 'answer',
    value: string
  ) => {
    setContent((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map((item) =>
                item.id === questionId ? { ...item, [field]: value } : item
              ),
            }
          : category
      ),
    }));
  };

  const deleteQuestion = (categoryId: string, questionId: string) => {
    setContent((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId
          ? { ...category, items: category.items.filter((item) => item.id !== questionId) }
          : category
      ),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-white py-20 text-gray-600">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Loading FAQ...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">FAQ Management</h3>
            <p className="mt-1 text-sm text-gray-600">Manage FAQ categories, searchable questions, and support CTA text.</p>
          </div>
          <button
            type="button"
            onClick={saveFAQ}
            disabled={saving || !canWrite}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save FAQ
          </button>
        </div>
        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
        {success ? <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div> : null}
      </div>

      <div className="grid gap-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:grid-cols-2">
        <h4 className="md:col-span-2 font-semibold text-gray-900">Hero and Search</h4>
        <input
          type="text"
          value={content.hero.badge}
          onChange={(event) => updateHero('badge', event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-3"
          placeholder="Badge"
        />
        <input
          type="text"
          value={content.hero.title}
          onChange={(event) => updateHero('title', event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-3"
          placeholder="Title"
        />
        <textarea
          rows={2}
          value={content.hero.subtitle}
          onChange={(event) => updateHero('subtitle', event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-3"
          placeholder="Subtitle"
        />
        <input
          type="text"
          value={content.hero.searchPlaceholder}
          onChange={(event) => updateHero('searchPlaceholder', event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-3"
          placeholder="Search placeholder"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Categories</h4>
            <button
              type="button"
              onClick={addCategory}
              disabled={!canWrite}
              className="rounded-lg bg-indigo-50 p-2 text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {content.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${
                  activeCategory?.id === category.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <HelpCircle className="h-4 w-4" />
                <span>{category.title}</span>
              </button>
            ))}
          </div>
        </div>

        {activeCategory ? (
          <div className="space-y-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
              <input
                type="text"
                value={activeCategory.title}
                onChange={(event) => updateCategory(activeCategory.id, 'title', event.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-3"
                placeholder="Category title"
              />
              <select
                value={activeCategory.icon}
                onChange={(event) => updateCategory(activeCategory.id, 'icon', event.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-3"
              >
                {iconOptions.map((icon) => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => deleteCategory(activeCategory.id)}
                disabled={!canWrite}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <h4 className="font-semibold text-gray-900">Questions</h4>
              <button
                type="button"
                onClick={() => addQuestion(activeCategory.id)}
                disabled={!canWrite}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Question
              </button>
            </div>

            <div className="space-y-4">
              {activeCategory.items.map((item, index) => (
                <div key={item.id} className="space-y-3 rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">Question {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => deleteQuestion(activeCategory.id, item.id)}
                      disabled={!canWrite}
                      className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(event) => updateQuestion(activeCategory.id, item.id, 'question', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3"
                    placeholder="Question"
                  />
                  <textarea
                    rows={4}
                    value={item.answer}
                    onChange={(event) => updateQuestion(activeCategory.id, item.id, 'answer', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3"
                    placeholder="Answer"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:grid-cols-2">
        <h4 className="md:col-span-2 font-semibold text-gray-900">Support CTA</h4>
        <input
          type="text"
          value={content.cta.title}
          onChange={(event) => updateCta('title', event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-3"
          placeholder="CTA title"
        />
        <input
          type="text"
          value={content.cta.supportButtonText}
          onChange={(event) => updateCta('supportButtonText', event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-3"
          placeholder="Support button"
        />
        <textarea
          rows={2}
          value={content.cta.subtitle}
          onChange={(event) => updateCta('subtitle', event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-3"
          placeholder="CTA subtitle"
        />
        <input
          type="text"
          value={content.cta.emailButtonText}
          onChange={(event) => updateCta('emailButtonText', event.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-3"
          placeholder="Email button"
        />
      </div>

      <div className="sticky bottom-4 z-10 flex justify-end rounded-xl border border-gray-100 bg-white/95 p-4 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={saveFAQ}
          disabled={saving || !canWrite}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save FAQ
        </button>
      </div>
    </div>
  );
};

export default FAQManagement;
