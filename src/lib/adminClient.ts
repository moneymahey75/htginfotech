/**
 * Secure Admin Client
 *
 * This client proxies all admin queries through a secure Edge Function
 * that uses the service role key server-side. This prevents exposing
 * the service role key in the frontend code.
 *
 * Usage in admin components:
 * import { adminQuery } from '../lib/adminClient'
 * const result = await adminQuery('SELECT * FROM table WHERE id = $1', [id])
 */

import { supabase } from './supabase';

const ADMIN_QUERY_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-query`;

interface AdminQueryResponse<T = any> {
  data: T | null;
  error: { message: string; details?: string; hint?: string; code?: string } | null;
}

/**
 * Execute a query through the admin Edge Function
 * @param query - SQL query or Supabase query builder chain
 * @param params - Query parameters (for raw SQL queries)
 */
export async function adminQuery<T = any>(
  query: string,
  params?: any[]
): Promise<AdminQueryResponse<T>> {
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    if (!token) {
      return {
        data: null,
        error: { message: 'Not authenticated' }
      };
    }

    const response = await fetch(ADMIN_QUERY_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ query, params }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        data: null,
        error: { message: `HTTP ${response.status}: ${errorText}` }
      };
    }

    return await response.json();
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Helper to build common admin queries
 */
export const adminDb = {
  from: (table: string) => ({
    select: async <T = any>(columns = '*', options?: { eq?: Record<string, any> }) => {
      let query = `SELECT ${columns} FROM ${table}`;
      const params: any[] = [];

      if (options?.eq) {
        const conditions = Object.entries(options.eq).map(([key, value], index) => {
          params.push(value);
          return `${key} = $${index + 1}`;
        });
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      return adminQuery<T[]>(query, params);
    },

    insert: async <T = any>(values: Record<string, any> | Record<string, any>[]) => {
      const rows = Array.isArray(values) ? values : [values];
      const columns = Object.keys(rows[0]);
      const placeholders = rows.map((_, rowIndex) =>
        `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
      ).join(', ');
      const params = rows.flatMap(row => columns.map(col => row[col]));

      const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders} RETURNING *`;
      return adminQuery<T>(query, params);
    },

    update: async <T = any>(values: Record<string, any>, options: { eq: Record<string, any> }) => {
      const setColumns = Object.keys(values);
      const setClause = setColumns.map((col, index) => `${col} = $${index + 1}`).join(', ');
      const params = [...Object.values(values)];

      const conditions = Object.entries(options.eq).map(([key, value], index) => {
        params.push(value);
        return `${key} = $${setColumns.length + index + 1}`;
      });

      const query = `UPDATE ${table} SET ${setClause} WHERE ${conditions.join(' AND ')} RETURNING *`;
      return adminQuery<T>(query, params);
    },

    delete: async (options: { eq: Record<string, any> }) => {
      const params: any[] = [];
      const conditions = Object.entries(options.eq).map(([key, value], index) => {
        params.push(value);
        return `${key} = $${index + 1}`;
      });

      const query = `DELETE FROM ${table} WHERE ${conditions.join(' AND ')} RETURNING *`;
      return adminQuery(query, params);
    }
  })
};

/**
 * Direct Supabase client export for operations that don't need admin privileges
 * (like auth state management)
 */
export { supabase };
