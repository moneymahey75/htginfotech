import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  Users,
  BookOpen,
  CheckCircle,
  XCircle,
  UserCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal
} from 'lucide-react';

interface Enrollment {
  tce_id: string;
  tce_user_id: string;
  tce_course_id: string;
  tce_enrollment_date: string;
  tce_tutor_assigned: boolean;
  tce_tutor_assigned_at: string | null;
  tce_payment_status: string;
  learner: {
    tu_email: string;
    tbl_user_profiles: {
      tup_first_name: string;
      tup_last_name: string;
    }[];
  };
  course: {
    tc_title: string;
    tc_category_id: string | null;
    tbl_course_categories?: {
      tcc_name: string;
    } | null;
  };
  tutor_assignment?: {
    tta_id: string;
    tta_tutor_id: string;
    tutor: {
      tu_id: string;
      tu_email: string;
      tbl_user_profiles: {
        tup_first_name: string;
        tup_last_name: string;
      }[];
    };
  };
}

interface Tutor {
  tu_id: string;
  tu_email: string;
  tbl_user_profiles: {
    tup_first_name: string;
    tup_last_name: string;
  }[];
  tbl_tutors: {
    tt_specializations: string[];
  }[];
}

// Skeleton Loader for Table Rows
const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
      <>
        {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="animate-pulse">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="h-5 w-5 bg-gray-200 rounded mr-2"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div className="h-5 w-5 bg-gray-200 rounded mr-2"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-40 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-8 w-24 bg-gray-200 rounded"></div>
              </td>
            </tr>
        ))}
      </>
  );
};

