import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../ui/NotificationProvider';
import {
  GraduationCap,
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
  DollarSign,
  Star,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal
} from 'lucide-react';

interface Tutor {
  tu_id: string;
  tu_email: string;
  tu_user_type: string;
  tu_is_verified: boolean;
  tu_email_verified: boolean;
  tu_mobile_verified: boolean;
  tu_is_active: boolean;
  tu_created_at: string;
  tbl_user_profiles: {
    tup_first_name: string;
    tup_last_name: string;
    tup_middle_name: string;
    tup_username: string;
    tup_mobile: string;
    tup_gender: string;
    tup_education_level: string;
  }[] | null;
  tbl_tutors: {
    tt_id: string;
    tt_bio: string;
    tt_specializations: string[];
    tt_experience_years: number;
    tt_education: string;
    tt_hourly_rate: number;
    tt_rating: number;
    tt_total_reviews: number;
    tt_total_students: number;
    tt_is_verified: boolean;
    tt_is_active: boolean;
  }[] | null;
}

interface Assignment {
  tta_id: string;
  tta_assigned_at: string;
  tta_status: string;
  tta_learner_id: string;
  tta_course_id: string;
  tbl_users?: {
    tbl_user_profiles: {
      tup_first_name: string;
      tup_last_name: string;
    }[];
  };
  tbl_courses?: {
    tc_title: string;
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
                <div className="h-6 bg-gray-200 rounded-full w-40 mt-1"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-6 bg-gray-200 rounded-full w-24"></div>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
        <p className="text-gray-600">Loading tutors...</p>
      </div>
  );
};

