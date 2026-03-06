/**
 * Admin Supabase Client
 *
 * This is a special Supabase client for admin operations.
 * It routes queries through the admin-query Edge Function which uses
 * service role access to bypass RLS policies.
 *
 * Usage in admin components:
 * Replace: import { supabase } from '../lib/supabase'
 * With: import { supabase } from '../lib/adminSupabase'
 */

import { supabase as regularSupabase } from './supabase';

const ADMIN_QUERY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-query`;

/**
 * Get admin session token from localStorage
 */
function getAdminSession(): string | null {
  return localStorage.getItem('admin_session_token');
}

/**
 * Execute a query through the admin-query Edge Function
 */
async function executeAdminQuery(options: any) {
  const adminSession = getAdminSession();

  if (!adminSession) {
    console.warn('⚠️ No admin session found. Queries will be blocked by RLS.');
    throw new Error('Admin session required');
  }

  try {
    const response = await fetch(ADMIN_QUERY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'X-Admin-Session': adminSession,
      },
      body: JSON.stringify(options),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Admin query failed:', result);
      throw new Error(result.error || 'Admin query failed');
    }

    return result;
  } catch (error) {
    console.error('❌ Admin query error:', error);
    throw error;
  }
}

/**
 * Admin Supabase Client
 *
 * This wraps the regular Supabase client and routes data queries through
 * the admin-query Edge Function for RLS bypass.
 */
export const supabase = new Proxy(regularSupabase, {
  get(target, prop) {
    // Intercept 'from' method to route through admin query
    if (prop === 'from') {
      return (table: string) => {
        return createAdminQueryBuilder(table);
      };
    }

    // For all other methods (auth, storage, functions, etc), use regular client
    return Reflect.get(target, prop);
  }
});

/**
 * Create a query builder that routes through admin-query Edge Function
 */
function createAdminQueryBuilder(table: string) {
  let selectColumns = '*';
  let filters: Record<string, any> = {};
  let orderConfig: { column: string; ascending?: boolean } | undefined;
  let limitValue: number | undefined;
  let isSingle = false;

  const builder: any = {
    select(columns: string = '*', options?: any) {
      selectColumns = columns;
      return builder;
    },

    eq(column: string, value: any) {
      filters[column] = value;
      return builder;
    },

    neq(column: string, value: any) {
      filters[`${column}_neq`] = value;
      return builder;
    },

    in(column: string, values: any[]) {
      filters[`${column}_in`] = values;
      return builder;
    },

    or(query: string) {
      // Complex queries not yet supported through admin query
      console.warn('⚠️ OR queries not fully supported through admin-query, falling back to regular client');
      return regularSupabase.from(table).select(selectColumns).or(query);
    },

    order(column: string, options?: { ascending?: boolean }) {
      orderConfig = { column, ascending: options?.ascending };
      return builder;
    },

    range(from: number, to: number) {
      // Convert range to limit/offset
      const limit = to - from + 1;
      limitValue = limit;
      // Note: offset not yet implemented in admin-query
      return builder;
    },

    limit(count: number) {
      limitValue = count;
      return builder;
    },

    single() {
      isSingle = true;
      return builder;
    },

    maybeSingle() {
      isSingle = true;
      return builder;
    },

    // Execute the query
    async then(resolve: any, reject: any) {
      try {
        const result = await executeAdminQuery({
          table,
          operation: 'select',
          select: selectColumns,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          order: orderConfig,
          limit: limitValue,
          single: isSingle,
        });

        // Match Supabase client response format
        resolve({ data: result.data, error: result.error });
      } catch (error) {
        resolve({ data: null, error: { message: error instanceof Error ? error.message : 'Query failed' } });
      }
    },
  };

  // Add insert method
  builder.insert = (data: any) => {
    return {
      select() {
        return this;
      },
      single() {
        return this;
      },
      async then(resolve: any, reject: any) {
        try {
          const result = await executeAdminQuery({
            table,
            operation: 'insert',
            data,
          });
          resolve({ data: result.data, error: result.error });
        } catch (error) {
          resolve({ data: null, error: { message: error instanceof Error ? error.message : 'Insert failed' } });
        }
      }
    };
  };

  // Add update method
  builder.update = (data: any) => {
    return {
      eq(column: string, value: any) {
        filters[column] = value;
        return this;
      },
      select() {
        return this;
      },
      async then(resolve: any, reject: any) {
        try {
          const result = await executeAdminQuery({
            table,
            operation: 'update',
            data,
            filters: Object.keys(filters).length > 0 ? filters : undefined,
          });
          resolve({ data: result.data, error: result.error });
        } catch (error) {
          resolve({ data: null, error: { message: error instanceof Error ? error.message : 'Update failed' } });
        }
      }
    };
  };

  // Add delete method
  builder.delete = () => {
    return {
      eq(column: string, value: any) {
        filters[column] = value;
        return this;
      },
      async then(resolve: any, reject: any) {
        try {
          const result = await executeAdminQuery({
            table,
            operation: 'delete',
            filters: Object.keys(filters).length > 0 ? filters : undefined,
          });
          resolve({ data: result.data, error: result.error });
        } catch (error) {
          resolve({ data: null, error: { message: error instanceof Error ? error.message : 'Delete failed' } });
        }
      }
    };
  };

  // Add upsert method
  builder.upsert = (data: any, options?: { onConflict?: string }) => {
    return {
      select() {
        return this;
      },
      single() {
        return this;
      },
      async then(resolve: any, reject: any) {
        try {
          const result = await executeAdminQuery({
            table,
            operation: 'upsert',
            data,
            onConflict: options?.onConflict,
          });
          resolve({ data: result.data, error: result.error });
        } catch (error) {
          resolve({ data: null, error: { message: error instanceof Error ? error.message : 'Upsert failed' } });
        }
      }
    };
  };

  return builder;
}

// Re-export everything else from regular supabase
export * from './supabase';
