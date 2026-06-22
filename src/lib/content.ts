import { supabase } from './supabase';
import { supabase as adminSupabase } from './adminClient';

export type ContentKey =
  | 'contact_us'
  | 'about_us'
  | 'privacy_policy'
  | 'terms_of_service'
  | 'security_policy'
  | 'refund_policy'
  | 'compliance'
  | 'copyright_text';

export interface ContentEntry {
  id: string;
  key: ContentKey;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface AboutUsContent {
  hero: {
    title: string;
    subtitle: string;
    imageUrl: string;
  };
  mission: {
    eyebrow: string;
    title: string;
    body: string;
    secondBody: string;
    imageUrl: string;
    statValue: string;
    statLabel: string;
  };
  story: {
    title: string;
    subtitle: string;
    milestones: Array<{
      year: string;
      title: string;
      description: string;
      imageUrl: string;
    }>;
  };
  values: {
    title: string;
    subtitle: string;
    items: Array<{
      title: string;
      description: string;
      icon: 'shield' | 'heart' | 'users' | 'zap';
    }>;
  };
  leadership: {
    title: string;
    subtitle: string;
    members: Array<{
      name: string;
      role: string;
      bio: string;
      imageUrl: string;
    }>;
  };
  impact: {
    title: string;
    subtitle: string;
    stats: Array<{
      value: string;
      label: string;
      icon: 'users' | 'globe' | 'trending' | 'award';
    }>;
  };
  cta: {
    title: string;
    subtitle: string;
    primaryButtonText: string;
    secondaryButtonText: string;
  };
}

export interface ContactUsContent {
  hero: {
    title: string;
    subtitle: string;
  };
  form: {
    title: string;
  };
  faq: {
    title: string;
    subtitle: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
}

export const CONTENT_NOT_AVAILABLE = 'Content not available.';

export const contentDefinitions: Array<{ key: ContentKey; title: string; editor: 'rich' | 'text' | 'about' | 'contact' }> = [
  { key: 'contact_us', title: 'Contact Us', editor: 'contact' },
  { key: 'privacy_policy', title: 'Privacy Policy', editor: 'rich' },
  { key: 'about_us', title: 'About Us', editor: 'about' },
  { key: 'terms_of_service', title: 'Terms of Service', editor: 'rich' },
  { key: 'security_policy', title: 'Security Policy', editor: 'rich' },
  { key: 'refund_policy', title: 'Refund Policy', editor: 'rich' },
  { key: 'compliance', title: 'Compliance', editor: 'rich' },
  { key: 'copyright_text', title: 'Footer Copyright Text', editor: 'text' },
];

export const defaultAboutUsContent: AboutUsContent = {
  hero: {
    title: 'About Our Platform',
    subtitle: 'Empowering entrepreneurs worldwide through innovative MLM technology and transparent business practices.',
    imageUrl: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1920&h=720&fit=crop',
  },
  mission: {
    eyebrow: 'Our Mission',
    title: 'Democratizing Financial Success',
    body: 'We believe everyone deserves the opportunity to build financial freedom through entrepreneurship. Our platform provides the tools, technology, and support needed to create sustainable income streams through network marketing.',
    secondBody: 'By combining cutting-edge blockchain technology with proven MLM strategies, we are creating a transparent, fair, and profitable ecosystem for all participants.',
    imageUrl: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=900&h=620&fit=crop',
    statValue: '50K+',
    statLabel: 'Success Stories',
  },
  story: {
    title: 'Our Story',
    subtitle: 'Founded in 2020 by a team of entrepreneurs and technology experts who experienced the challenges of traditional learning systems firsthand.',
    milestones: [
      {
        year: '2020',
        title: 'The Beginning',
        description: 'Founded with a vision to revolutionize network marketing through technology and transparency.',
        imageUrl: 'https://images.pexels.com/photos/3184460/pexels-photo-3184460.jpeg?auto=compress&cs=tinysrgb&w=600&h=360&fit=crop',
      },
      {
        year: '2022',
        title: 'Blockchain Integration',
        description: 'Launched our blockchain-based payment system, ensuring complete transparency in all transactions.',
        imageUrl: 'https://images.pexels.com/photos/3184357/pexels-photo-3184357.jpeg?auto=compress&cs=tinysrgb&w=600&h=360&fit=crop',
      },
      {
        year: '2024',
        title: 'Global Expansion',
        description: 'Reached 50,000+ active members across 150+ countries, becoming a truly global platform.',
        imageUrl: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=600&h=360&fit=crop',
      },
    ],
  },
  values: {
    title: 'Our Core Values',
    subtitle: 'The principles that guide everything we do and shape our platform culture.',
    items: [
      {
        title: 'Transparency',
        description: 'Complete visibility into all transactions and earnings through blockchain technology.',
        icon: 'shield',
      },
      {
        title: 'Integrity',
        description: 'Honest business practices and ethical treatment of all community members.',
        icon: 'heart',
      },
      {
        title: 'Community',
        description: 'Building strong relationships and supporting each other success.',
        icon: 'users',
      },
      {
        title: 'Innovation',
        description: 'Continuously improving our platform with cutting-edge technology.',
        icon: 'zap',
      },
    ],
  },
  leadership: {
    title: 'Leadership Team',
    subtitle: 'Meet the experienced professionals driving our mission forward.',
    members: [
      {
        name: 'Sarah Johnson',
        role: 'CEO & Co-Founder',
        bio: 'Former VP at Fortune 500 company with 15+ years in network marketing and business development.',
        imageUrl: 'https://images.pexels.com/photos/3184405/pexels-photo-3184405.jpeg?auto=compress&cs=tinysrgb&w=240&h=240&fit=crop',
      },
      {
        name: 'Michael Chen',
        role: 'CTO & Co-Founder',
        bio: 'Blockchain expert and software architect with experience at leading tech companies.',
        imageUrl: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=240&h=240&fit=crop',
      },
      {
        name: 'Emma Davis',
        role: 'Head of Operations',
        bio: 'Operations specialist focused on scaling global platforms and ensuring exceptional user experience.',
        imageUrl: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=240&h=240&fit=crop',
      },
    ],
  },
  impact: {
    title: 'Our Impact',
    subtitle: 'Numbers that reflect our commitment to empowering entrepreneurs worldwide.',
    stats: [
      { value: '50,000+', label: 'Active Members', icon: 'users' },
      { value: '150+', label: 'Countries', icon: 'globe' },
      { value: '$2M+', label: 'Total Earnings', icon: 'trending' },
      { value: '99.9%', label: 'Uptime', icon: 'award' },
    ],
  },
  cta: {
    title: 'Ready to Join Our Community?',
    subtitle: 'Become part of a global network of entrepreneurs building their financial future together.',
    primaryButtonText: 'Join as Learner',
    secondaryButtonText: 'Join as Tutor',
  },
};

export const defaultContactUsContent: ContactUsContent = {
  hero: {
    title: 'Contact Us',
    subtitle: "We're here to help you succeed. Get in touch with our support team.",
  },
  form: {
    title: 'Send us a Message',
  },
  faq: {
    title: 'Frequently Asked Questions',
    subtitle: 'Quick answers to common questions',
    items: [
      {
        question: 'How quickly will I receive a response?',
        answer: 'We typically respond to all inquiries within 24 hours during business days. For urgent matters, please call our support line.',
      },
      {
        question: 'What information should I include in my message?',
        answer: 'Please include your account details (if applicable), a clear description of your issue, and any relevant screenshots or error messages.',
      },
      {
        question: 'Do you offer phone support?',
        answer: 'Yes, we offer phone support. You can reach us at our support number.',
      },
      {
        question: 'Can I schedule a consultation?',
        answer: 'Absolutely! We offer free consultations for potential business partners and enterprise clients. Please mention this in your message.',
      },
    ],
  },
};

const fallbackContent: Record<ContentKey, string> = {
  contact_us: JSON.stringify(defaultContactUsContent, null, 2),
  about_us: JSON.stringify(defaultAboutUsContent, null, 2),
  privacy_policy: '<h2>Privacy Policy</h2><p>This policy explains how HTG Infotech collects, uses, and protects information when users access our platform.</p>',
  terms_of_service: '<h2>Terms of Service</h2><p>By accessing or using HTG Infotech, you agree to follow these terms and all applicable laws.</p>',
  security_policy: '<h2>Security Policy</h2><p>We are committed to protecting user data and maintaining a secure platform experience.</p>',
  refund_policy: '<h2>Refund Policy</h2><p>Refund eligibility depends on the purchased service, usage, payment status, and applicable terms at the time of purchase.</p>',
  compliance: '<h2>Compliance</h2><p>HTG Infotech works to operate responsibly and comply with applicable platform, privacy, payment, and consumer protection obligations.</p>',
  copyright_text: '(c) {{year}} {{site_name}}. All rights reserved.',
};

type SystemContentValue = {
  title?: string;
  content?: string;
  updated_at?: string;
  created_at?: string;
};

type SystemSettingRow = {
  tss_id?: string;
  tss_setting_key: string;
  tss_setting_value: string | SystemContentValue;
  tss_created_at?: string;
  tss_updated_at?: string;
};

const systemSettingKeyForContent = (key: ContentKey) => `content_management_${key}`;

const definitionForKey = (key: ContentKey) =>
  contentDefinitions.find((definition) => definition.key === key);

const buildFallbackEntry = (key: ContentKey): ContentEntry => {
  const definition = definitionForKey(key);
  const now = new Date().toISOString();

  return {
    id: systemSettingKeyForContent(key),
    key,
    title: definition?.title || key,
    content: fallbackContent[key],
    created_at: now,
    updated_at: now,
  };
};

const parseSystemContentValue = (value: SystemSettingRow['tss_setting_value']): SystemContentValue => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : { content: String(parsed ?? '') };
    } catch {
      return { content: value };
    }
  }

  return value && typeof value === 'object' ? value : {};
};

