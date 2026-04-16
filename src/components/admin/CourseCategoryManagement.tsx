import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/adminClient';
import { useNotification } from '../ui/NotificationProvider';
import { Folder, Search, Plus, Trash2, Save, X, Eye, Palette, Hash, ArrowUp, ArrowDown, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react';

interface CourseCategory {
  tcc_id: string;
  tcc_name: string;
  tcc_description: string;
  tcc_icon: string;
  tcc_color: string;
  tcc_is_active: boolean;
  tcc_sort_order: number;
  tcc_created_at: string;
  tcc_updated_at: string;
  course_count?: number;
}

// Skeleton Loader for Table Rows
const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
      <>
        {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="animate-pulse">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 bg-gray-200 rounded"></div>
                  <div className="flex flex-col space-y-1">
                    <div className="h-3 w-3 bg-gray-200 rounded"></div>
                    <div className="h-3 w-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-200 rounded-lg mr-4"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-48"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex space-x-2">
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
              </td>
            </tr>
        ))}
      </>
  );
};

// Loader Component
const Loader: React.FC = () => {
  return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
        <p className="text-gray-600">Loading categories...</p>
      </div>
  );
};

const CourseCategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory | null>(null);
  const notification = useNotification();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(null);

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    icon: 'BookOpen',
    color: '#3B82F6',
    is_active: true,
    sort_order: 1
  });

  const iconOptions = [
    'BookOpen', 'Code', 'Calculator', 'Atom', 'Globe', 'Briefcase',
    'Languages', 'Palette', 'Music', 'Camera', 'Heart', 'Star',
    'Zap', 'Target', 'Award', 'Rocket', 'Shield', 'Crown'
  ];

  const colorOptions = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#A855F7'  // Violet
  ];

  const loadCategories = async () => {
    try {
      setLoading(true);
      setListLoading(true);
      setError(null);

      console.log('🔍 Loading course categories...');

      const { data, error, count } = await supabase
          .from('tbl_course_categories')
          .select(`
          *,
          tbl_courses!tc_category_id(tc_id)
        `, { count: 'exact' })
          .order('tcc_sort_order');

      if (error) {
        console.error('❌ Failed to load categories:', error);
        throw error;
      }

      // Process the data to include course count
      const processedCategories = data?.map(category => ({
        ...category,
        course_count: Array.isArray(category.tbl_courses) ? category.tbl_courses.length : 0
      })) || [];

      console.log('✅ Categories loaded:', processedCategories);
      setCategories(processedCategories);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('❌ Failed to load categories:', error);
      setError('Failed to load course categories');
    } finally {
      setLoading(false);
      setListLoading(false);
    }
  };

  // Load data when component mounts or filters/pagination change
  useEffect(() => {
    loadCategories();
  }, [searchTerm, statusFilter, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesSearch = !normalizedSearch || [
        category.tcc_name,
        category.tcc_description,
        category.tcc_icon,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && category.tcc_is_active) ||
        (statusFilter === 'inactive' && !category.tcc_is_active);

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchTerm, statusFilter]);

  const filteredCount = filteredCategories.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / itemsPerPage));
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCategories, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMode && selectedCategory) {
        // Update existing category
        const { error } = await supabase
            .from('tbl_course_categories')
            .update({
              tcc_name: categoryFormData.name,
              tcc_description: categoryFormData.description,
              tcc_icon: categoryFormData.icon,
              tcc_color: categoryFormData.color,
              tcc_is_active: categoryFormData.is_active,
              tcc_sort_order: categoryFormData.sort_order
            })
            .eq('tcc_id', selectedCategory.tcc_id);

        if (error) throw error;
        notification.showSuccess('Category Updated', 'Course category has been updated successfully');
      } else {
        // Create new category
        const { error } = await supabase
            .from('tbl_course_categories')
            .insert({
              tcc_name: categoryFormData.name,
              tcc_description: categoryFormData.description,
              tcc_icon: categoryFormData.icon,
              tcc_color: categoryFormData.color,
              tcc_is_active: categoryFormData.is_active,
              tcc_sort_order: categoryFormData.sort_order
            });

        if (error) throw error;
        notification.showSuccess('Category Created', 'New course category has been created successfully');
      }

      setShowCategoryModal(false);
      resetCategoryForm();
      loadCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      notification.showError('Save Failed', 'Failed to save course category');
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
      try {
        const { error } = await supabase
            .from('tbl_course_categories')
            .delete()
            .eq('tcc_id', categoryId);

        if (error) throw error;
        notification.showSuccess('Category Deleted', 'Course category has been deleted successfully');
        loadCategories();
      } catch (error) {
        console.error('Failed to delete category:', error);
        notification.showError('Delete Failed', 'Failed to delete course category. It may have associated courses.');
      }
    }
  };

  const handleToggleStatus = async (categoryId: string, currentStatus: boolean) => {
    try {
      setUpdatingCategoryId(categoryId);
      const { error } = await supabase
          .from('tbl_course_categories')
          .update({ tcc_is_active: !currentStatus })
          .eq('tcc_id', categoryId);

      if (error) throw error;

      setCategories((prev) => prev.map((category) => (
        category.tcc_id === categoryId
          ? { ...category, tcc_is_active: !currentStatus }
          : category
      )));

      notification.showSuccess(
          'Status Updated',
          `Category has been ${!currentStatus ? 'activated' : 'deactivated'}`
      );
    } catch (error) {
      console.error('Failed to update category status:', error);
      notification.showError('Update Failed', 'Failed to update category status');
    } finally {
      setUpdatingCategoryId(null);
    }
  };

  const handleReorderCategory = async (categoryId: string, direction: 'up' | 'down') => {
    try {
      const category = categories.find(c => c.tcc_id === categoryId);
      if (!category) return;

      const currentOrder = category.tcc_sort_order;
      const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;

      // Find the category to swap with
      const swapCategory = categories.find(c => c.tcc_sort_order === newOrder);

      if (swapCategory) {
        // Swap the sort orders
        await supabase
            .from('tbl_course_categories')
            .update({ tcc_sort_order: currentOrder })
            .eq('tcc_id', swapCategory.tcc_id);

        await supabase
            .from('tbl_course_categories')
            .update({ tcc_sort_order: newOrder })
            .eq('tcc_id', categoryId);

        loadCategories();
      }
    } catch (error) {
      console.error('Failed to reorder category:', error);
      notification.showError('Reorder Failed', 'Failed to reorder category');
    }
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      description: '',
      icon: 'BookOpen',
      color: '#3B82F6',
      is_active: true,
      sort_order: 1
    });
    setEditMode(false);
    setSelectedCategory(null);
  };

  const openEditCategory = (category: CourseCategory) => {
    setSelectedCategory(category);
    setCategoryFormData({
      name: category.tcc_name,
      description: category.tcc_description,
      icon: category.tcc_icon,
      color: category.tcc_color,
      is_active: category.tcc_is_active,
      sort_order: category.tcc_sort_order
    });
    setEditMode(true);
    setShowCategoryModal(true);
  };

  // Get page numbers with ellipsis for better navigation
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always include first page
      pageNumbers.push(1);

      // Calculate start and end of visible page range
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're near the beginning
      if (currentPage <= 3) {
        endPage = 4;
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
      }

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pageNumbers.push('...');
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }

      // Always include last page
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  const paginate = (pageNumber: number | string) => {
    if (pageNumber !== '...' && typeof pageNumber === 'number') {
      setCurrentPage(pageNumber);
    }
  };

  if (loading && categories.length === 0) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <Loader />
        </div>
    );
  }

  if (error && categories.length === 0) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center py-12">
            <Folder className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Categories</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
                onClick={loadCategories}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
    );
  }

  return (
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Folder className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Course Categories</h3>
                <p className="text-gray-600">Manage course categories and organization</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Total: {filteredCount} categories
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
              <button
                  onClick={() => {
                    resetCategoryForm();
                    setShowCategoryModal(true);
                  }}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Category</span>
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Search categories..."
                />
              </div>
            </div>

            <div>
              <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Categories List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Courses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
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
            {listLoading ? (
                <TableSkeleton rows={itemsPerPage} />
            ) : (
                <>
                  {paginatedCategories.map((category, index) => (
                      <tr key={category.tcc_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {category.tcc_sort_order}
                        </span>
                            <div className="flex flex-col space-y-1">
                              <button
                                  onClick={() => handleReorderCategory(category.tcc_id, 'up')}
                                  disabled={index === 0}
                                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                  onClick={() => handleReorderCategory(category.tcc_id, 'down')}
                                  disabled={index === paginatedCategories.length - 1}
                                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center mr-4"
                                style={{ backgroundColor: category.tcc_color + '20', border: `2px solid ${category.tcc_color}` }}
                            >
                          <span className="text-lg" style={{ color: category.tcc_color }}>
                            {category.tcc_icon === 'BookOpen' && '📚'}
                            {category.tcc_icon === 'Code' && '💻'}
                            {category.tcc_icon === 'Calculator' && '🧮'}
                            {category.tcc_icon === 'Atom' && '⚛️'}
                            {category.tcc_icon === 'Globe' && '🌐'}
                            {category.tcc_icon === 'Briefcase' && '💼'}
                            {category.tcc_icon === 'Languages' && '🗣️'}
                            {category.tcc_icon === 'Palette' && '🎨'}
                            {category.tcc_icon === 'Music' && '🎵'}
                            {category.tcc_icon === 'Camera' && '📷'}
                            {category.tcc_icon === 'Heart' && '❤️'}
                            {category.tcc_icon === 'Star' && '⭐'}
                            {category.tcc_icon === 'Zap' && '⚡'}
                            {category.tcc_icon === 'Target' && '🎯'}
                            {category.tcc_icon === 'Award' && '🏆'}
                            {category.tcc_icon === 'Rocket' && '🚀'}
                            {category.tcc_icon === 'Shield' && '🛡️'}
                            {category.tcc_icon === 'Crown' && '👑'}
                          </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {category.tcc_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {category.tcc_icon}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {category.tcc_description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {category.course_count || 0} courses
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                      <button
                          type="button"
                          onClick={() => handleToggleStatus(category.tcc_id, category.tcc_is_active)}
                          disabled={updatingCategoryId === category.tcc_id}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                              category.tcc_is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                          } ${updatingCategoryId === category.tcc_id ? 'opacity-60 cursor-not-allowed' : 'hover:ring-2 hover:ring-offset-1 hover:ring-orange-300'}`}
                      >
                        {category.tcc_is_active ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </>
                        ) : (
                            <>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                        )}
                      </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(category.tcc_created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                                onClick={() => openEditCategory(category)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                                title="View Category"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {(category.course_count || 0) === 0 && (
                              <button
                                  onClick={() => handleDeleteCategory(category.tcc_id, category.tcc_name)}
                                  className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                                  title="Delete Category"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                  ))}
                </>
            )}
            </tbody>
          </table>
        </div>

        {/* Enhanced Pagination Controls */}
        {filteredCount > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredCount)}</span> of{' '}
                <span className="font-medium">{filteredCount}</span> categories
              </div>

              <div className="flex items-center space-x-1">
                <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-md ${
                        currentPage === 1
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-md ${
                        currentPage === 1
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageNumbers().map((page, index) => (
                    <button
                        key={index}
                        onClick={() => paginate(page)}
                        className={`px-3 py-1 rounded-md ${
                            page === currentPage
                                ? 'bg-orange-600 text-white'
                                : page === '...'
                                    ? 'bg-transparent text-gray-500 cursor-default'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        disabled={page === '...'}
                    >
                      {page === '...' ? <MoreHorizontal className="h-4 w-4" /> : page}
                    </button>
                ))}

                <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-md ${
                        currentPage === totalPages
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-md ${
                        currentPage === totalPages
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
        )}

        {filteredCategories.length === 0 && !listLoading && (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search criteria'
                    : 'No course categories have been created yet'
                }
              </p>
              <button
                  onClick={() => {
                    resetCategoryForm();
                    setShowCategoryModal(true);
                  }}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Create Category
              </button>
            </div>
        )}

        {/* Category Modal */}
        {showCategoryModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {editMode ? 'Edit Category' : 'Add New Category'}
                    </h3>
                    <button
                        onClick={() => {
                          setShowCategoryModal(false);
                          resetCategoryForm();
                        }}
                        className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveCategory} className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category Name *
                    </label>
                    <input
                        type="text"
                        required
                        value={categoryFormData.name}
                        onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., Programming, Mathematics, Science"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                        rows={3}
                        value={categoryFormData.description}
                        onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Brief description of this category"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Icon
                      </label>
                      <select
                          value={categoryFormData.icon}
                          onChange={(e) => setCategoryFormData(prev => ({ ...prev, icon: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        {iconOptions.map(icon => (
                            <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Preview:</span>
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: categoryFormData.color + '20', border: `2px solid ${categoryFormData.color}` }}
                        >
                      <span style={{ color: categoryFormData.color }}>
                        {categoryFormData.icon === 'BookOpen' && '📚'}
                        {categoryFormData.icon === 'Code' && '💻'}
                        {categoryFormData.icon === 'Calculator' && '🧮'}
                        {categoryFormData.icon === 'Atom' && '⚛️'}
                        {categoryFormData.icon === 'Globe' && '🌐'}
                        {categoryFormData.icon === 'Briefcase' && '💼'}
                        {categoryFormData.icon === 'Languages' && '🗣️'}
                        {categoryFormData.icon === 'Palette' && '🎨'}
                        {categoryFormData.icon === 'Music' && '🎵'}
                        {categoryFormData.icon === 'Camera' && '📷'}
                        {categoryFormData.icon === 'Heart' && '❤️'}
                        {categoryFormData.icon === 'Star' && '⭐'}
                        {categoryFormData.icon === 'Zap' && '⚡'}
                        {categoryFormData.icon === 'Target' && '🎯'}
                        {categoryFormData.icon === 'Award' && '🏆'}
                        {categoryFormData.icon === 'Rocket' && '🚀'}
                        {categoryFormData.icon === 'Shield' && '🛡️'}
                        {categoryFormData.icon === 'Crown' && '👑'}
                      </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color
                      </label>
                      <div className="grid grid-cols-6 gap-2 mb-2">
                        {colorOptions.map(color => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setCategoryFormData(prev => ({ ...prev, color }))}
                                className={`w-8 h-8 rounded-lg border-2 ${
                                    categoryFormData.color === color ? 'border-gray-800' : 'border-gray-300'
                                }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                      </div>
                      <input
                          type="color"
                          value={categoryFormData.color}
                          onChange={(e) => setCategoryFormData(prev => ({ ...prev, color: e.target.value }))}
                          className="w-full h-10 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sort Order
                      </label>
                      <input
                          type="number"
                          min="1"
                          value={categoryFormData.sort_order}
                          onChange={(e) => setCategoryFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 1 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={categoryFormData.is_active}
                            onChange={(e) => setCategoryFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Active Category</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={() => {
                          setShowCategoryModal(false);
                          resetCategoryForm();
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>{editMode ? 'Update Category' : 'Create Category'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
};

export default CourseCategoryManagement;
