import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../ui/NotificationProvider';
import {
  BookOpen,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  ArrowLeft,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  User,
  Settings,
  TrendingUp,
  Award,
  Clock,
  Target,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal
} from 'lucide-react';

interface Learner {
  tu_id: string;
  tu_email: string;
  tu_user_type: string;
  tu_is_verified: boolean;
  tu_email_verified: boolean;
  tu_mobile_verified: boolean;
  tu_is_active: boolean;
  tu_created_at: string;
  // Changed from single object to array to match actual Supabase response
  tbl_user_profiles: {
    tup_id?: string;
    tup_first_name: string;
    tup_last_name: string;
    tup_middle_name: string;
    tup_username: string;
    tup_mobile: string;
    tup_gender: string;
    tup_education_level: string;
    tup_interests: string[];
    tup_learning_goals: string;
  }[] | null;
}

interface Enrollment {
  tce_id: string;
  tce_progress_percentage: number;
  tce_enrollment_date: string;
  tce_completed_at?: string;
  tbl_courses: {
    tc_title: string;
    tc_difficulty_level: string;
    tc_duration_hours?: number;
  };
}

// Skeleton Loader for Table Rows
const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
      <>
        {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="animate-pulse">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="ml-4">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-28"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-18"></div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex space-x-2">
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading learners...</p>
      </div>
  );
};

