import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Session',
};

const maxSessionAgeMs = 8 * 60 * 60 * 1000;

const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin environment variables are not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const validateAdminSession = async (supabase, sessionToken) => {
  const match = sessionToken?.match(/^admin-session-(.+)-(\d+)$/);
  if (!match) return false;

  const sessionTimestamp = Number(match[2]);
  if (!Number.isFinite(sessionTimestamp) || Date.now() - sessionTimestamp > maxSessionAgeMs) {
    return false;
  }

  const { data, error } = await supabase
    .from('tbl_admin_users')
    .select('tau_id, tau_is_active')
    .eq('tau_id', match[1])
    .eq('tau_is_active', true)
    .maybeSingle();

  return !error && Boolean(data);
};

const systemSettingKeyForContent = (key) => `content_management_${key}`;

const contentTitleForKey = (key) => {
  const titles = {
    contact_us: 'Contact Us',
    about_us: 'About Us',
    faq: 'FAQ',
    privacy_policy: 'Privacy Policy',
    terms_of_service: 'Terms of Service',
    security_policy: 'Security Policy',
    refund_policy: 'Refund Policy',
    compliance: 'Compliance',
    copyright_text: 'Footer Copyright Text',
  };

  return titles[key] || key;
};

const buildSystemSettingPayload = (key, content) => {
  const now = new Date().toISOString();

  return {
    tss_setting_key: systemSettingKeyForContent(key),
    tss_setting_value: JSON.stringify({
      title: contentTitleForKey(key),
      content,
      updated_at: now,
    }),
    tss_description: `Content Management: ${contentTitleForKey(key)}`,
    tss_is_public: true,
  };
};

const parseSystemContentValue = (value) => {
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

const mapSystemSettingToContentEntry = (row, key) => {
  const value = parseSystemContentValue(row.tss_setting_value);

  return {
    id: row.tss_id || row.tss_setting_key,
    key,
    title: value.title || contentTitleForKey(key),
    content: value.content || null,
    created_at: value.created_at || row.tss_created_at,
    updated_at: value.updated_at || row.tss_updated_at,
  };
};

export default async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const supabase = createSupabaseAdmin();
    const isValidAdmin = await validateAdminSession(supabase, req.headers['x-admin-session']);

    if (!isValidAdmin) {
      res.status(401).json({ error: 'Admin session required' });
      return;
    }

    const key = Array.isArray(req.query.key) ? req.query.key[0] : req.query.key;
    const content = typeof req.body?.content === 'string' ? req.body.content : null;

    if (content === null) {
      res.status(400).json({ error: 'content must be a string' });
      return;
    }

    const payload = buildSystemSettingPayload(key, content);
    let response = await supabase
      .from('tbl_system_settings')
      .upsert(payload, { onConflict: 'tss_setting_key' })
      .select('tss_id, tss_setting_key, tss_setting_value, tss_created_at, tss_updated_at')
      .maybeSingle();

    if (response.error && response.error.message?.includes('tss_is_public')) {
      const { tss_is_public, ...payloadWithoutPublicFlag } = payload;
      response = await supabase
        .from('tbl_system_settings')
        .upsert(payloadWithoutPublicFlag, { onConflict: 'tss_setting_key' })
        .select('tss_id, tss_setting_key, tss_setting_value, tss_created_at, tss_updated_at')
        .maybeSingle();
    }

    if (response.error) {
      res.status(500).json({ error: response.error.message });
      return;
    }

    res.status(200).json(mapSystemSettingToContentEntry(response.data, key));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