const mapSystemSettingToContentEntry = (row: SystemSettingRow, key: ContentKey): ContentEntry => {
  const value = parseSystemContentValue(row.tss_setting_value);
  const definition = definitionForKey(key);

  return {
    id: row.tss_id || row.tss_setting_key,
    key,
    title: value.title || definition?.title || key,
    content: value.content ?? fallbackContent[key],
    created_at: value.created_at || row.tss_created_at || new Date().toISOString(),
    updated_at: value.updated_at || row.tss_updated_at || new Date().toISOString(),
  };
};

const buildSystemSettingPayload = (key: ContentKey, content: string) => {
  const now = new Date().toISOString();
  const definition = definitionForKey(key);

  return {
    tss_setting_key: systemSettingKeyForContent(key),
    tss_setting_value: JSON.stringify({
      title: definition?.title || key,
      content,
      updated_at: now,
    }),
    tss_description: `Content Management: ${definition?.title || key}`,
    tss_is_public: true,
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return fallback;
};

export const sanitizeManagedHtml = (html: string) =>
  html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\sjavascript:/gi, ' #');

export const hasUsableContent = (content?: string | null) => {
  if (!content) return false;
  const text = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return text.length > 0 || /<img[\s>]/i.test(content);
};

const mergeAboutUsContent = (content: Partial<AboutUsContent>): AboutUsContent => ({
  hero: { ...defaultAboutUsContent.hero, ...(content.hero || {}) },
  mission: { ...defaultAboutUsContent.mission, ...(content.mission || {}) },
  story: {
    ...defaultAboutUsContent.story,
    ...(content.story || {}),
    milestones: content.story?.milestones?.length
      ? content.story.milestones.map((item, index) => ({
          ...defaultAboutUsContent.story.milestones[index % defaultAboutUsContent.story.milestones.length],
          ...item,
        }))
      : defaultAboutUsContent.story.milestones,
  },
  values: {
    ...defaultAboutUsContent.values,
    ...(content.values || {}),
    items: content.values?.items?.length
      ? content.values.items.map((item, index) => ({
          ...defaultAboutUsContent.values.items[index % defaultAboutUsContent.values.items.length],
          ...item,
        }))
      : defaultAboutUsContent.values.items,
  },
  leadership: {
    ...defaultAboutUsContent.leadership,
    ...(content.leadership || {}),
    members: content.leadership?.members?.length
      ? content.leadership.members.map((item, index) => ({
          ...defaultAboutUsContent.leadership.members[index % defaultAboutUsContent.leadership.members.length],
          ...item,
        }))
      : defaultAboutUsContent.leadership.members,
  },
  impact: {
    ...defaultAboutUsContent.impact,
    ...(content.impact || {}),
    stats: content.impact?.stats?.length
      ? content.impact.stats.map((item, index) => ({
          ...defaultAboutUsContent.impact.stats[index % defaultAboutUsContent.impact.stats.length],
          ...item,
        }))
      : defaultAboutUsContent.impact.stats,
  },
  cta: { ...defaultAboutUsContent.cta, ...(content.cta || {}) },
});

