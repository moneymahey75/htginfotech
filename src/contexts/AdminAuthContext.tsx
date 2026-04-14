import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase as adminSupabase } from '../lib/adminClient';
import { supabase as publicSupabase } from '../lib/supabase';
import { useNotification } from '../components/ui/NotificationProvider';
import { withTimeout } from '../utils/loadingRecovery';

export type PermissionAction = 'read' | 'write' | 'delete';
export type PermissionModule =
  | 'enrollments'
  | 'learners'
  | 'tutors'
  | 'courses'
  | 'categories'
  | 'payments'
  | 'sliders'
  | 'settings'
  | 'admins';

export type PermissionSet = Record<PermissionModule, Record<PermissionAction, boolean>>;

const createDefaultPermissions = (): PermissionSet => ({
  enrollments: { read: false, write: false, delete: false },
  learners: { read: false, write: false, delete: false },
  tutors: { read: false, write: false, delete: false },
  courses: { read: false, write: false, delete: false },
  categories: { read: false, write: false, delete: false },
  payments: { read: false, write: false, delete: false },
  sliders: { read: false, write: false, delete: false },
  settings: { read: false, write: false, delete: false },
  admins: { read: false, write: false, delete: false },
});

const mergePermissionSources = (
  rawPermissions: Partial<Record<string, Partial<Record<PermissionAction, boolean>>>>,
  keys: string[]
): Record<PermissionAction, boolean> => {
  return keys.reduce<Record<PermissionAction, boolean>>(
    (merged, key) => {
      const source = rawPermissions[key];
      if (!source || typeof source !== 'object') {
        return merged;
      }

      return {
        read: merged.read || Boolean(source.read),
        write: merged.write || Boolean(source.write),
        delete: merged.delete || Boolean(source.delete),
      };
    },
    { read: false, write: false, delete: false }
  );
};

const normalizePermissions = (rawPermissions: Partial<Record<string, Partial<Record<PermissionAction, boolean>>>> | null | undefined): PermissionSet => {
  const normalized = createDefaultPermissions();

  if (!rawPermissions || typeof rawPermissions !== 'object') {
    return normalized;
  }

  const permissionAliases: Record<PermissionModule, string[]> = {
    enrollments: ['enrollments', 'dailytasks'],
    learners: ['learners', 'customers'],
    tutors: ['tutors', 'companies'],
    courses: ['courses', 'subscriptions'],
    categories: ['categories', 'coupons'],
    payments: ['payments'],
    sliders: ['sliders'],
    settings: ['settings'],
    admins: ['admins'],
  };

  (Object.keys(normalized) as PermissionModule[]).forEach((module) => {
    normalized[module] = mergePermissionSources(rawPermissions, permissionAliases[module]);
  });

  return normalized;
};

const serializePermissionsForStorage = (permissions: PermissionSet): PermissionSet => ({
  enrollments: { ...permissions.enrollments },
  learners: { ...permissions.learners },
  tutors: { ...permissions.tutors },
  courses: { ...permissions.courses },
  categories: { ...permissions.categories },
  payments: { ...permissions.payments },
  sliders: { ...permissions.sliders },
  settings: { ...permissions.settings },
  admins: { ...permissions.admins },
});

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'sub_admin';
  permissions: PermissionSet;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface SubAdmin {
  id: string;
  email: string;
  fullName: string;
  permissions: AdminUser['permissions'];
  isActive: boolean;
  createdBy: string;
  lastLogin?: string;
  createdAt: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  createSubAdmin: (data: {
    email: string;
    fullName: string;
    isActive: boolean;
    permissions: PermissionSet;
  }) => Promise<void>;
  updateSubAdmin: (id: string, data: Partial<SubAdmin>) => Promise<SubAdmin>;
  deleteSubAdmin: (id: string) => Promise<void>;
  resetSubAdminPassword: (id: string) => Promise<void>;
  getSubAdmins: () => Promise<SubAdmin[]>;
  hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
  loading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);