const TutorManagement: React.FC = () => {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [showTutorDetails, setShowTutorDetails] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const notification = useNotification();

  // Load tutors with pagination
  const loadTutors = async () => {
    try {
      setLoading(true);
      setListLoading(true);
      setError(null);

      console.log('🔍 Loading tutors from database...');

      // Build the base query with count
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
          tbl_user_profiles (
            tup_id,
            tup_first_name,
            tup_middle_name,
            tup_last_name,
            tup_username,
            tup_mobile,
            tup_gender,
            tup_education_level,
            tup_created_at
          ),
          tbl_tutors (
            tt_id,
            tt_bio,
            tt_specializations,
            tt_experience_years,
            tt_education,
            tt_hourly_rate,
            tt_rating,
            tt_total_reviews,
            tt_total_students,
            tt_is_verified,
            tt_is_active
          )
        `, { count: 'exact' })
          .eq('tu_user_type', 'tutor');

      // Apply filters if any
      if (searchTerm) {
        query = query.or(`tu_email.ilike.%${searchTerm}%,tbl_user_profiles.tup_first_name.ilike.%${searchTerm}%,tbl_user_profiles.tup_middle_name.ilike.%${searchTerm}%,tbl_user_profiles.tup_last_name.ilike.%${searchTerm}%,tbl_user_profiles.tup_username.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('tu_is_active', statusFilter === 'active');
      }

      if (verificationFilter !== 'all') {
        query = query.eq('tbl_tutors.tt_is_verified', verificationFilter === 'verified');
      }

      // Apply pagination and ordering
      query = query
          .order('tu_created_at', { ascending: false })
          .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      const { data: tutors, error, count } = await query;

      if (error) {
        console.error('❌ Failed to load tutors:', error);
        throw error;
      }

      console.log('✅ Tutors loaded:', tutors);
      setTutors(tutors || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('❌ Failed to load tutors:', error);
      setError('Failed to load tutors. Please check your database connection.');
      notification.showError('Load Failed', 'Failed to load tutor data from database');
    } finally {
      setLoading(false);
      setListLoading(false);
    }
  };

  // Reload when filters or pagination change
  useEffect(() => {
    loadTutors();
  }, [searchTerm, statusFilter, verificationFilter, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, verificationFilter]);

  // Helper functions to get the first (and typically only) item from arrays
  const getProfile = (tutor: Tutor) => {
    return tutor.tbl_user_profiles && tutor.tbl_user_profiles.length > 0
        ? tutor.tbl_user_profiles[0]
        : null;
  };

  const getTutorInfo = (tutor: Tutor) => {
    return tutor.tbl_tutors && tutor.tbl_tutors.length > 0
        ? tutor.tbl_tutors[0]
        : null;
  };

  const handleViewTutor = (tutor: Tutor) => {
    setSelectedTutor(tutor);
    setShowTutorDetails(true);
    setActiveTab('profile');
    setEditMode(false);
  };

  const handleToggleStatus = async (tutor: Tutor, currentStatus: boolean) => {
    try {
      const { error } = await supabase
          .from('tbl_users')
          .update({ tu_is_active: !currentStatus })
          .eq('tu_id', tutor.tu_id);

      if (error) throw error;

      const profile = getProfile(tutor);
      notification.showSuccess(
          'Status Updated',
          `Tutor ${profile?.tup_first_name || 'account'} has been ${!currentStatus ? 'activated' : 'deactivated'}`
      );

      await loadTutors();

      // If the updated tutor is currently selected, update it too
      if (selectedTutor && selectedTutor.tu_id === tutor.tu_id) {
        setSelectedTutor(prev => prev ? {...prev, tu_is_active: !currentStatus} : null);
      }
    } catch (error) {
      console.error('Failed to update tutor status:', error);
      notification.showError('Update Failed', 'Failed to update tutor status');
    }
  };

  const handleVerifyTutor = async (tutor: Tutor) => {
    try {
      const tutorInfo = getTutorInfo(tutor);
      if (!tutorInfo?.tt_id) {
        throw new Error('Tutor information not found');
      }

      const { error } = await supabase
          .from('tbl_tutors')
          .update({ tt_is_verified: true })
          .eq('tt_id', tutorInfo.tt_id);

      if (error) throw error;

      notification.showSuccess('Tutor Verified', 'Tutor has been verified successfully');
      await loadTutors();

      // If the verified tutor is currently selected, update it too
      if (selectedTutor && selectedTutor.tu_id === tutor.tu_id) {
        const updatedTutor = { ...selectedTutor };
        if (updatedTutor.tbl_tutors && updatedTutor.tbl_tutors.length > 0) {
          updatedTutor.tbl_tutors[0].tt_is_verified = true;
        }
        setSelectedTutor(updatedTutor);
      }
    } catch (error) {
      console.error('Failed to verify tutor:', error);
      notification.showError('Verification Failed', 'Failed to verify tutor');
    }
  };

  const refreshSelectedTutor = async (tutorId: string) => {
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
          tbl_user_profiles (
            tup_id,
            tup_first_name,
            tup_middle_name,
            tup_last_name,
            tup_username,
            tup_mobile,
            tup_gender,
            tup_education_level,
            tup_created_at
          ),
          tbl_tutors (
            tt_id,
            tt_bio,
            tt_specializations,
            tt_experience_years,
            tt_education,
            tt_hourly_rate,
            tt_rating,
            tt_total_reviews,
            tt_total_students,
            tt_is_verified,
            tt_is_active
          )
        `)
          .eq('tu_id', tutorId)
          .single();

      if (error) throw error;
      if (data) {
        setSelectedTutor(data as Tutor);
      }
    } catch (error) {
      console.error('Failed to refresh selected tutor:', error);
    }
  };

  const handleTutorUpdate = () => {
    // Refresh the tutors list
    loadTutors();

    // Also refresh the selected tutor if it exists
    if (selectedTutor) {
      refreshSelectedTutor(selectedTutor.tu_id);
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

  if (loading && tutors.length === 0) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <Loader />
        </div>
    );
  }

  if (error && tutors.length === 0) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center py-12">
            <GraduationCap className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Tutors</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
                onClick={() => loadTutors()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
    );
  }

  if (showTutorDetails && selectedTutor) {
    return (
        <TutorDetails
            tutor={selectedTutor}
            onBack={() => {
              setShowTutorDetails(false);
              setSelectedTutor(null);
              setEditMode(false);
            }}
            onUpdate={handleTutorUpdate}
            editMode={editMode}
            setEditMode={setEditMode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            getProfile={getProfile}
            getTutorInfo={getTutorInfo}
        />
    );
  }

  return (
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <GraduationCap className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Tutor Management</h3>
                <p className="text-gray-600">Manage tutor profiles and teaching activities</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Total: {totalCount} tutors
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-green-500"
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
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Search by name, email, or specialization..."
                />
              </div>
            </div>

            <div>
              <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tutors List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tutor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teaching Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
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
                  {tutors.map((tutor) => {
                    const profile = getProfile(tutor);
                    const tutorInfo = getTutorInfo(tutor);

                    return (
                        <tr key={tutor.tu_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {profile?.tup_first_name?.charAt(0) || 'T'}
                              </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  <a
                                      onClick={() => handleViewTutor(tutor)}
                                      className="hover:underline cursor-pointer hover:text-blue-600"
                                  >
                                    {profile?.tup_first_name || 'N/A'}
                                    {profile?.tup_middle_name ? ` ${profile.tup_middle_name} ` : ' '}
                                    {profile?.tup_last_name || ''}
                                  </a>
                                </div>
                                <div className="text-sm text-gray-500">
                                  @{profile?.tup_username || 'no-username'}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {tutorInfo?.tt_experience_years || 0} years exp.
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{tutor.tu_email}</div>
                            <div className="text-sm text-gray-500">{profile?.tup_mobile || 'Not provided'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              ${tutorInfo?.tt_hourly_rate || 0}/hour
                            </div>
                            <div className="text-sm text-gray-500">
                              {tutorInfo?.tt_total_students || 0} students
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tutorInfo?.tt_specializations?.slice(0, 2).map((spec, index) => (
                                  <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                              {spec}
                            </span>
                              ))}
                              {(tutorInfo?.tt_specializations?.length || 0) > 2 && (
                                  <span className="text-xs text-gray-500">
                              +{(tutorInfo?.tt_specializations?.length || 0) - 2} more
                            </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="text-sm font-medium">{tutorInfo?.tt_rating || 0}</span>
                              <span className="text-xs text-gray-500">
                            ({tutorInfo?.tt_total_reviews || 0})
                          </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            tutorInfo?.tt_is_verified
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {tutorInfo?.tt_is_verified ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </>
                          ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </>
                          )}
                        </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            tutor.tu_is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                        }`}>
                          {tutor.tu_is_active ? (
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
                              {new Date(tutor.tu_created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                  onClick={() => handleViewTutor(tutor)}
                                  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                                  title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {!tutorInfo?.tt_is_verified && (
                                  <button
                                      onClick={() => handleVerifyTutor(tutor)}
                                      className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                                      title="Verify Tutor"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                              )}
                              <button
                                  onClick={() => handleToggleStatus(tutor, tutor.tu_is_active)}
                                  className={`p-1 rounded ${
                                      tutor.tu_is_active
                                          ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                  }`}
                                  title={tutor.tu_is_active ? 'Deactivate' : 'Activate'}
                              >
                                {tutor.tu_is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
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
                <span className="font-medium">{totalCount}</span> tutors
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
                                ? 'bg-green-600 text-white'
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

        {tutors.length === 0 && !listLoading && (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tutors found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || verificationFilter !== 'all'
                    ? 'Try adjusting your search criteria'
                    : 'No tutors have registered yet'
                }
              </p>
            </div>
        )}
      </div>
  );
};

// Tutor Details Component
const TutorDetails: React.FC<{
  tutor: Tutor;
  onBack: () => void;
  onUpdate: () => void;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  getProfile: (tutor: Tutor) => any;
  getTutorInfo: (tutor: Tutor) => any;
}> = ({ tutor, onBack, onUpdate, editMode, setEditMode, activeTab, setActiveTab, getProfile, getTutorInfo }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTutor, setCurrentTutor] = useState<Tutor>(tutor);
  const [newSpecialization, setNewSpecialization] = useState('');

  const profile = getProfile(currentTutor);
  const tutorInfo = getTutorInfo(currentTutor);

  const [editData, setEditData] = useState({
    first_name: profile?.tup_first_name || '',
    last_name: profile?.tup_last_name || '',
    middle_name: profile?.tup_middle_name || '',
    username: profile?.tup_username || '',
    mobile: profile?.tup_mobile || '',
    gender: profile?.tup_gender || '',
    bio: tutorInfo?.tt_bio || '',
    hourly_rate: tutorInfo?.tt_hourly_rate || 0,
    experience_years: tutorInfo?.tt_experience_years || 0,
    education: tutorInfo?.tt_education || '',
    specializations: tutorInfo?.tt_specializations || [],
    email: tutor.tu_email,
    is_active: tutor.tu_is_active,
    is_verified: tutorInfo?.tt_is_verified || false
  });

  const notification = useNotification();

  useEffect(() => {
    if (activeTab === 'students') {
      loadAssignments();
    }
  }, [activeTab]);

  useEffect(() => {
    setCurrentTutor(tutor);
    const updatedProfile = getProfile(tutor);
    const updatedTutorInfo = getTutorInfo(tutor);
    setEditData({
      first_name: updatedProfile?.tup_first_name || '',
      last_name: updatedProfile?.tup_last_name || '',
      middle_name: updatedProfile?.tup_middle_name || '',
      username: updatedProfile?.tup_username || '',
      mobile: updatedProfile?.tup_mobile || '',
      gender: updatedProfile?.tup_gender || '',
      bio: updatedTutorInfo?.tt_bio || '',
      hourly_rate: updatedTutorInfo?.tt_hourly_rate || 0,
      experience_years: updatedTutorInfo?.tt_experience_years || 0,
      education: updatedTutorInfo?.tt_education || '',
      specializations: updatedTutorInfo?.tt_specializations || [],
      email: tutor.tu_email,
      is_active: tutor.tu_is_active,
      is_verified: updatedTutorInfo?.tt_is_verified || false
    });
  }, [tutor]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      if (!tutorInfo?.tt_id) {
        console.warn('No tutor ID found, skipping assignment load');
        setAssignments([]);
        return;
      }

      // First, get the assignments with course information
      const { data: assignments, error } = await supabase
          .from('tbl_tutor_assignments')
          .select(`
          tta_id,
          tta_assigned_at,
          tta_status,
          tta_learner_id,
          tta_course_id,
          tbl_courses (
            tc_title
          )
        `)
          .eq('tta_tutor_id', tutorInfo.tt_id)
          .order('tta_assigned_at', { ascending: false });

      if (error) throw error;

      // Then, get user profiles for the learners
      const learnerIds = assignments?.map(a => a.tta_learner_id).filter(Boolean) || [];

      let userProfiles = [];
      if (learnerIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
            .from('tbl_user_profiles')
            .select('tup_user_id, tup_first_name, tup_last_name')
            .in('tup_user_id', learnerIds);

        if (!profileError) {
          userProfiles = profiles || [];
        }
      }

      // Combine the data
      const combinedAssignments = (assignments || []).map(assignment => {
        const userProfile = userProfiles.find(profile => profile.tup_user_id === assignment.tta_learner_id);

        return {
          ...assignment,
          tbl_users: {
            tbl_user_profiles: userProfile ? [userProfile] : []
          }
        };
      });

      setAssignments(combinedAssignments);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpecialization = () => {
    if (newSpecialization.trim() && !editData.specializations.includes(newSpecialization.trim())) {
      setEditData(prev => ({
        ...prev,
        specializations: [...prev.specializations, newSpecialization.trim()]
      }));
      setNewSpecialization('');
    }
  };

  const handleRemoveSpecialization = (index: number) => {
    setEditData(prev => ({
      ...prev,
      specializations: prev.specializations.filter((_, i) => i !== index)
    }));
  };

  const handleSaveEdit = async () => {
    try {
      // Update tbl_users table
      const { error: userError } = await supabase
          .from('tbl_users')
          .update({
            tu_email: editData.email,
            tu_is_active: editData.is_active,
            tu_updated_at: new Date().toISOString()
          })
          .eq('tu_id', currentTutor.tu_id);

      if (userError) throw userError;

      // Update tbl_user_profiles table if profile exists
      if (profile) {
        const { error: profileError } = await supabase
            .from('tbl_user_profiles')
            .update({
              tup_first_name: editData.first_name,
              tup_middle_name: editData.middle_name,
              tup_last_name: editData.last_name,
              tup_username: editData.username,
              tup_mobile: editData.mobile || null,
              tup_gender: editData.gender || null,
              tup_updated_at: new Date().toISOString()
            })
            .eq('tup_user_id', currentTutor.tu_id);

        if (profileError) throw profileError;
      } else {
        // Create profile if it doesn't exist
        const { error: profileCreateError } = await supabase
            .from('tbl_user_profiles')
            .insert({
              tup_user_id: currentTutor.tu_id,
              tup_first_name: editData.first_name,
              tup_middle_name: editData.middle_name,
              tup_last_name: editData.last_name,
              tup_username: editData.username,
              tup_mobile: editData.mobile || null,
              tup_gender: editData.gender || null
            });

        if (profileCreateError) throw profileCreateError;
      }

      // Update tbl_tutors table if tutor info exists
      if (tutorInfo) {
        const { error: tutorError } = await supabase
            .from('tbl_tutors')
            .update({
              tt_bio: editData.bio,
              tt_hourly_rate: editData.hourly_rate,
              tt_education: editData.education,
              tt_experience_years: editData.experience_years,
              tt_specializations: editData.specializations,
              tt_is_verified: editData.is_verified
            })
            .eq('tt_user_id', currentTutor.tu_id);

        if (tutorError) throw tutorError;
      } else {
        // Create tutor record if it doesn't exist
        const { error: tutorCreateError } = await supabase
            .from('tbl_tutors')
            .insert({
              tt_user_id: currentTutor.tu_id,
              tt_bio: editData.bio,
              tt_hourly_rate: editData.hourly_rate,
              tt_education: editData.education,
              tt_experience_years: editData.experience_years,
              tt_specializations: editData.specializations,
              tt_is_verified: editData.is_verified,
              tt_rating: 0,
              tt_total_reviews: 0,
              tt_total_students: 0,
              tt_is_active: true
            });

        if (tutorCreateError) throw tutorCreateError;
      }

      // Fetch the updated tutor data from database
      const { data: updatedTutor, error: fetchError } = await supabase
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
            tup_middle_name,
            tup_last_name,
            tup_username,
            tup_mobile,
            tup_gender,
            tup_education_level,
            tup_created_at,
            tup_updated_at
          ),
          tbl_tutors (
            tt_id,
            tt_bio,
            tt_specializations,
            tt_experience_years,
            tt_education,
            tt_hourly_rate,
            tt_rating,
            tt_total_reviews,
            tt_total_students,
            tt_is_verified,
            tt_is_active
          )
        `)
          .eq('tu_id', currentTutor.tu_id)
          .single();

      if (fetchError) throw fetchError;

      // Update local state with fresh data from database
      setCurrentTutor(updatedTutor as Tutor);

      const updatedProfile = getProfile(updatedTutor as Tutor);
      const updatedTutorInfo = getTutorInfo(updatedTutor as Tutor);
      setEditData({
        first_name: updatedProfile?.tup_first_name || '',
        last_name: updatedProfile?.tup_last_name || '',
        middle_name: updatedProfile?.tup_middle_name || '',
        username: updatedProfile?.tup_username || '',
        mobile: updatedProfile?.tup_mobile || '',
        gender: updatedProfile?.tup_gender || '',
        bio: updatedTutorInfo?.tt_bio || '',
        hourly_rate: updatedTutorInfo?.tt_hourly_rate || 0,
        experience_years: updatedTutorInfo?.tt_experience_years || 0,
        education: updatedTutorInfo?.tt_education || '',
        specializations: updatedTutorInfo?.tt_specializations || [],
        email: updatedTutor.tu_email,
        is_active: updatedTutor.tu_is_active,
        is_verified: updatedTutorInfo?.tt_is_verified || false
      });

      // Notify parent component to update its state
      onUpdate();

      setEditMode(false);
      notification.showSuccess('Tutor Updated', 'Tutor information has been updated successfully');
    } catch (error: any) {
      console.error('Failed to update tutor:', error);
      notification.showError('Update Failed', `Failed to update tutor information: ${error.message}`);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Details', icon: User },
    { id: 'students', label: 'Assigned Students', icon: Users },
    { id: 'performance', label: 'Teaching Performance', icon: TrendingUp }
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
                <span>Back to Tutors</span>
              </button>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {profile?.tup_first_name || 'N/A'}
                  {profile?.tup_middle_name ? ` ${profile.tup_middle_name} ` : ' '}
                  {profile?.tup_last_name || ''}
                </h3>
                <p className="text-gray-600">Tutor Details & Management</p>
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
                          <span>Edit Tutor</span>
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
                              ? 'border-green-500 text-green-600'
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
                                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                          ) : (
                              <p className="text-gray-900 mt-1">{profile?.tup_last_name || 'Not provided'}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Bio</label>
                        {editMode ? (
                            <textarea
                                value={editData.bio}
                                onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                rows={4}
                            />
                        ) : (
                            <p className="text-gray-900 mt-1">{tutorInfo?.tt_bio || 'No bio provided'}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Hourly Rate</label>
                        {editMode ? (
                            <div className="relative mt-1">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                              </div>
                              <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editData.hourly_rate}
                                  onChange={(e) => setEditData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                        ) : (
                            <p className="text-gray-900 mt-1">${tutorInfo?.tt_hourly_rate || 0}/hour</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                      <GraduationCap className="h-5 w-5 mr-2" />
                      Professional Information
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Experience (Years)</label>
                        {editMode ? (
                            <input
                                type="number"
                                min="0"
                                max="50"
                                value={editData.experience_years}
                                onChange={(e) => setEditData(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        ) : (
                            <p className="text-gray-900 mt-1">{tutorInfo?.tt_experience_years || 0} years</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Education</label>
                        {editMode ? (
                            <textarea
                                value={editData.education}
                                onChange={(e) => setEditData(prev => ({ ...prev, education: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                rows={3}
                            />
                        ) : (
                            <p className="text-gray-900 mt-1">{tutorInfo?.tt_education || 'Not provided'}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Specializations</label>
                        {editMode ? (
                            <div className="mt-1">
                              <div className="flex space-x-2 mb-2">
                                <input
                                    type="text"
                                    value={newSpecialization}
                                    onChange={(e) => setNewSpecialization(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Add a specialization..."
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddSpecialization();
                                      }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSpecialization}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  Add
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {editData.specializations.map((spec, index) => (
                                    <div key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
                                      {spec}
                                      <button
                                          type="button"
                                          onClick={() => handleRemoveSpecialization(index)}
                                          className="ml-2 text-green-600 hover:text-green-800"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                ))}
                              </div>
                            </div>
                        ) : (
                            <div className="mt-1 flex flex-wrap gap-2">
                              {tutorInfo?.tt_specializations?.map((spec, index) => (
                                  <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                            {spec}
                          </span>
                              )) || <span className="text-gray-500 text-sm">No specializations listed</span>}
                            </div>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Verification Status</label>
                        {editMode ? (
                            <label className="relative inline-flex items-center cursor-pointer mt-1">
                              <input
                                  type="checkbox"
                                  checked={editData.is_verified}
                                  onChange={(e) => setEditData(prev => ({ ...prev, is_verified: e.target.checked }))}
                                  className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                              <span className="ml-3 text-sm text-gray-700">Verified Tutor</span>
                            </label>
                        ) : (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                                tutorInfo?.tt_is_verified
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}>
                        {tutorInfo?.tt_is_verified ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verified
                            </>
                        ) : (
                            <>
                              <Clock className="h-4 w-4 mr-1" />
                              Pending Verification
                            </>
                        )}
                      </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {activeTab === 'students' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Assigned Students
                  </h4>
                  <div className="text-sm text-gray-500">
                    Total: {assignments.length} assignments
                  </div>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading assignments...</p>
                    </div>
                ) : assignments.length > 0 ? (
                    <div className="space-y-4">
                      {assignments.map((assignment) => {
                        // Safe access to the student profile data
                        const studentProfiles = assignment.tbl_users?.tbl_user_profiles || [];
                        const studentProfile = studentProfiles.length > 0 ? studentProfiles[0] : null;

                        return (
                            <div key={assignment.tta_id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <div className="bg-green-100 p-2 rounded-lg">
                                      <Users className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div>
                                      <h5 className="font-medium text-gray-900">
                                        {studentProfile?.tup_first_name || 'N/A'} {studentProfile?.tup_last_name || ''}
                                      </h5>
                                      <p className="text-sm text-gray-500">
                                        Course: {assignment.tbl_courses?.tc_title || 'N/A'}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        Assigned: {new Date(assignment.tta_assigned_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              assignment.tta_status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : assignment.tta_status === 'completed'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                          }`}>
                            {assignment.tta_status?.charAt(0).toUpperCase() + assignment.tta_status?.slice(1) || 'Unknown'}
                          </span>
                                </div>
                              </div>
                            </div>
                        );
                      })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No students assigned</h3>
                      <p className="text-gray-600">This tutor hasn't been assigned any students yet.</p>
                    </div>
                )}
              </div>
          )}

          {activeTab === 'performance' && (
              <div>
                <h4 className="font-medium text-gray-900 mb-6 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Teaching Performance
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-green-50 p-6 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{tutorInfo?.tt_total_students || 0}</div>
                    <div className="text-sm text-green-600">Total Students</div>
                  </div>
                  <div className="bg-yellow-50 p-6 rounded-lg text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      <div className="text-2xl font-bold text-yellow-600">{tutorInfo?.tt_rating || 0}</div>
                    </div>
                    <div className="text-sm text-yellow-600">Average Rating</div>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{tutorInfo?.tt_total_reviews || 0}</div>
                    <div className="text-sm text-blue-600">Total Reviews</div>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">${tutorInfo?.tt_hourly_rate || 0}</div>
                    <div className="text-sm text-purple-600">Hourly Rate</div>
                  </div>
                </div>

                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <p>Detailed teaching analytics will be displayed here</p>
                </div>
              </div>
          )}
        </div>
      </div>
  );
};

export default TutorManagement;