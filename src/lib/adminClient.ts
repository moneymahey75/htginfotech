import { supabase as regularSupabase } from './supabase';

const ADMIN_QUERY_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-query`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

class AdminQueryBuilder {
  private table: string;
  private selectFields: string = '*';
  private filters: Record<string, any> = {};
  private orderConfig?: { column: string; ascending: boolean };
  private limitValue?: number;
  private rangeValue?: { from: number; to: number };
  private singleMode: boolean = false;
  private needsCount: boolean = false;
  private updateData?: any;
  private insertData?: any;
  private upsertData?: any;
  private upsertOptions?: { onConflict?: string };
  private deleteMode: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated' }) {
    this.selectFields = fields;
    if (options?.count) {
      this.needsCount = true;
    }
    return this;
  }

  eq(column: string, value: any) {
    this.filters[column] = value;
    return this;
  }

  neq(column: string, value: any) {
    this.filters[`${column}_neq`] = value;
    return this;
  }

  in(column: string, values: any[]) {
    this.filters[`${column}_in`] = values;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderConfig = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  range(from: number, to: number) {
    this.rangeValue = { from, to };
    return this;
  }

  single() {
    this.singleMode = true;
    this.needsCount = false;
    return this;
  }

  maybeSingle() {
    this.singleMode = true;
    this.needsCount = false;
    return this;
  }

  update(data: any) {
    this.updateData = data;
    this.needsCount = false;
    return this;
  }

  insert(data: any) {
    this.insertData = data;
    return this;
  }

  upsert(data: any, options?: { onConflict?: string }) {
    this.upsertData = data;
    this.upsertOptions = options;
    this.needsCount = false;
    return this;
  }

  delete() {
    this.deleteMode = true;
    return this;
  }

  async then(resolve: (value: any) => void, reject: (reason: any) => void) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }

  private async execute() {
    try {
      const adminSession = localStorage.getItem('admin_session_token');

      if (!adminSession) {
        return {
          data: null,
          error: { message: 'Admin session required' }
        };
      }

      let operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
      let requestData: any = {};

      if (this.deleteMode) {
        operation = 'delete';
      } else if (this.upsertData) {
        operation = 'upsert';
        requestData.data = this.upsertData;
        requestData.onConflict = this.upsertOptions?.onConflict;
      } else if (this.updateData) {
        operation = 'update';
        requestData.data = this.updateData;
      } else if (this.insertData) {
        operation = 'insert';
        requestData.data = this.insertData;
      } else {
        operation = 'select';
        requestData.select = this.selectFields;
      }

      const payload = {
        table: this.table,
        operation,
        ...requestData,
        filters: Object.keys(this.filters).length > 0 ? this.filters : undefined,
        order: this.orderConfig,
        limit: this.limitValue,
        range: this.rangeValue,
        single: this.singleMode,
        count: this.needsCount
      };

      const response = await fetch(ADMIN_QUERY_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'X-Admin-Session': adminSession,
        },
        body: JSON.stringify(payload),
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
}

class AdminSupabaseClient {
  from(table: string) {
    return new AdminQueryBuilder(table);
  }

  get auth() {
    return regularSupabase.auth;
  }

  get functions() {
    return regularSupabase.functions;
  }

  get storage() {
    return regularSupabase.storage;
  }
}

export const supabase = new AdminSupabaseClient();