const LearnerManagement: React.FC = () => {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [showLearnerDetails, setShowLearnerDetails] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Enhanced Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const notification = useNotification();

  // Load learners with pagination
  const loadLearners = async () => {
    try {
      setLoading(true);
      setListLoading(true);
      setError(null);

      console.log('🔍 Loading learners from database...');

      // Build the base query
      let query = supabase
          .from('tbl_users')
          .select(`
          tu_id,
          tu_email,
          tu_user_type,
          tu_is_verified,
          tu_email_verified,
          tu_mobile_verified,
          tu_is_active,
          tu_created_at,
          tu_updated_at,
          tbl_user_profiles (
            tup_id,
            tup_first_name,
            tup_last_name,
            tup_middle_name,
            tup_username,
            tup_mobile,
            tup_gender,
            tup_education_level,
            tup_interests,
            tup_learning_goals,
            tup_created_at,
            tup_updated_at
          )
        `, { count: 'exact' })
          .eq('tu_user_type', 'learner');

      // Apply filters if any
      if (searchTerm) {
        query = query.or(`tu_email.ilike.%${searchTerm}%,tbl_user_profiles.tup_first_name.ilike.%${searchTerm}%,tbl_user_profiles.tup_last_name.ilike.%${searchTerm}%,tbl_user_profiles.tup_middle_name.ilike.%${searchTerm}%,tbl_user_profiles.tup_username.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('tu_is_active', statusFilter === 'active');
      }

      if (verificationFilter !== 'all') {
        query = query.eq('tu_is_verified', verificationFilter === 'verified');
      }

      // Apply pagination and ordering
      query = query
          .order('tu_created_at', { ascending: false })
          .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      const { data: learners, error, count } = await query;

      if (error) {
        console.error('❌ Failed to load learners:', error);
        throw error;
      }

      console.log('✅ Learners loaded:', learners);
      setLearners(learners || []);
      setTotalCount(count || 0);

    } catch (error) {
      console.error('❌ Failed to load learners:', error);
      setError('Failed to load learners. Please check your database connection.');
      if (notification) {
        notification.showError('Load Failed', 'Failed to load learner data from database');
      }
    } finally {
      setLoading(false);
      setListLoading(false);
    }
  };

  // Reload when filters or pagination change
  useEffect(() => {
    loadLearners();
  }, [searchTerm, statusFilter, verificationFilter, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, verificationFilter]);

  // Helper function to get the first (and typically only) profile from the array
  const getProfile = (learner: Learner) => {
    return learner.tbl_user_profiles && learner.tbl_user_profiles.length > 0
        ? learner.tbl_user_profiles[0]
        : null;
  };

  const handleViewLearner = (learner: Learner) => {
    setSelectedLearner(learner);
    setShowLearnerDetails(true);
    setActiveTab('profile');
    setEditMode(false);
  };

  const handleToggleStatus = async (learner: Learner, currentStatus: boolean) => {
    try {
      const { error } = await supabase
          .from('tbl_users')
          .update({ tu_is_active: !currentStatus })
          .eq('tu_id', learner.tu_id);

      if (error) throw error;

      const profile = getProfile(learner);
      if (notification) {
        notification.showSuccess(
            'Status Updated',
            `Learner ${profile?.tup_first_name || 'account'} has been ${!currentStatus ? 'activated' : 'deactivated'}`
        );
      }

      await loadLearners();

      // If the updated learner is currently selected, update it too
      if (selectedLearner && selectedLearner.tu_id === learner.tu_id) {
        setSelectedLearner(prev => prev ? {...prev, tu_is_active: !currentStatus} : null);
      }
    } catch (error) {
      console.error('Failed to update learner status:', error);
      if (notification) {
        notification.showError('Update Failed', 'Failed to update learner status');
      }
    }
  };

  const refreshSelectedLearner = async (learnerId: string) => {
    try {
      const { data, error } = await supabase
          .from('tbl_users')
          .select(`
          tu_id,
          tu_email,
          tu_user_type,
          tu_is_verified,
          tu_email_verified,
          tu_mobile_verified,
          tu_is_active,
          tu_created_at,
          tu_updated_at,
          tbl_user_profiles (
            tup_id,
            tup_first_name,
            tup_last_name,
            tup_middle_name,
            tup_username,
            tup_mobile,
            tup_gender,
            tup_education_level,
            tup_interests,
            tup_learning_goals,
            tup_created_at,
            tup_updated_at
          )
        `)
          .eq('tu_id', learnerId)
          .single();

      if (error) throw error;
      if (data) {
        setSelectedLearner(data as Learner);
      }
    } catch (error) {
      console.error('Failed to refresh selected learner:', error);
    }
  };

  const handleLearnerUpdate = () => {
    // Refresh the learners list
    loadLearners();

    // Also refresh the selected learner if it exists
    if (selectedLearner) {
      refreshSelectedLearner(selectedLearner.tu_id);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Improved pagination with limited page numbers
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

  if (loading && learners.length === 0) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <Loader />
        </div>
    );
  }

  if (error && learners.length === 0) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Learners</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
                onClick={() => loadLearners()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <BookOpen className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
    );
  }

  if (showLearnerDetails && selectedLearner) {
    return (
        <LearnerDetails
            learner={selectedLearner}
            onBack={() => {
              setShowLearnerDetails(false);
              setSelectedLearner(null);
              setEditMode(false);
            }}
            onUpdate={handleLearnerUpdate}
            editMode={editMode}
            setEditMode={setEditMode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            getProfile={getProfile}
        />
    );
  }

  return (
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Learner Management</h3>
                <p className="text-gray-600">Manage learner accounts and learning progress</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Total: {totalCount} learners
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Search by name, email, or username..."
                />
              </div>
            </div>

            <div>
              <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <select
                  value={verificationFilter}
                  onChange={(e) => setVerificationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
          </div>
        </div>

        {/* Learners List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Learner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Learning Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verification
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
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
                  {learners.map((learner) => {
                    const profile = getProfile(learner);
                    return (
                        <tr key={learner.tu_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {profile?.tup_first_name?.charAt(0) || 'L'}
                              </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  <a onClick={() => handleViewLearner(learner)} className="hover:underline cursor-pointer">
                                    {profile?.tup_first_name || 'N/A'} {profile?.tup_middle_name ? `${profile.tup_middle_name} ` : ''}{profile?.tup_last_name || ''}
                                  </a>
                                </div>
                                <div className="text-sm text-gray-500">
                                  @{profile?.tup_username || 'no-username'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{learner.tu_email}</div>
                            <div className="text-sm text-gray-500">{profile?.tup_mobile || 'Not provided'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {profile?.tup_education_level || 'Not specified'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {profile?.tup_interests?.length || 0} interests
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              learner.tu_email_verified
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                          }`}>
                            <Mail className="h-3 w-3 mr-1" />
                            {learner.tu_email_verified ? 'Email ✓' : 'Email ✗'}
                          </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  learner.tu_mobile_verified
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                              }`}>
                            <Phone className="h-3 w-3 mr-1" />
                                {learner.tu_mobile_verified ? 'Mobile ✓' : 'Mobile ✗'}
                          </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            learner.tu_is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                        }`}>
                          {learner.tu_is_active ? (
                              <>
                                <UserCheck className="h-3 w-3 mr-1" />
                                Active
                              </>
                          ) : (
                              <>
                                <UserX className="h-3 w-3 mr-1" />
                                Inactive
                              </>
                          )}
                        </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(learner.tu_created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                  onClick={() => handleViewLearner(learner)}
                                  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                                  title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                  onClick={() => handleToggleStatus(learner, learner.tu_is_active)}
                                  className={`p-1 rounded ${
                                      learner.tu_is_active
                                          ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                  }`}
                                  title={learner.tu_is_active ? 'Deactivate' : 'Activate'}
                              >
                                {learner.tu_is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                    );
                  })}
                </>
            )}
            </tbody>
          </table>
        </div>

        {/* Enhanced Pagination Controls */}
        {totalCount > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                <span className="font-medium">{totalCount}</span> learners
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
                                ? 'bg-blue-600 text-white'
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

        {/* Empty State */}
        {!listLoading && learners.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No learners found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || verificationFilter !== 'all'
                    ? 'Try adjusting your search criteria'
                    : 'No learners have registered yet'
                }
              </p>
            </div>
        )}
      </div>
  );
};