export const parseAboutUsContent = (content?: string | null): AboutUsContent => {
  if (!content) {
    return defaultAboutUsContent;
  }

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      return mergeAboutUsContent(parsed as Partial<AboutUsContent>);
    }
  } catch {
    return defaultAboutUsContent;
  }

  return defaultAboutUsContent;
};

const mergeContactUsContent = (content: Partial<ContactUsContent>): ContactUsContent => ({
  hero: { ...defaultContactUsContent.hero, ...(content.hero || {}) },
  form: { ...defaultContactUsContent.form, ...(content.form || {}) },
  faq: {
    ...defaultContactUsContent.faq,
    ...(content.faq || {}),
    items: content.faq?.items?.length
      ? content.faq.items.map((item, index) => ({
          ...defaultContactUsContent.faq.items[index % defaultContactUsContent.faq.items.length],
          ...item,
        }))
      : defaultContactUsContent.faq.items,
  },
});

export const parseContactUsContent = (content?: string | null): ContactUsContent => {
  if (!content) {
    return defaultContactUsContent;
  }

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      return mergeContactUsContent(parsed as Partial<ContactUsContent>);
    }
  } catch {
    return defaultContactUsContent;
  }

  return defaultContactUsContent;
};

export const getContentByKey = async (key: ContentKey): Promise<ContentEntry | null> => {
  const fallbackResponse = await supabase
    .from('tbl_system_settings')
    .select('tss_id, tss_setting_key, tss_setting_value, tss_created_at, tss_updated_at')
    .eq('tss_setting_key', systemSettingKeyForContent(key))
    .maybeSingle();

  if (fallbackResponse.error || !fallbackResponse.data) {
    return buildFallbackEntry(key);
  }

  return mapSystemSettingToContentEntry(fallbackResponse.data as SystemSettingRow, key);
};

