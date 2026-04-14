import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Admin-Session',
};

interface QueryRequest {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  select?: string;
  filters?: Record<string, any>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  range?: { from: number; to: number };
  single?: boolean;
  count?: boolean;
  data?: any;
  onConflict?: string;
}

const MAX_SESSION_AGE_MS = 8 * 60 * 60 * 1000;
const ALLOWED_TABLES = new Set([
  'tbl_admin_users',
  'tbl_course_categories',
  'tbl_course_content',
  'tbl_course_enrollments',
  'tbl_courses',
  'tbl_email_templates',
  'tbl_notifications',
  'tbl_payment_split_transactions',
  'tbl_payment_splits',
  'tbl_payments',
  'tbl_sliders',
  'tbl_stripe_config',
  'tbl_stripe_connect_accounts',
  'tbl_subscription_plans',
  'tbl_system_settings',
  'tbl_tutor_assignments',
  'tbl_tutors',
  'tbl_user_profiles',
  'tbl_user_subscriptions',
  'tbl_users',
  'tbl_video_storage_settings',
  'users',
]);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get admin session token from header
    const adminSession = req.headers.get('X-Admin-Session');

    if (!adminSession) {
      return new Response(
        JSON.stringify({ error: 'Admin session required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Validate admin session
    // Session format: admin-session-{adminId}-{timestamp}
    const sessionMatch = adminSession.match(/^admin-session-([a-f0-9-]+)-(\d+)$/);

    if (!sessionMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid session format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminId = sessionMatch[1];
    const sessionTimestamp = Number(sessionMatch[2]);

    if (!Number.isFinite(sessionTimestamp)) {
      return new Response(
        JSON.stringify({ error: 'Invalid session timestamp' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (Date.now() - sessionTimestamp > MAX_SESSION_AGE_MS) {
      return new Response(
        JSON.stringify({ error: 'Admin session expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin exists and is active
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('tbl_admin_users')
      .select('tau_id, tau_is_active, tau_role')
      .eq('tau_id', adminId)
      .eq('tau_is_active', true)
      .maybeSingle();

    if (adminError || !admin) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired admin session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse query request
    const queryRequest: QueryRequest = await req.json();
    const { table, operation, select, filters, order, limit, range, single, count, data, onConflict } = queryRequest;

    if (!ALLOWED_TABLES.has(table)) {
      return new Response(
        JSON.stringify({ error: `Table ${table} is not allowed for admin queries` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (table === 'tbl_admin_users' && operation !== 'select' && admin.tau_role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super administrators can manage admin users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let query: any;

    // Build query based on operation
    switch (operation) {
      case 'select':
        query = supabaseAdmin
          .from(table)
          .select(select || '*', count ? { count: 'exact' } : undefined);

        // Apply filters
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (key.endsWith('_neq')) {
              const column = key.replace('_neq', '');
              query = query.neq(column, value);
            } else if (key.endsWith('_in')) {
              const column = key.replace('_in', '');
              query = query.in(column, value);
            } else {
              query = query.eq(key, value);
            }
          }
        }

        // Apply ordering
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? true });
        }

        // Apply range (takes precedence over limit)
        if (range) {
          query = query.range(range.from, range.to);
        } else if (limit) {
          query = query.limit(limit);
        }

        // Apply single/maybeSingle
        if (single) {
          query = query.maybeSingle();
        }
        break;

      case 'insert':
        query = supabaseAdmin
          .from(table)
          .insert(data)
          .select();
        break;

      case 'update':
        query = supabaseAdmin
          .from(table)
          .update(data);

        // Apply filters for update
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
          }
        }

        query = query.select();
        break;

      case 'delete':
        query = supabaseAdmin
          .from(table)
          .delete();

        // Apply filters for delete
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
          }
        }
        break;

      case 'upsert':
        query = supabaseAdmin
          .from(table)
          .upsert(data, onConflict ? { onConflict } : undefined)
          .select();
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Execute query
    const { data: result, error, count: resultCount } = await query;

    if (error) {
      console.error('Query error:', error);
      return new Response(
        JSON.stringify({ data: null, error: error.message, count: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: result, error: null, count: resultCount ?? null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin query error:', error);
    return new Response(
      JSON.stringify({
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