// Learner Details Component
const LearnerDetails: React.FC<{
  learner: Learner;
  onBack: () => void;
  onUpdate: () => void;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  getProfile: (learner: Learner) => any;
}> = ({ learner, onBack, onUpdate, editMode, setEditMode, activeTab, setActiveTab, getProfile }) => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentLearner, setCurrentLearner] = useState<Learner>(learner);

  const profile = getProfile(currentLearner);

  const [editData, setEditData] = useState({
    first_name: profile?.tup_first_name || '',
    last_name: profile?.tup_last_name || '',
    middle_name: profile?.tup_middle_name || '',
    username: profile?.tup_username || '',
    mobile: profile?.tup_mobile || '',
    gender: profile?.tup_gender || '',
    education_level: profile?.tup_education_level || '',
    learning_goals: profile?.tup_learning_goals || '',
    email: learner.tu_email,
    is_active: learner.tu_is_active,
    email_verified: learner.tu_email_verified,
    mobile_verified: learner.tu_mobile_verified
  });
  const notification = useNotification();

  useEffect(() => {
    if (activeTab === 'courses') {
      loadEnrollments();
    }
  }, [activeTab, learner.tu_id]);

  useEffect(() => {
    setCurrentLearner(learner);
    const updatedProfile = getProfile(learner);
    setEditData({
      first_name: updatedProfile?.tup_first_name || '',
      last_name: updatedProfile?.tup_last_name || '',
      middle_name: updatedProfile?.tup_middle_name || '',
      username: updatedProfile?.tup_username || '',
      mobile: updatedProfile?.tup_mobile || '',
      gender: updatedProfile?.tup_gender || '',
      education_level: updatedProfile?.tup_education_level || '',
      learning_goals: updatedProfile?.tup_learning_goals || '',
      email: learner.tu_email,
      is_active: learner.tu_is_active,
      email_verified: learner.tu_email_verified,
      mobile_verified: learner.tu_mobile_verified
    });
  }, [learner]);

  const loadEnrollments = async () => {
    setLoading(true);
    try {
      const { data: enrollments, error } = await supabase
          .from('tbl_course_enrollments')
          .select(`
          tce_id,
          tce_progress_percentage,
          tce_enrollment_date,
          tce_completed_at,
          tbl_courses (
            tc_title,
            tc_difficulty_level,
            tc_duration_hours
          )
        `)
          .eq('tce_user_id', learner.tu_id)
          .order('tce_enrollment_date', { ascending: false });

      if (error) throw error;
      setEnrollments(enrollments || []);
    } catch (error) {
      console.error('Failed to load enrollments:', error);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      // Update tbl_users table
      const { error: userError } = await supabase
          .from('tbl_users')
          .update({
            tu_email: editData.email,
            tu_email_verified: editData.email_verified,
            tu_mobile_verified: editData.mobile_verified,
            tu_is_active: editData.is_active
          })
          .eq('tu_id', currentLearner.tu_id);

      if (userError) throw userError;

      // Check if profile exists
      if (!profile?.tup_id) {
        // Create new profile if it doesn't exist
        const { error: profileError } = await supabase
            .from('tbl_user_profiles')
            .insert({
              tup_user_id: currentLearner.tu_id,
              tup_first_name: editData.first_name,
              tup_last_name: editData.last_name,
              tup_middle_name: editData.middle_name,
              tup_username: editData.username,
              tup_mobile: editData.mobile || null,
              tup_gender: editData.gender || null,
              tup_education_level: editData.education_level,
              tup_learning_goals: editData.learning_goals
            });

        if (profileError) throw profileError;
      } else {
        // Update existing profile
        const { error: profileError } = await supabase
            .from('tbl_user_profiles')
            .update({
              tup_first_name: editData.first_name,
              tup_last_name: editData.last_name,
              tup_middle_name: editData.middle_name,
              tup_username: editData.username,
              tup_mobile: editData.mobile || null,
              tup_gender: editData.gender || null,
              tup_education_level: editData.education_level,
              tup_learning_goals: editData.learning_goals
            })
            .eq('tup_user_id', currentLearner.tu_id);

        if (profileError) throw profileError;
      }

      // Fetch the updated learner data from database
      const { data: updatedLearner, error: fetchError } = await supabase
          .from('tbl_users')
          .select(`
          tu_id,
          tu_email,
          tu_user_type,
          tu_is_verified,
          tu_email_verified,
          tu_mobile_verified,
          tu_is_active,
          tu_created_at,
          tu_updated_at,
          tbl_user_profiles (
            tup_id,
            tup_first_name,
            tup_last_name,
            tup_middle_name,
            tup_username,
            tup_mobile,
            tup_gender,
            tup_education_level,
            tup_interests,
            tup_learning_goals,
            tup_created_at,
            tup_updated_at
          )
        `)
          .eq('tu_id', currentLearner.tu_id)
          .single();

      if (fetchError) throw fetchError;

      // Update local state with fresh data from database
      setCurrentLearner(updatedLearner as Learner);

      const updatedProfile = getProfile(updatedLearner as Learner);
      setEditData({
        first_name: updatedProfile?.tup_first_name || '',
        last_name: updatedProfile?.tup_last_name || '',
        middle_name: updatedProfile?.tup_middle_name || '',
        username: updatedProfile?.tup_username || '',
        mobile: updatedProfile?.tup_mobile || '',
        gender: updatedProfile?.tup_gender || '',
        education_level: updatedProfile?.tup_education_level || '',
        learning_goals: updatedProfile?.tup_learning_goals || '',
        email: updatedLearner.tu_email,
        is_active: updatedLearner.tu_is_active,
        email_verified: updatedLearner.tu_email_verified,
        mobile_verified: updatedLearner.tu_mobile_verified
      });

      // Notify parent component to update its state
      onUpdate();

      setEditMode(false);
      if (notification) {
        notification.showSuccess('Learner Updated', 'Learner information has been updated successfully');
      }
    } catch (error) {
      console.error('Failed to update learner:', error);
      if (notification) {
        notification.showError('Update Failed', 'Failed to update learner information');
      }
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Details', icon: User },
    { id: 'courses', label: 'Enrolled Courses', icon: BookOpen },
    { id: 'progress', label: 'Learning Progress', icon: TrendingUp }
  ];

  return (
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                  onClick={onBack}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Learners</span>
              </button>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {profile?.tup_first_name || 'N/A'} {profile?.tup_middle_name ? `${profile.tup_middle_name} ` : ''}{profile?.tup_last_name || ''}
                </h3>
                <p className="text-gray-600">Learner Details & Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {activeTab === 'profile' && (
                  <>
                    {editMode ? (
                        <div className="flex space-x-2">
                          <button
                              onClick={handleSaveEdit}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save Changes</span>
                          </button>
                          <button
                              onClick={() => setEditMode(false)}
                              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                          >
                            <X className="h-4 w-4" />
                            <span>Cancel</span>
                          </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setEditMode(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit Learner</span>
                        </button>
                    )}
                  </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                  <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Personal Information */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Personal Information
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">First Name</label>
                          {editMode ? (
                              <input
                                  type="text"
                                  value={editData.first_name}
                                  onChange={(e) => setEditData(prev => ({ ...prev, first_name: e.target.value }))}
                                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                          ) : (
                              <p className="text-gray-900 mt-1">{profile?.tup_first_name || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Middle Name</label>
                          {editMode ? (
                              <input
                                  type="text"
                                  value={editData.middle_name}
                                  onChange={(e) => setEditData(prev => ({ ...prev, middle_name: e.target.value }))}
                                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                          ) : (
                              <p className="text-gray-900 mt-1">{profile?.tup_middle_name || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Last Name</label>
                          {editMode ? (
                              <input
                                  type="text"
                                  value={editData.last_name}
                                  onChange={(e) => setEditData(prev => ({ ...prev, last_name: e.target.value }))}
                                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                          ) : (
                              <p className="text-gray-900 mt-1">{profile?.tup_last_name || 'Not provided'}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Username</label>
                        {editMode ? (
                            <input
                                type="text"
                                value={editData.username}
                                onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        ) : (
                            <p className="text-gray-900 mt-1">@{profile?.tup_username || 'Not provided'}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        {editMode ? (
                            <input
                                type="email"
                                value={editData.email}
                                onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        ) : (
                            <p className="text-gray-900 mt-1">{currentLearner.tu_email}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Mobile</label>
                        {editMode ? (
                            <input
                                type="tel"
                                value={editData.mobile}
                                onChange={(e) => setEditData(prev => ({ ...prev, mobile: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        ) : (
                            <p className="text-gray-900 mt-1">{profile?.tup_mobile || 'Not provided'}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Education Level</label>
                        {editMode ? (
                            <select
                                value={editData.education_level}
                                onChange={(e) => setEditData(prev => ({ ...prev, education_level: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select education level</option>
                              <option value="High School">High School</option>
                              <option value="Associate Degree">Associate Degree</option>
                              <option value="Bachelor's Degree">Bachelor's Degree</option>
                              <option value="Master's Degree">Master's Degree</option>
                              <option value="PhD">PhD</option>
                              <option value="Professional Certification">Professional Certification</option>
                              <option value="Self-taught">Self-taught</option>
                              <option value="Other">Other</option>
                            </select>
                        ) : (
                            <p className="text-gray-900 mt-1">{profile?.tup_education_level || 'Not specified'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      Account Information
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Registration Date</label>
                        <p className="text-gray-900 mt-1">{new Date(currentLearner.tu_created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Learning Goals</label>
                        {editMode ? (
                            <textarea
                                value={editData.learning_goals}
                                onChange={(e) => setEditData(prev => ({ ...prev, learning_goals: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={3}
                            />
                        ) : (
                            <p className="text-gray-900 mt-1">{profile?.tup_learning_goals || 'Not specified'}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Interests</label>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {profile?.tup_interests && profile.tup_interests.length > 0 ? (
                              profile.tup_interests.map((interest, index) => (
                                  <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            {interest}
                          </span>
                              ))
                          ) : (
                              <span className="text-gray-500 text-sm">No interests specified</span>
                          )}
                        </div>
                      </div>
                      {editMode && (
                          <>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Account Status</label>
                              <select
                                  value={editData.is_active ? 'active' : 'inactive'}
                                  onChange={(e) => setEditData(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-500">Email Verification</label>
                                <select
                                    value={editData.email_verified ? 'verified' : 'unverified'}
                                    onChange={(e) => setEditData(prev => ({ ...prev, email_verified: e.target.value === 'verified' }))}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="verified">Verified</option>
                                  <option value="unverified">Unverified</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-500">Mobile Verification</label>
                                <select
                                    value={editData.mobile_verified ? 'verified' : 'unverified'}
                                    onChange={(e) => setEditData(prev => ({ ...prev, mobile_verified: e.target.value === 'verified' }))}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="verified">Verified</option>
                                  <option value="unverified">Unverified</option>
                                </select>
                              </div>
                            </div>
                          </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          )}

          {activeTab === 'courses' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Enrolled Courses
                  </h4>
                  <div className="text-sm text-gray-500">
                    Total: {enrollments.length} courses
                  </div>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading courses...</p>
                    </div>
                ) : enrollments.length > 0 ? (
                    <div className="space-y-4">
                      {enrollments.map((enrollment) => (
                          <div key={enrollment.tce_id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="bg-blue-100 p-2 rounded-lg">
                                    <BookOpen className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-gray-900">
                                      {enrollment.tbl_courses?.tc_title || 'Course Title Not Available'}
                                    </h5>
                                    <p className="text-sm text-gray-500">
                                      Enrolled: {new Date(enrollment.tce_enrollment_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                  <div>
                                    <span className="text-xs font-medium text-gray-500">Difficulty</span>
                                    <p className="text-sm text-gray-900 capitalize">
                                      {enrollment.tbl_courses?.tc_difficulty_level || 'Not specified'}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-gray-500">Progress</span>
                                    <div className="flex items-center space-x-2">
                                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${Math.min(100, Math.max(0, enrollment.tce_progress_percentage))}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-sm font-medium">
                                {Math.round(enrollment.tce_progress_percentage)}%
                              </span>
                                    </div>
                                  </div>
                                </div>
                                {enrollment.tce_completed_at && (
                                    <div className="mt-2">
                                      <span className="text-xs font-medium text-gray-500">Completed:</span>
                                      <p className="text-sm text-green-600">
                                        {new Date(enrollment.tce_completed_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                )}
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No courses enrolled</h3>
                      <p className="text-gray-600">This learner hasn't enrolled in any courses yet.</p>
                    </div>
                )}
              </div>
          )}

          {activeTab === 'progress' && (
              <div>
                <h4 className="font-medium text-gray-900 mb-6 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Learning Analytics
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-blue-50 p-6 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{enrollments.length}</div>
                    <div className="text-sm text-blue-600">Courses Enrolled</div>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {enrollments.filter(e => e.tce_progress_percentage === 100).length}
                    </div>
                    <div className="text-sm text-green-600">Completed</div>
                  </div>
                  <div className="bg-yellow-50 p-6 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {enrollments.length > 0
                          ? Math.round(enrollments.reduce((sum, e) => sum + e.tce_progress_percentage, 0) / enrollments.length)
                          : 0}%
                    </div>
                    <div className="text-sm text-yellow-600">Avg Progress</div>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {enrollments.filter(e => e.tce_completed_at).length}
                    </div>
                    <div className="text-sm text-purple-600">Certificates</div>
                  </div>
                </div>

                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <p>Detailed learning analytics will be displayed here</p>
                </div>
              </div>
          )}
        </div>
      </div>
  );
};

export default LearnerManagement;