export default function EnrollmentManagement() {
  const { admin } = useAdminAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null);
  const [selectedTutor, setSelectedTutor] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('unassigned');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const getAdminId = () => {
    if (admin) {
      return admin.tau_id || admin.id || admin.admin_id || admin.userId || null;
    }

    const adminSession = sessionStorage.getItem('admin_session_token');
    if (adminSession && adminSession !== 'null') {
      try {
        const sessionData = JSON.parse(adminSession);
        return sessionData.tau_id || sessionData.id || sessionData.admin_id || null;
      } catch (e) {
        console.error('Failed to parse admin session:', e);
      }
    }

    return null;
  };

  // Reload when filters or pagination change
  useEffect(() => {
    if (admin || sessionStorage.getItem('admin_session_token')) {
      fetchEnrollments();
      fetchTutors();
    }
  }, [filter, currentPage, itemsPerPage, admin]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setListLoading(true);

      // Build the base query with count
      let query = supabase
          .from('tbl_course_enrollments')
          .select(`
          tce_id,
          tce_user_id,
          tce_course_id,
          tce_enrollment_date,
          tce_tutor_assigned,
          tce_tutor_assigned_at,
          tce_payment_status,
          learner:tbl_users!tbl_course_enrollments_tce_user_id_fkey (
            tu_email,
            tbl_user_profiles (
              tup_first_name,
              tup_last_name
            )
          ),
          course:tbl_courses!tbl_course_enrollments_tce_course_id_fkey (
            tc_title,
            tc_category_id,
            tbl_course_categories (
              tcc_name
            )
          )
        `, { count: 'exact' })
          .order('tce_enrollment_date', { ascending: false });

      if (filter === 'unassigned') {
        query = query.eq('tce_tutor_assigned', false);
      } else if (filter === 'assigned') {
        query = query.eq('tce_tutor_assigned', true);
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      if (data) {
        const enrollmentIds = data
            .filter((e: any) => e.tce_tutor_assigned)
            .map((e: any) => e.tce_id);

        if (enrollmentIds.length > 0) {
          const { data: assignments } = await supabase
              .from('tbl_tutor_assignments')
              .select(`
              tta_id,
              tta_enrollment_id,
              tta_tutor_id,
              tutor:tbl_users!tta_tutor_id (
                tu_id,
                tu_email,
                tbl_user_profiles (
                  tup_first_name,
                  tup_last_name
                )
              )
            `)
              .in('tta_enrollment_id', enrollmentIds)
              .eq('tta_is_active', true);

          const enrichedData = data.map((enrollment: any) => {
            const assignment = assignments?.find(
                (a: any) => a.tta_enrollment_id === enrollment.tce_id
            );
            return {
              ...enrollment,
              tutor_assignment: assignment || null,
            };
          });

          setEnrollments(enrichedData);
        } else {
          setEnrollments(data);
        }

        setTotalCount(count || 0);
      }
    } catch (error: any) {
      console.error('Error fetching enrollments:', error);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
      setListLoading(false);
    }
  };

  const fetchTutors = async () => {
    try {
      const { data, error } = await supabase
          .from('tbl_users')
          .select(`
          tu_id,
          tu_email,
          tbl_user_profiles (
            tup_first_name,
            tup_last_name
          ),
          tbl_tutors (
            tt_specializations
          )
        `)
          .eq('tu_user_type', 'tutor')
          .eq('tu_is_active', true);

      if (error) throw error;
      setTutors(data || []);
    } catch (error: any) {
      console.error('Error fetching tutors:', error);
      setErrorMessage(`Failed to load tutors: ${error.message}`);
    }
  };

  const handleAssignTutor = async (enrollmentId: string) => {
    if (!selectedTutor) {
      setErrorMessage('Please select a tutor');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    setIsAssigning(true);
    setErrorMessage('');

    try {
      const enrollment = enrollments.find(e => e.tce_id === enrollmentId);

      if (!enrollment) {
        throw new Error('Enrollment not found');
      }

      const isChangingTutor = enrollment.tce_tutor_assigned && enrollment.tutor_assignment;

      if (isChangingTutor) {
        const { error: deactivateError } = await supabase
            .from('tbl_tutor_assignments')
            .update({
              tta_is_active: false,
              tta_assigned_at: new Date().toISOString()
            })
            .eq('tta_id', enrollment.tutor_assignment.tta_id);

        if (deactivateError) throw deactivateError;
      }

      const adminId = getAdminId();
      console.log('Admin ID for assignment:', adminId);
      console.log('Selected tutor ID:', selectedTutor);
      console.log('Enrollment ID:', enrollmentId);

      const { error: insertError } = await supabase
          .from('tbl_tutor_assignments')
          .insert({
            tta_tutor_id: selectedTutor,
            tta_enrollment_id: enrollmentId,
            tta_assigned_by: null,
            tta_notes: assignmentNotes || null,
            tta_is_active: true
          });

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }

      const { error: enrollmentError } = await supabase
          .from('tbl_course_enrollments')
          .update({
            tce_tutor_assigned: true,
            tce_tutor_assigned_at: new Date().toISOString()
          })
          .eq('tce_id', enrollmentId);

      if (enrollmentError) throw enrollmentError;

      setSuccessMessage(isChangingTutor ? 'Tutor changed successfully!' : 'Tutor assigned successfully!');
      setSelectedEnrollment(null);
      setSelectedTutor('');
      setAssignmentNotes('');

      await fetchEnrollments();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error assigning tutor:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      let errorMsg = error.message || 'Failed to assign tutor. Please try again.';

      if (errorMsg.includes('foreign key constraint') || errorMsg.includes('violates foreign key')) {
        errorMsg = `Database error: ${error.message}. Please ensure the selected tutor exists in the system.`;
      }

      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(''), 10000);
    } finally {
      setIsAssigning(false);
    }
  };

  const getLearnerName = (learner: Enrollment['learner']) => {
    const profile = learner.tbl_user_profiles?.[0];
    if (profile) {
      return `${profile.tup_first_name} ${profile.tup_last_name}`;
    }
    return learner.tu_email;
  };

  const getTutorName = (tutor: Tutor) => {
    const profile = tutor.tbl_user_profiles?.[0];
    if (profile) {
      return `${profile.tup_first_name} ${profile.tup_last_name}`;
    }
    return tutor.tu_email;
  };

  const getTutorNameWithSubjects = (tutor: Tutor) => {
    const name = getTutorName(tutor);
    const tutorProfile = tutor.tbl_tutors?.[0];
    const specializations = tutorProfile?.tt_specializations || [];

    if (specializations.length > 0) {
      return `${name} – ${specializations.join(', ')}`;
    }
    return name;
  };

  const handleRemoveTutor = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to remove the assigned tutor? This action cannot be undone.')) {
      return;
    }

    setIsAssigning(true);
    setErrorMessage('');

    try {
      const enrollment = enrollments.find(e => e.tce_id === enrollmentId);
      if (!enrollment || !enrollment.tutor_assignment) {
        throw new Error('Assignment not found');
      }

      const { error: deactivateError } = await supabase
          .from('tbl_tutor_assignments')
          .update({
            tta_is_active: false,
            tta_assigned_at: new Date().toISOString()
          })
          .eq('tta_id', enrollment.tutor_assignment.tta_id);

      if (deactivateError) throw deactivateError;

      const { error: enrollmentError } = await supabase
          .from('tbl_course_enrollments')
          .update({
            tce_tutor_assigned: false,
            tce_tutor_assigned_at: null
          })
          .eq('tce_id', enrollmentId);

      if (enrollmentError) throw enrollmentError;

      setSuccessMessage('Tutor removed successfully!');
      await fetchEnrollments();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error removing tutor:', error);
      setErrorMessage(`Failed to remove tutor: ${error.message}`);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleChangeTutor = (enrollmentId: string) => {
    setSelectedEnrollment(enrollmentId);
    const enrollment = enrollments.find(e => e.tce_id === enrollmentId);
    if (enrollment?.tutor_assignment) {
      setSelectedTutor(enrollment.tutor_assignment.tta_tutor_id);
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

  if (loading && enrollments.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading enrollments...</p>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Enrollment Management</h2>
            <p className="text-gray-600 mt-1">Assign tutors to course enrollments</p>
          </div>

          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex space-x-2">
              <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                All
              </button>
              <button
                  onClick={() => setFilter('unassigned')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === 'unassigned'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Unassigned
              </button>
              <button
                  onClick={() => setFilter('assigned')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === 'assigned'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Assigned
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Show:</label>
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
              <span className="text-sm text-gray-600 whitespace-nowrap">per page</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
            <span className="font-medium">{totalCount}</span> enrollments
          </div>
        </div>

        {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              {successMessage}
            </div>
        )}

        {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold mb-1">Error:</p>
                  <pre className="text-sm whitespace-pre-wrap font-sans">{errorMessage}</pre>
                </div>
              </div>
            </div>
        )}

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Learner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrolled Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Tutor
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
                    {enrollments.map((enrollment) => (
                        <tr key={enrollment.tce_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Users className="h-5 w-5 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {getLearnerName(enrollment.learner)}
                                </div>
                                <div className="text-sm text-gray-500">{enrollment.learner.tu_email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <BookOpen className="h-5 w-5 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {enrollment.course.tc_title}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {enrollment.course.tbl_course_categories?.tcc_name || 'Uncategorized'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(enrollment.tce_enrollment_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {enrollment.tce_tutor_assigned ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Assigned
                          </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <XCircle className="h-4 w-4 mr-1" />
                            Pending
                          </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {enrollment.tutor_assignment ? (
                                <div className="flex items-center">
                                  <UserCheck className="h-4 w-4 text-green-600 mr-1" />
                                  {getTutorName(enrollment.tutor_assignment.tutor)}
                                </div>
                            ) : (
                                'Not assigned'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {!enrollment.tce_tutor_assigned ? (
                                <button
                                    onClick={() => setSelectedEnrollment(enrollment.tce_id)}
                                    className="text-blue-600 hover:text-blue-900 font-medium"
                                >
                                  Assign Tutor
                                </button>
                            ) : (
                                <div className="flex space-x-2">
                                  <button
                                      onClick={() => handleChangeTutor(enrollment.tce_id)}
                                      className="text-blue-600 hover:text-blue-900 font-medium"
                                      disabled={isAssigning}
                                  >
                                    Change
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button
                                      onClick={() => handleRemoveTutor(enrollment.tce_id)}
                                      className="text-red-600 hover:text-red-900 font-medium"
                                      disabled={isAssigning}
                                  >
                                    Remove
                                  </button>
                                </div>
                            )}
                          </td>
                        </tr>
                    ))}
                  </>
              )}
              </tbody>
            </table>
          </div>

          {enrollments.length === 0 && !listLoading && (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No enrollments found</h3>
                <p className="text-gray-600">
                  {filter !== 'all' ? 'Try adjusting your filter' : 'No enrollments in the system'}
                </p>
              </div>
          )}

          {/* Enhanced Pagination Controls */}
          {totalCount > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                  <span className="font-medium">{totalCount}</span> enrollments
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
        </div>

        {selectedEnrollment && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {enrollments.find(e => e.tce_id === selectedEnrollment)?.tce_tutor_assigned
                        ? 'Change Tutor Assignment'
                        : 'Assign Tutor to Enrollment'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {enrollments.find(e => e.tce_id === selectedEnrollment)?.tce_tutor_assigned
                        ? 'Select a new tutor for this enrollment'
                        : 'Select a tutor to assign to this enrollment'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Tutor *
                    </label>
                    <select
                        value={selectedTutor}
                        onChange={(e) => setSelectedTutor(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isAssigning}
                    >
                      <option value="">Choose a tutor...</option>
                      {tutors.filter(tutor => tutor.tbl_tutors && tutor.tbl_tutors.length > 0).map((tutor) => (
                          <option key={tutor.tu_id} value={tutor.tu_id}>
                            {getTutorNameWithSubjects(tutor)}
                          </option>
                      ))}
                      {tutors.filter(tutor => !tutor.tbl_tutors || tutor.tbl_tutors.length === 0).length > 0 && (
                          <option disabled>──────────</option>
                      )}
                      {tutors.filter(tutor => !tutor.tbl_tutors || tutor.tbl_tutors.length === 0).map((tutor) => (
                          <option key={tutor.tu_id} value={tutor.tu_id}>
                            {getTutorName(tutor)} (Profile Incomplete)
                          </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                        value={assignmentNotes}
                        onChange={(e) => setAssignmentNotes(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Add any notes about this assignment..."
                        disabled={isAssigning}
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                        onClick={() => handleAssignTutor(selectedEnrollment)}
                        disabled={isAssigning || !selectedTutor}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                    >
                      {isAssigning ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Assigning...</span>
                          </>
                      ) : (
                          <span>Assign Tutor</span>
                      )}
                    </button>
                    <button
                        onClick={() => {
                          setSelectedEnrollment(null);
                          setSelectedTutor('');
                          setAssignmentNotes('');
                        }}
                        disabled={isAssigning}
                        className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}