export const listContentEntriesForAdmin = async (): Promise<ContentEntry[]> => {
  const settingKeys = contentDefinitions.map((definition) => systemSettingKeyForContent(definition.key));
  const fallbackResponse = await adminSupabase
    .from('tbl_system_settings')
    .select('tss_id, tss_setting_key, tss_setting_value, tss_created_at, tss_updated_at')
    .in('tss_setting_key', settingKeys);

  if (fallbackResponse.error) {
    throw new Error(getErrorMessage(fallbackResponse.error, 'Failed to load content entries'));
  }

  const rows = ((fallbackResponse.data || []) as SystemSettingRow[]).map((row) => {
    const key = row.tss_setting_key.replace('content_management_', '') as ContentKey;
    return mapSystemSettingToContentEntry(row, key);
  });
  const rowMap = new Map(rows.map((row) => [row.key, row]));

  return contentDefinitions.map((definition) => rowMap.get(definition.key) || buildFallbackEntry(definition.key));
};

export const updateContentByKeyForAdmin = async (key: ContentKey, content: string): Promise<ContentEntry> => {
  const payload = buildSystemSettingPayload(key, content);
  let fallbackResponse = await adminSupabase
    .from('tbl_system_settings')
    .upsert(payload, { onConflict: 'tss_setting_key' });

  if (fallbackResponse.error && getErrorMessage(fallbackResponse.error, '').includes('tss_is_public')) {
    const { tss_is_public: _unused, ...payloadWithoutPublicFlag } = payload;
    fallbackResponse = await adminSupabase
      .from('tbl_system_settings')
      .upsert(payloadWithoutPublicFlag, { onConflict: 'tss_setting_key' });
  }

  if (fallbackResponse.error) {
    throw new Error(getErrorMessage(fallbackResponse.error, 'Failed to update content'));
  }

  return {
    ...buildFallbackEntry(key),
    content,
    updated_at: new Date().toISOString(),
  };
};
