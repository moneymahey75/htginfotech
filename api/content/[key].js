import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Session',
};

const createSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const systemSettingKeyForContent = (key) => `content_management_${key}`;

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
    title: value.title || key,
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

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const key = Array.isArray(req.query.key) ? req.query.key[0] : req.query.key;
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from('tbl_system_settings')
      .select('tss_id, tss_setting_key, tss_setting_value, tss_created_at, tss_updated_at')
      .eq('tss_setting_key', systemSettingKeyForContent(key))
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Content not available.' });
      return;
    }

    res.status(200).json(mapSystemSettingToContentEntry(data, key));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
