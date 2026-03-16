import { supabase as regularSupabase } from './supabase';

const ADMIN_QUERY_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-query`;

class AdminQueryBuilder {
  private table: string;
  private selectFields: string = '*';
  private filters: Record<string, any> = {};
  private orderConfig?: { column: string; ascending: boolean };
  private limitValue?: number;
  private singleMode: boolean = false;
  private updateData?: any;
  private insertData?: any;
  private deleteMode: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string = '*') {
    this.selectFields = fields;
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

  single() {
    this.singleMode = true;
    return this;
  }

  maybeSingle() {
    this.singleMode = true;
    return this;
  }

  update(data: any) {
    this.updateData = data;
    return this;
  }

  insert(data: any) {
    this.insertData = data;
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
        single: this.singleMode
      };

      const response = await fetch(ADMIN_QUERY_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

  get storage() {
    return regularSupabase.storage;
  }
}

export const supabase = new AdminSupabaseClient();