const ADMIN_AUTH_TIMEOUT_MS = 10000;

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const notification = useNotification();

  useEffect(() => {
    // Check for existing admin session in localStorage (persists across tabs)
    const sessionToken = localStorage.getItem('admin_session_token');
    if (sessionToken && sessionToken !== 'null' && sessionToken !== 'undefined') {
      validateSession(sessionToken);
    } else {
      setLoading(false);
    }
  }, []);

  const validateSession = async (sessionToken: string) => {
    try {
      // Check if session token is valid format and not expired
      if (!sessionToken || sessionToken === 'null' || sessionToken === 'undefined') {
        localStorage.removeItem('admin_session_token');
        setLoading(false);
        return;
      }

      // Extract admin ID from session token - match format: "admin-session-{id}-{timestamp}"
      const match = sessionToken.match(/^admin-session-(.+)-(\d+)$/);

      if (!match) {
        localStorage.removeItem('admin_session_token');
        setLoading(false);
        return;
      }

      const adminId = match[1];
      const timestamp = match[2];

      // Check if session is expired (8-hour expiration for better security)
      const sessionAge = Date.now() - parseInt(timestamp);
      const maxSessionAge = 8 * 60 * 60 * 1000; // 8 hours

      if (sessionAge > maxSessionAge) {
        console.log('❌ Session expired');
        localStorage.removeItem('admin_session_token');
        setLoading(false);
        return;
      }

      // Get admin data from database using service role to bypass RLS
      const { data: user, error } = await withTimeout(
        adminSupabase
          .from('tbl_admin_users')
          .select('*')
          .eq('tau_id', adminId)
          .single(),
        ADMIN_AUTH_TIMEOUT_MS,
        'Admin session validation timed out'
      );

      if (error || !user) {
        console.error('❌ Failed to validate session:', error);
        localStorage.removeItem('admin_session_token');
        setLoading(false);
        return;
      }

      if (!user.tau_is_active) {
        console.log('❌ Admin account is inactive');
        localStorage.removeItem('admin_session_token');
        setLoading(false);
        return;
      }

      const adminUser: AdminUser = {
        id: user.tau_id,
        email: user.tau_email,
        fullName: user.tau_full_name,
        role: user.tau_role,
        permissions: normalizePermissions(user.tau_permissions),
        isActive: user.tau_is_active,
        lastLogin: user.tau_last_login || '',
        createdAt: user.tau_created_at || ''
      };

      console.log('✅ Session validated successfully for:', adminUser.email);
      setAdmin(adminUser);
    } catch (error) {
      localStorage.removeItem('admin_session_token');
      console.error('Session validation failed:', error);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔍 Starting admin login process for:', email);

      let user: any = null;
      let error: any = null;

      // Try to get admin user from database using service role to bypass RLS
      const result = await publicSupabase
          .from('tbl_admin_users')
          .select('*')
          .eq('tau_email', email.trim())
          .single();

      user = result.data;
      error = result.error;

      if (error || !user) {
        console.error('❌ Admin user not found in database:', error);

        // If RLS is blocking, try with service role
        if (error?.code === '42501' || error?.message?.includes('RLS') || error?.message?.includes('policy')) {
          console.log('🔄 RLS detected, attempting service role query...');

          // Create a service role client for admin operations
          const { createClient } = await import('@supabase/supabase-js');
          const serviceClient = createClient(
              import.meta.env.VITE_SUPABASE_URL,
              import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
              {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false
                }
              }
          );

          const { data: serviceUser, error: serviceError } = await serviceClient
              .from('tbl_admin_users')
              .select('*')
              .eq('tau_email', email.trim())
              .single();

          if (serviceError || !serviceUser) {
            console.error('❌ Service role query also failed:', serviceError);
            throw new Error('Invalid email or password');
          }

          user = serviceUser;
          console.log('✅ Service role query successful');
        } else {
          throw new Error('Invalid email or password');
        }
      } else {
        console.log('✅ Regular query successful');
      }

      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (!user.tau_is_active) {
        throw new Error('Account is inactive. Please contact the administrator.');
      }

      console.log('🔐 Verifying password...');

      // Handle default admin credentials and bcrypt verification
      let passwordMatch = false;

      // Try bcrypt verification for other accounts
      try {
        const bcrypt = await import('bcryptjs');
        passwordMatch = await bcrypt.compare(password, user.tau_password_hash);
        console.log('✅ Using bcrypt for password verification');
      } catch (bcryptError) {
        console.log('⚠️ bcrypt not available, using fallback verification', bcryptError);
        // Fallback: direct comparison (not secure for production)
        passwordMatch = password === user.tau_password_hash;
      }

      if (!passwordMatch) {
        console.log('❌ Password verification failed');
        throw new Error('Invalid email or password');
      }

      console.log('✅ Password verified successfully');

      // All checks passed — login success
      const sessionToken = `admin-session-${user.tau_id}-${Date.now()}`;
      localStorage.setItem('admin_session_token', sessionToken);

      const adminUser: AdminUser = {
        id: user.tau_id,
        email: user.tau_email,
        fullName: user.tau_full_name,
        role: user.tau_role,
        permissions: normalizePermissions(user.tau_permissions),
        isActive: user.tau_is_active,
        lastLogin: user.tau_last_login || '',
        createdAt: user.tau_created_at || ''
      };

      setAdmin(adminUser);

      // Update last login
      try {
        await adminSupabase
            .from('tbl_admin_users')
            .update({ tau_last_login: new Date().toISOString() })
            .eq('tau_id', user.tau_id);
      } catch (updateError) {
        console.warn('Failed to update last login time:', updateError);
      }

      notification.showSuccess('Welcome Back!', 'You have successfully logged in.');
    } catch (error: any) {
      console.error('❌ Admin login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_session_token');
    setAdmin(null);
    notification.showInfo('Logged Out', 'Successfully logged out of admin panel.');
  };

  const sendSubAdminPasswordResetEmail = async (subAdminId: string, siteUrl?: string) => {
    const { data, error } = await adminSupabase.functions.invoke('send-subadmin-password-reset-email', {
      body: {
        subAdminId,
        siteUrl: siteUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to send password setup email.');
    }
  };

  const createSubAdmin = async (data: {
    email: string;
    fullName: string;
    isActive: boolean;
    permissions: PermissionSet;
  }) => {
    try {
      // Check if email already exists - use .maybeSingle() or handle empty result
      const { data: existingUser, error: checkError } = await adminSupabase
          .from('tbl_admin_users')
          .select('tau_id')
          .eq('tau_email', data.email.trim())
          .maybeSingle(); // Use maybeSingle instead of single

      if (checkError) {
        console.error('Email check error:', checkError);
        throw new Error('Failed to check email availability');
      }

      // If existingUser is not null, email already exists
      if (existingUser) {
        throw new Error('Email address already exists');
      }

      // Generate temporary password and hash it
      const tempPassword = generateTempPassword();
      const bcrypt = await import('bcryptjs');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(tempPassword, saltRounds);

      // Insert new sub-admin into database
      const { data: newAdmin, error: insertError } = await adminSupabase
          .from('tbl_admin_users')
          .insert({
            tau_email: data.email.trim(),
            tau_full_name: data.fullName,
            tau_password_hash: hashedPassword,
            tau_role: 'sub_admin',
            tau_permissions: serializePermissionsForStorage(data.permissions),
            tau_is_active: data.isActive,
            tau_created_by: admin!.id,
            tau_created_at: new Date().toISOString()
          })
          .select()
          .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(insertError.message || 'Failed to create sub-admin');
      }

      console.log('Temporary password prepared for sub-admin setup:', tempPassword);

      if (newAdmin?.tau_is_active) {
        try {
          await sendSubAdminPasswordResetEmail(newAdmin.tau_id, typeof window !== 'undefined' ? window.location.origin : '');
          notification.showSuccess(
              'Sub-Admin Created',
              `Password setup email sent successfully to ${data.email}.`
          );
        } catch (emailError: any) {
          notification.showWarning(
              'Sub-Admin Created',
              `The sub-admin was created, but the password setup email could not be sent. ${emailError?.message || ''}`.trim()
          );
        }
      } else {
        notification.showWarning(
            'Sub-Admin Created',
            'The sub-admin was created, but no password setup email was sent because the account is inactive.'
        );
      }

      return newAdmin;
    } catch (error: any) {
      console.error('Create sub-admin error:', error);
      notification.showError(
          'Creation Failed',
          error.message || 'Failed to create sub-admin. Please try again.'
      );
      throw error;
    }
  };

  const updateSubAdmin = async (id: string, data: Partial<SubAdmin>) => {
    try {
      const updateData: any = {};

      if (data.isActive !== undefined) {
        updateData.tau_is_active = data.isActive;
      }

      if (data.permissions) {
        updateData.tau_permissions = serializePermissionsForStorage(data.permissions);
      }

      if (data.fullName !== undefined) {
        updateData.tau_full_name = data.fullName;
      }

      if (data.email !== undefined) {
        updateData.tau_email = data.email;
      }

      const { error } = await adminSupabase
          .from('tbl_admin_users')
          .update(updateData)
          .eq('tau_id', id);

      if (error) {
        console.error('Database update error:', error);
        throw new Error(error.message || 'Failed to update sub-admin');
      }

      const { data: updatedAdmin, error: fetchError } = await adminSupabase
          .from('tbl_admin_users')
          .select('*')
          .eq('tau_id', id)
          .maybeSingle();

      if (fetchError || !updatedAdmin) {
        console.error('Database fetch-after-update error:', fetchError);
        throw new Error(fetchError?.message || 'Sub-admin updated, but the latest record could not be loaded.');
      }

      notification.showSuccess('Sub-Admin Updated', 'Sub-admin details updated successfully.');
      return {
        id: updatedAdmin.tau_id,
        email: updatedAdmin.tau_email,
        fullName: updatedAdmin.tau_full_name,
        permissions: normalizePermissions(updatedAdmin.tau_permissions),
        isActive: updatedAdmin.tau_is_active,
        createdBy: updatedAdmin.tau_created_by,
        lastLogin: updatedAdmin.tau_last_login,
        createdAt: updatedAdmin.tau_created_at
      };
    } catch (error: any) {
      console.error('Update sub-admin error:', error);
      notification.showError('Update Failed', error.message || 'Failed to update sub-admin');
      throw error;
    }
  };

  const deleteSubAdmin = async (id: string) => {
    try {
      const { error } = await adminSupabase
          .from('tbl_admin_users')
          .delete()
          .eq('tau_id', id);

      if (error) {
        console.error('Database delete error:', error);
        throw new Error(error.message || 'Failed to delete sub-admin');
      }

      notification.showSuccess('Sub-Admin Deleted', 'Sub-admin deleted successfully.');
    } catch (error: any) {
      console.error('Delete sub-admin error:', error);
      notification.showError('Deletion Failed', error.message || 'Failed to delete sub-admin');
      throw error;
    }
  };

  const resetSubAdminPassword = async (id: string): Promise<void> => {
    try {
      await sendSubAdminPasswordResetEmail(id, typeof window !== 'undefined' ? window.location.origin : '');

      notification.showSuccess(
          'Password Reset',
          'Password reset email has been sent to the sub-admin.'
      );
    } catch (error: any) {
      console.error('Reset password error:', error);
      notification.showError('Reset Failed', error.message || 'Failed to reset password');
      throw error;
    }
  };

  const getSubAdmins = async (): Promise<SubAdmin[]> => {
    try {
      const { data: subAdmins, error } = await adminSupabase
          .from('tbl_admin_users')
          .select('*')
          .eq('tau_role', 'sub_admin')
          .order('tau_created_at', { ascending: false });

      if (error) {
        console.error('Database fetch error:', error);
        throw new Error(error.message || 'Failed to fetch sub-admins');
      }

      // Handle case where no sub-admins exist (empty array is fine)
      return subAdmins?.map(admin => ({
        id: admin.tau_id,
        email: admin.tau_email,
        fullName: admin.tau_full_name,
        permissions: normalizePermissions(admin.tau_permissions),
        isActive: admin.tau_is_active,
        createdBy: admin.tau_created_by,
        lastLogin: admin.tau_last_login,
        createdAt: admin.tau_created_at
      })) || [];
    } catch (error) {
      console.error('Get sub-admins error:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch sub-admins';
      notification.showError('Fetch Failed', message);
      return [];
    }
  };

  const hasPermission = (module: PermissionModule, action: PermissionAction): boolean => {
    if (!admin) return false;
    if (admin.role === 'super_admin') return true;
    return Boolean(admin.permissions?.[module]?.[action]);
  };

  const generateTempPassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const value = {
    admin,
    login,
    logout,
    createSubAdmin,
    updateSubAdmin,
    deleteSubAdmin,
    resetSubAdminPassword,
    getSubAdmins,
    hasPermission,
    loading
  };

  return (
      <AdminAuthContext.Provider value={value}>
        {children}
      </AdminAuthContext.Provider>
  );
};
