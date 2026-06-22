import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  CreditCard,
  HelpCircle,
  Search,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { getSystemSettings } from '../lib/supabase';
import { FAQCategoryIcon, FAQContent, defaultFAQContent, getFAQContent } from '../lib/faq';

const categoryIcons: Record<FAQCategoryIcon, typeof HelpCircle> = {
  help: HelpCircle,
  users: Users,
  card: CreditCard,
  shield: Shield,
  settings: Settings,
};

const FAQ: React.FC = () => {
  const { settings } = useAdmin();
  const [content, setContent] = useState<FAQContent>(defaultFAQContent);
  const [publicSettings, setPublicSettings] = useState<any>(settings);
  const [activeCategoryId, setActiveCategoryId] = useState(defaultFAQContent.categories[0]?.id || '');
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setPublicSettings(settings);
  }, [settings]);

  useEffect(() => {
    let isMounted = true;

    const loadPageData = async () => {
      try {
        const [faqContent, systemSettings] = await Promise.all([
          getFAQContent(),
          getSystemSettings().catch(() => ({})),
        ]);

        if (!isMounted) return;

        setContent(faqContent);
        setPublicSettings((current: any) => ({ ...current, ...systemSettings }));
        setActiveCategoryId((current) => current || faqContent.categories[0]?.id || '');
      } catch (error) {
        console.warn('Failed to load FAQ content:', error);
      }
    };

    loadPageData();

    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) {
      return content.categories;
    }

    return content.categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          `${item.question} ${item.answer} ${category.title}`.toLowerCase().includes(normalizedSearch)
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [content.categories, normalizedSearch]);

  const searchResultCategory = normalizedSearch
    ? {
        id: 'search-results',
        title: 'Search Results',
        icon: 'help' as const,
        items: filteredCategories.flatMap((category) => category.items),
      }
    : null;

  const activeCategory = searchResultCategory
    || content.categories.find((category) => category.id === activeCategoryId)
    || content.categories[0]
    || null;

  const supportEmail = publicSettings.support_email || publicSettings.primary_email || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 backdrop-blur-sm">
            <HelpCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">{content.hero.badge}</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">{content.hero.title}</h1>
          <p className="mx-auto mt-6 max-w-4xl text-xl text-indigo-100 md:text-2xl">
            {content.hero.subtitle}
          </p>

          <div className="mx-auto mt-10 max-w-3xl">
            <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-left backdrop-blur-sm">
              <Search className="h-6 w-6 text-indigo-100" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={content.hero.searchPlaceholder}
                className="w-full bg-transparent text-lg text-white placeholder:text-indigo-100 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
          <aside className="h-fit rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-6 text-xl font-bold text-gray-900">Categories</h2>
            <div className="space-y-3">
              {content.categories.map((category) => {
                const Icon = categoryIcons[category.icon] || HelpCircle;
                const isActive = !normalizedSearch && activeCategory?.id === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategoryId(category.id);
                      setOpenQuestionId(null);
                    }}
                    className={`flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left font-semibold transition ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{category.title}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="rounded-2xl bg-white shadow-lg">
            <div className="border-b border-gray-200 p-6 sm:p-8">
              <h2 className="text-3xl font-bold text-gray-900">
                {normalizedSearch ? 'Search Results' : activeCategory?.title || 'FAQ'}
              </h2>
              <p className="mt-3 text-lg text-gray-600">
                {(activeCategory?.items.length || 0)} questions found
              </p>
            </div>

            <div className="space-y-4 p-6 sm:p-8">
              {activeCategory?.items.length ? (
                activeCategory.items.map((item) => {
                  const isOpen = openQuestionId === item.id;

                  return (
                    <div key={item.id} className="overflow-hidden rounded-lg border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setOpenQuestionId(isOpen ? null : item.id)}
                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                      >
                        <span className="text-lg font-bold text-gray-900">{item.question}</span>
                        <ChevronDown className={`h-5 w-5 text-gray-500 transition ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen ? (
                        <div className="border-t border-gray-100 px-6 pb-5 pt-0 text-gray-600">
                          {item.answer}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-600">
                  No questions found.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-start-2">
            <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-12 text-center text-white shadow-lg sm:px-10">
              <h2 className="text-3xl font-bold">{content.cta.title}</h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-indigo-50">{content.cta.subtitle}</p>
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3 font-bold text-indigo-600 transition hover:bg-indigo-50"
                >
                  {content.cta.supportButtonText}
                </Link>
                <a
                  href={supportEmail ? `mailto:${supportEmail}` : '/contact'}
                  className="inline-flex items-center justify-center rounded-lg border border-white px-8 py-3 font-bold text-white transition hover:bg-white/10"
                >
                  {content.cta.emailButtonText}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
