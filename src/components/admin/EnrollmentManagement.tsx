  import React, { useState, useEffect } from 'react';
  import { supabase } from '../../lib/supabase';
  import { useAdminAuth } from '../../contexts/AdminAuthContext';
  import { Users, BookOpen, CheckCircle, XCircle, UserCheck, AlertCircle } from 'lucide-react';

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
      tutor: {
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
  }

  export default function EnrollmentManagement() {
    const { admin } = useAdminAuth();
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [tutors, setTutors] = useState<Tutor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEnrollment, setSelectedEnrollment] = useState<string | null>(null);
    const [selectedTutor, setSelectedTutor] = useState<string>('');
    const [assignmentNotes, setAssignmentNotes] = useState('');
    const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('unassigned');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);

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

    useEffect(() => {
      if (admin || sessionStorage.getItem('admin_session_token')) {
        fetchEnrollments();
        fetchTutors();
      }
    }, [filter, admin]);

    const fetchEnrollments = async () => {
      try {
        setLoading(true);
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
          `)
            .order('tce_enrollment_date', { ascending: false });

        if (filter === 'unassigned') {
          query = query.eq('tce_tutor_assigned', false);
        } else if (filter === 'assigned') {
          query = query.eq('tce_tutor_assigned', true);
        }

        const { data, error } = await query;

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
                tutor:tbl_users!tta_tutor_id (
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
        }
      } catch (error: any) {
        console.error('Error fetching enrollments:', error);
        setErrorMessage(error.message);
      } finally {
        setLoading(false);
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
        const adminId = getAdminId();
        const enrollment = enrollments.find(e => e.tce_id === enrollmentId);

        if (!enrollment) {
          throw new Error('Enrollment not found');
        }

        console.log('🔑 Admin ID:', adminId);
        console.log('📝 Assignment details:', {
          tutor: selectedTutor,
          learner: enrollment.tce_user_id,
          course: enrollment.tce_course_id,
          enrollment: enrollmentId
        });

        // OPTION A: Use the full function with admin tracking
        // (Use this if you added the tta_assigned_by_admin column)
        const { data: result, error: rpcError } = await supabase.rpc('assign_tutor_to_learner', {
          p_tutor_id: selectedTutor,
          p_learner_id: enrollment.tce_user_id,
          p_course_id: enrollment.tce_course_id,
          p_assigned_by_admin: adminId,
          p_notes: assignmentNotes || null
        });

        // OPTION B: Use the simple function (no admin tracking)
        // Uncomment this and comment out Option A if you only made tta_assigned_by nullable
        /*
        const { data: result, error: rpcError } = await supabase.rpc('assign_tutor_to_learner_simple', {
          p_tutor_id: selectedTutor,
          p_learner_id: enrollment.tce_user_id,
          p_course_id: enrollment.tce_course_id,
          p_notes: assignmentNotes || null
        });
        */

        if (rpcError) {
          console.error('❌ RPC error:', rpcError);
          throw new Error(`Failed to assign tutor: ${rpcError.message}`);
        }

        // Check result from function
        if (result && typeof result === 'object') {
            if ('success' in result && !result.success) {
            throw new Error(result.error || 'Failed to assign tutor');
          }
          console.log('✅ Function returned:', result);
        }

        console.log('✅ Assignment successful!');
        setSuccessMessage('Tutor assigned successfully!');
        setSelectedEnrollment(null);
        setSelectedTutor('');
        setAssignmentNotes('');

        // Refresh enrollments list
        await fetchEnrollments();

        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error: any) {
        console.error('❌ Error assigning tutor:', error);

        // Provide more helpful error messages
        let errorMsg = error.message || 'Failed to assign tutor. Please try again.';

        if (errorMsg.includes('foreign key constraint')) {
          errorMsg = 'Database configuration issue: Please run the fix-foreign-key-constraint.sql script first.';
        } else if (errorMsg.includes('function') && errorMsg.includes('does not exist')) {
          errorMsg = 'Database function missing: Please run the assign-tutor-function-updated.sql script first.';
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

    if (loading) {
      return (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

            <div className="mt-4 sm:mt-0 flex space-x-2">
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
                        {!enrollment.tce_tutor_assigned && (
                            <button
                                onClick={() => setSelectedEnrollment(enrollment.tce_id)}
                                className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Assign Tutor
                            </button>
                        )}
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>

            {enrollments.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No enrollments found</h3>
                  <p className="text-gray-600">
                    {filter !== 'all' ? 'Try adjusting your filter' : 'No enrollments in the system'}
                  </p>
                </div>
            )}
          </div>

          {selectedEnrollment && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Assign Tutor to Enrollment</h3>
                    <p className="text-sm text-gray-600 mt-1">Select a tutor to assign to this enrollment</p>
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
                        {tutors.map((tutor) => (
                            <option key={tutor.tu_id} value={tutor.tu_id}>
                              {getTutorName(tutor)}
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