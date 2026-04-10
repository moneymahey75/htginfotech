import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import type { PermissionModule, PermissionSet } from '../../contexts/AdminAuthContext';
import {
  Shield,
  Users,
  Plus,
  Edit,
  Trash2,
  Calendar,
  UserCheck,
  UserX,
  Key,
  Save
} from 'lucide-react';

interface SubAdmin {
  id: string;
  email: string;
  fullName: string;
  permissions: PermissionSet;
  isActive: boolean;
  createdBy: string;
  lastLogin?: string;
  createdAt: string;
}

const permissionModuleLabels: Record<Exclude<PermissionModule, 'admins'>, string> = {
  enrollments: 'Enrollments',
  learners: 'Learners',
  tutors: 'Tutors',
  courses: 'Courses',
  categories: 'Course Categories',
  payments: 'Payments',
  sliders: 'Home Sliders',
  settings: 'Settings',
};

const visiblePermissionModules = Object.keys(permissionModuleLabels) as Array<Exclude<PermissionModule, 'admins'>>;
type VisiblePermissionModule = (typeof visiblePermissionModules)[number];
type PermissionAction = keyof PermissionSet[PermissionModule];

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

const clonePermissions = (permissions: PermissionSet): PermissionSet => ({
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

const createDefaultSubAdminForm = () => ({
  id: '',
  email: '',
  fullName: '',
  isActive: true,
  permissions: createDefaultPermissions(),
});

const AdminManagement: React.FC = () => {
  const { admin, hasPermission, getSubAdmins, createSubAdmin, updateSubAdmin, deleteSubAdmin, resetSubAdminPassword } = useAdminAuth();
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [newSubAdmin, setNewSubAdmin] = useState(createDefaultSubAdminForm);

  const [editSubAdmin, setEditSubAdmin] = useState(createDefaultSubAdminForm);

  useEffect(() => {
    loadSubAdmins();
  }, []);

  const loadSubAdmins = async () => {
    setLoading(true);
    try {
      const data = await getSubAdmins();
      setSubAdmins(data);
    } catch (error) {
      console.error('Failed to load sub-admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncSubAdminState = (subAdminId: string, updates: Partial<SubAdmin>) => {
    setSubAdmins((current) =>
      current.map((item) => (item.id === subAdminId ? { ...item, ...updates } : item))
    );
  };

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSubAdmin(newSubAdmin);
      setShowCreateModal(false);
      setNewSubAdmin(createDefaultSubAdminForm());
      loadSubAdmins();
    } catch (error) {
      console.error('Failed to create sub-admin:', error);
    }
  };

  const handleEditSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedSubAdmin = await updateSubAdmin(editSubAdmin.id, {
        email: editSubAdmin.email,
        fullName: editSubAdmin.fullName,
        isActive: editSubAdmin.isActive,
        permissions: clonePermissions(editSubAdmin.permissions)
      });
      syncSubAdminState(editSubAdmin.id, updatedSubAdmin);
      setEditSubAdmin({
        id: updatedSubAdmin.id,
        email: updatedSubAdmin.email,
        fullName: updatedSubAdmin.fullName,
        isActive: updatedSubAdmin.isActive,
        permissions: clonePermissions(updatedSubAdmin.permissions)
      });
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update sub-admin:', error);
    }
  };

  const handleToggleStatus = async (subAdminId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    syncSubAdminState(subAdminId, { isActive: nextStatus });
    setEditSubAdmin((current) =>
      current.id === subAdminId ? { ...current, isActive: nextStatus } : current
    );
    setStatusUpdatingId(subAdminId);

    try {
      const updatedSubAdmin = await updateSubAdmin(subAdminId, { isActive: nextStatus });
      syncSubAdminState(subAdminId, updatedSubAdmin);
      setEditSubAdmin((current) =>
        current.id === subAdminId
          ? {
              ...current,
              isActive: updatedSubAdmin.isActive,
              permissions: clonePermissions(updatedSubAdmin.permissions)
            }
          : current
      );
    } catch (error) {
      syncSubAdminState(subAdminId, { isActive: currentStatus });
      setEditSubAdmin((current) =>
        current.id === subAdminId ? { ...current, isActive: currentStatus } : current
      );
      console.error('Failed to update sub-admin status:', error);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleResetPassword = async (subAdminId: string) => {
    if (confirm('Are you sure you want to reset this sub-admin\'s password?')) {
      try {
        await resetSubAdminPassword(subAdminId);
      } catch (error) {
        console.error('Failed to reset password:', error);
      }
    }
  };

  const handleDeleteSubAdmin = async (subAdminId: string) => {
    if (confirm('Are you sure you want to delete this sub-admin? This action cannot be undone.')) {
      try {
        await deleteSubAdmin(subAdminId);
        loadSubAdmins();
      } catch (error) {
        console.error('Failed to delete sub-admin:', error);
      }
    }
  };

  const handleOpenEditModal = (subAdmin: SubAdmin) => {
    setEditSubAdmin({
      id: subAdmin.id,
      email: subAdmin.email,
      fullName: subAdmin.fullName,
      isActive: subAdmin.isActive,
      permissions: clonePermissions(subAdmin.permissions)
    });
    setShowEditModal(true);
  };

  const handleGlobalSelectAll = (select: boolean, isEdit: boolean = false) => {
    const setter = isEdit ? setEditSubAdmin : setNewSubAdmin;
    setter(prev => {
      const updatedPermissions = { ...prev.permissions };
      visiblePermissionModules.forEach(module => {
        updatedPermissions[module] = {
          read: select,
          write: select,
          delete: select
        };
      });
      return {
        ...prev,
        permissions: updatedPermissions
      };
    });
  };

  const handleModuleSelectAll = (module: VisiblePermissionModule, select: boolean, isEdit: boolean = false) => {
    const setter = isEdit ? setEditSubAdmin : setNewSubAdmin;
    setter(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          read: select,
          write: select,
          delete: select
        }
      }
    }));
  };

  const updatePermission = (
    module: VisiblePermissionModule,
    action: PermissionAction,
    value: boolean,
    isEdit: boolean = false
  ) => {
    const setter = isEdit ? setEditSubAdmin : setNewSubAdmin;
    setter(prev => {
      const updatedPermissions = { ...prev.permissions };
      if (action === 'read' && !value) {
        updatedPermissions[module] = {
          read: false,
          write: false,
          delete: false
        };
      } else {
        updatedPermissions[module] = {
          ...updatedPermissions[module],
          [action]: value
        };
      }
      return {
        ...prev,
        permissions: updatedPermissions
      };
    });
  };

  const filteredSubAdmins = subAdmins.filter(subAdmin => {
    const matchesSearch =
        subAdmin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subAdmin.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && subAdmin.isActive) ||
        (statusFilter === 'inactive' && !subAdmin.isActive);
    return matchesSearch && matchesStatus;
  });

  const getPermissionSummary = (permissions: SubAdmin['permissions']) => {
    const totalPermissions = visiblePermissionModules.reduce((total, module) => {
      const modulePerms = permissions[module];
      return total + Object.values(modulePerms).filter(Boolean).length;
    }, 0);
    const maxPermissions = visiblePermissionModules.length * 3;
    return `${totalPermissions}/${maxPermissions}`;
  };

  const renderPermissionSections = (isEdit = false) => {
    const currentPermissions = isEdit ? editSubAdmin.permissions : newSubAdmin.permissions;

    return (
    <div className="space-y-4">
      {visiblePermissionModules.map((module) => (
        <div key={module} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">{permissionModuleLabels[module]}</h4>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => handleModuleSelectAll(module, false, isEdit)}
                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                None
              </button>
              <button
                type="button"
                onClick={() => handleModuleSelectAll(module, true, isEdit)}
                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {(['read', 'write', 'delete'] as const).map((action) => (
              <label key={action} className="flex items-center">
                <input
                  type="checkbox"
                  checked={currentPermissions[module][action]}
                  onChange={(e) => updatePermission(module, action, e.target.checked, isEdit)}
                  disabled={action !== 'read' && !currentPermissions[module].read}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">{action}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
    );
  };

  if (loading) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-3 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Admin Management</h3>
                <p className="text-gray-600">Manage sub-administrators and their permissions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Total: {subAdmins.length} sub-admins
              </div>
              {hasPermission('admins', 'write') && (
                  <button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Sub-Admin</span>
                  </button>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Search by name or email..."
                />
              </div>
            </div>

            <div>
              <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Current Super Admin Info */}
        <div className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 w-12 h-12 rounded-xl flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">{admin?.fullName}</h4>
              <p className="text-sm text-gray-600">{admin?.email}</p>
              <div className="flex items-center space-x-4 mt-1">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <Shield className="h-3 w-3 mr-1" />
                Super Administrator
              </span>
                <span className="text-xs text-gray-500">
                Full system access
              </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Admins List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sub-Admin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
            {filteredSubAdmins.map((subAdmin) => (
                <tr key={subAdmin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {subAdmin.fullName.charAt(0)}
                        </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {subAdmin.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {subAdmin.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {getPermissionSummary(subAdmin.permissions)} permissions
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                        type="button"
                        role="switch"
                        aria-checked={subAdmin.isActive}
                        aria-label={subAdmin.isActive ? 'Deactivate sub-admin' : 'Activate sub-admin'}
                        disabled={statusUpdatingId === subAdmin.id}
                        onClick={() => handleToggleStatus(subAdmin.id, subAdmin.isActive)}
                        className={`inline-flex items-center gap-3 rounded-full border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            subAdmin.isActive
                                ? 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100'
                                : 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
                        }`}
                    >
                      <span
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              subAdmin.isActive ? 'bg-green-500' : 'bg-red-400'
                          }`}
                      >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                subAdmin.isActive ? 'translate-x-5' : 'translate-x-1'
                            }`}
                        />
                      </span>
                      <span className="inline-flex items-center">
                        {subAdmin.isActive ? (
                            <UserCheck className="mr-1 h-3 w-3" />
                        ) : (
                            <UserX className="mr-1 h-3 w-3" />
                        )}
                        {statusUpdatingId === subAdmin.id
                          ? 'Updating...'
                          : subAdmin.isActive
                            ? 'Active'
                            : 'Inactive'}
                      </span>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {subAdmin.lastLogin ? (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(subAdmin.lastLogin).toLocaleDateString()}
                        </div>
                    ) : (
                        <span className="text-gray-400">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(subAdmin.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {hasPermission('admins', 'write') && (
                          <>
                            <button
                                onClick={() => handleOpenEditModal(subAdmin)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit Sub-Admin"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => handleResetPassword(subAdmin.id)}
                                className="text-yellow-600 hover:text-yellow-800"
                                title="Reset Password"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                          </>
                      )}
                      {hasPermission('admins', 'delete') && (
                          <button
                              onClick={() => handleDeleteSubAdmin(subAdmin.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete Sub-Admin"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                      )}
                    </div>
                  </td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>

        {filteredSubAdmins.length === 0 && (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sub-admins found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search criteria'
                    : 'No sub-administrators have been created yet'
                }
              </p>
              {hasPermission('admins', 'write') && !searchTerm && statusFilter === 'all' && (
                  <button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Create Sub-Admin
                  </button>
              )}
            </div>
        )}

        {/* Create Sub-Admin Modal */}
        {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Create New Sub-Admin</h3>
                <form onSubmit={handleCreateSubAdmin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                        type="text"
                        required
                        value={newSubAdmin.fullName}
                        onChange={(e) => setNewSubAdmin(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                        type="email"
                        required
                        value={newSubAdmin.email}
                        onChange={(e) => setNewSubAdmin(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                          type="checkbox"
                          checked={newSubAdmin.isActive}
                          onChange={(e) => setNewSubAdmin(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active Status</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                          type="checkbox"
                          checked={editSubAdmin.isActive}
                          onChange={(e) => setEditSubAdmin(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active Status</span>
                    </label>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium text-gray-700">Permissions</label>
                      <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => handleGlobalSelectAll(false)}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                        >
                          Deselect All
                        </button>
                        <button
                            type="button"
                            onClick={() => handleGlobalSelectAll(true)}
                            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                        >
                          Select All
                        </button>
                      </div>
                    </div>

                    {renderPermissionSections()}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Create Sub-Admin
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* Edit Sub-Admin Modal */}
        {showEditModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Edit Sub-Admin</h3>
                <form onSubmit={handleEditSubAdmin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                        type="text"
                        required
                        value={editSubAdmin.fullName}
                        onChange={(e) => setEditSubAdmin(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                        type="email"
                        required
                        value={editSubAdmin.email}
                        onChange={(e) => setEditSubAdmin(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium text-gray-700">Permissions</label>
                      <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => handleGlobalSelectAll(false, true)}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                        >
                          Deselect All
                        </button>
                        <button
                            type="button"
                            onClick={() => handleGlobalSelectAll(true, true)}
                            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                        >
                          Select All
                        </button>
                      </div>
                    </div>

                    {renderPermissionSections(true)}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
};

export default AdminManagement;
