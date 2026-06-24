import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  BookOpen,
  Users,
  Star,
  Award
} from 'lucide-react';

interface AssignedStudent {
  enrollmentId: string;
  learnerId: string;
  studentName: string;
  email: string;
  courseId: string;
  courseTitle: string;
  progress: number;
  enrolledAt: string | null;
  completedAt: string | null;
}

interface AssignedCourse {
  courseId: string;
  courseTitle: string;
  learnerCount: number;
  enrollmentCount: number;
  averageProgress: number;
  latestEnrollmentAt: string | null;
}

const TutorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [assignedStudents, setAssignedStudents] = useState<AssignedStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadAssignedStudents();
    }
  }, [user?.id]);

  const loadAssignedStudents = async () => {
    if (!user?.id) return;

    try {
      setStudentsLoading(true);
      setStudentsError('');

      const { data: rpcStudents, error: rpcError } = await supabase.rpc('get_my_assigned_students');

      if (!rpcError && rpcStudents) {
        const students = rpcStudents
          .map((student: any) => {
            const fullName = [student.learner_first_name, student.learner_last_name]
              .filter(Boolean)
              .join(' ')
              .trim();

            return {
              enrollmentId: student.enrollment_id,
              learnerId: student.learner_id,
              studentName: fullName || student.learner_email || 'Unknown Student',
              email: student.learner_email || '',
              courseId: student.course_id,
              courseTitle: student.course_title || 'Course',
              progress: Number(student.progress_percentage || 0),
              enrolledAt: student.enrollment_date || null,
              completedAt: student.completed_at || null
            };
          })
          .sort((a: AssignedStudent, b: AssignedStudent) => (
            new Date(b.enrolledAt || 0).getTime() - new Date(a.enrolledAt || 0).getTime()
          ));

        setAssignedStudents(students);
        return;
      }

      if (rpcError) {
        console.warn('Assigned students RPC unavailable, falling back to direct queries:', rpcError.message);
      }

      const { data: assignments, error: assignmentsError } = await supabase
        .from('tbl_tutor_assignments')
        .select('tta_id, tta_assigned_at, tta_learner_id, tta_course_id, tta_enrollment_id, tta_status')
        .eq('tta_tutor_id', user.id)
        .eq('tta_is_active', true);

      if (assignmentsError) throw assignmentsError;

      const activeAssignments = (assignments || []).filter((assignment: any) => (
        !assignment.tta_status || assignment.tta_status === 'active'
      ));

      const directEnrollmentIds = activeAssignments
        .map((assignment: any) => assignment.tta_enrollment_id)
        .filter(Boolean);
      const courseLevelCourseIds = activeAssignments
        .filter((assignment: any) => assignment.tta_course_id && !assignment.tta_learner_id && !assignment.tta_enrollment_id)
        .map((assignment: any) => assignment.tta_course_id);
      const learnerCoursePairs = activeAssignments
        .filter((assignment: any) => assignment.tta_learner_id && assignment.tta_course_id)
        .map((assignment: any) => ({
          learnerId: assignment.tta_learner_id,
          courseId: assignment.tta_course_id
        }));
      const learnerIdsFromPairs = Array.from(new Set(learnerCoursePairs.map((pair) => pair.learnerId)));

      const enrollmentQueries = await Promise.all([
        directEnrollmentIds.length > 0
          ? supabase
            .from('tbl_course_enrollments')
            .select(`
              tce_id,
              tce_user_id,
              tce_course_id,
              tce_progress_percentage,
              tce_enrollment_date,
              tce_completed_at,
              tce_is_active,
              course:tbl_courses!tbl_course_enrollments_tce_course_id_fkey (
                tc_title
              )
            `)
            .in('tce_id', directEnrollmentIds)
          : Promise.resolve({ data: [], error: null }),
        courseLevelCourseIds.length > 0
          ? supabase
            .from('tbl_course_enrollments')
            .select(`
              tce_id,
              tce_user_id,
              tce_course_id,
              tce_progress_percentage,
              tce_enrollment_date,
              tce_completed_at,
              tce_is_active,
              course:tbl_courses!tbl_course_enrollments_tce_course_id_fkey (
                tc_title
              )
            `)
            .in('tce_course_id', Array.from(new Set(courseLevelCourseIds)))
          : Promise.resolve({ data: [], error: null }),
        learnerIdsFromPairs.length > 0
          ? supabase
            .from('tbl_course_enrollments')
            .select(`
              tce_id,
              tce_user_id,
              tce_course_id,
              tce_progress_percentage,
              tce_enrollment_date,
              tce_completed_at,
              tce_is_active,
              course:tbl_courses!tbl_course_enrollments_tce_course_id_fkey (
                tc_title
              )
            `)
            .in('tce_user_id', learnerIdsFromPairs)
          : Promise.resolve({ data: [], error: null })
      ]);

      enrollmentQueries.forEach((result) => {
        if (result.error) throw result.error;
      });

      const pairKeySet = new Set(learnerCoursePairs.map((pair) => `${pair.learnerId}:${pair.courseId}`));
      const enrollmentsById = new Map<string, any>();

      enrollmentQueries.forEach((result, index) => {
        (result.data || []).forEach((enrollment: any) => {
          if (enrollment.tce_is_active === false) return;
          if (index === 2 && !pairKeySet.has(`${enrollment.tce_user_id}:${enrollment.tce_course_id}`)) return;
          enrollmentsById.set(enrollment.tce_id, enrollment);
        });
      });

      const enrollments = Array.from(enrollmentsById.values());
      const learnerIds = Array.from(new Set(enrollments.map((enrollment: any) => enrollment.tce_user_id).filter(Boolean)));

      const [profilesResult, usersResult] = await Promise.all([
        learnerIds.length > 0
          ? supabase
            .from('tbl_user_profiles')
            .select('tup_user_id, tup_first_name, tup_last_name')
            .in('tup_user_id', learnerIds)
          : Promise.resolve({ data: [], error: null }),
        learnerIds.length > 0
          ? supabase
            .from('tbl_users')
            .select('tu_id, tu_email')
            .in('tu_id', learnerIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (usersResult.error) throw usersResult.error;

      const profilesByUserId = new Map((profilesResult.data || []).map((profile: any) => [profile.tup_user_id, profile]));
      const usersById = new Map((usersResult.data || []).map((learner: any) => [learner.tu_id, learner]));

      const students = enrollments
        .map((enrollment: any) => {
          const profile = profilesByUserId.get(enrollment.tce_user_id);
          const learner = usersById.get(enrollment.tce_user_id);
          const fullName = [profile?.tup_first_name, profile?.tup_last_name]
            .filter(Boolean)
            .join(' ')
            .trim();

          return {
            enrollmentId: enrollment.tce_id,
            learnerId: enrollment.tce_user_id,
            studentName: fullName || learner?.tu_email || 'Unknown Student',
            email: learner?.tu_email || '',
            courseId: enrollment.tce_course_id,
            courseTitle: enrollment.course?.tc_title || 'Course',
            progress: Number(enrollment.tce_progress_percentage || 0),
            enrolledAt: enrollment.tce_enrollment_date || null,
            completedAt: enrollment.tce_completed_at || null
          };
        })
        .sort((a, b) => (
          new Date(b.enrolledAt || 0).getTime() - new Date(a.enrolledAt || 0).getTime()
        ));

      setAssignedStudents(students);
    } catch (error: any) {
      console.error('Failed to load assigned students:', error);
      setAssignedStudents([]);
      setStudentsError(error.message || 'Failed to load assigned students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const activeStudentCount = useMemo(() => (
    new Set(assignedStudents.map((student) => student.learnerId)).size
  ), [assignedStudents]);

  const assignedCourses = useMemo<AssignedCourse[]>(() => {
    const courseMap = new Map<string, {
      courseId: string;
      courseTitle: string;
      learnerIds: Set<string>;
      enrollmentCount: number;
      totalProgress: number;
      latestEnrollmentAt: string | null;
    }>();

    assignedStudents.forEach((student) => {
      const existingCourse = courseMap.get(student.courseId);

      if (existingCourse) {
        existingCourse.learnerIds.add(student.learnerId);
        existingCourse.enrollmentCount += 1;
        existingCourse.totalProgress += student.progress;

        if (
          student.enrolledAt &&
          (!existingCourse.latestEnrollmentAt || new Date(student.enrolledAt) > new Date(existingCourse.latestEnrollmentAt))
        ) {
          existingCourse.latestEnrollmentAt = student.enrolledAt;
        }
        return;
      }

      courseMap.set(student.courseId, {
        courseId: student.courseId,
        courseTitle: student.courseTitle,
        learnerIds: new Set([student.learnerId]),
        enrollmentCount: 1,
        totalProgress: student.progress,
        latestEnrollmentAt: student.enrolledAt
      });
    });

    return Array.from(courseMap.values())
      .map((course) => ({
        courseId: course.courseId,
        courseTitle: course.courseTitle,
        learnerCount: course.learnerIds.size,
        enrollmentCount: course.enrollmentCount,
        averageProgress: course.enrollmentCount > 0 ? course.totalProgress / course.enrollmentCount : 0,
        latestEnrollmentAt: course.latestEnrollmentAt
      }))
      .sort((a, b) => (
        new Date(b.latestEnrollmentAt || 0).getTime() - new Date(a.latestEnrollmentAt || 0).getTime()
      ));
  }, [assignedStudents]);

  const stats = [
    {
      title: 'Total Students',
      value: studentsLoading ? '...' : activeStudentCount.toString(),
      icon: Users,
      color: 'bg-blue-500',
      change: `${assignedStudents.length} active enrollment${assignedStudents.length !== 1 ? 's' : ''}`
    },
    {
      title: 'Average Rating',
      value: '4.9',
      icon: Star,
      color: 'bg-yellow-500',
      change: '23 reviews'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-2">
            Tutor Dashboard
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-sm text-green-600 mt-1">{stat.change}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'students', label: 'My Students', icon: Users },
                { id: 'courses', label: 'My Courses', icon: BookOpen },
                { id: 'profile', label: 'Profile', icon: Award }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
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

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'students' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">My Students</h3>
                  <div className="text-sm text-gray-500">
                    {activeStudentCount} active student{activeStudentCount !== 1 ? 's' : ''}
                  </div>
                </div>

                {studentsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mb-4"></div>
                    <p className="text-gray-600">Loading assigned students...</p>
                  </div>
                ) : studentsError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                    <p className="font-medium text-red-700">Failed to load students</p>
                    <p className="mt-1 text-sm text-red-600">{studentsError}</p>
                    <button
                      type="button"
                      onClick={loadAssignedStudents}
                      className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Retry
                    </button>
                  </div>
                ) : assignedStudents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignedStudents.map((student) => (
                      <div key={student.enrollmentId} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">{student.studentName.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{student.studentName}</h4>
                            <p className="text-sm text-gray-600 truncate">{student.courseTitle}</p>
                            {student.email && (
                              <p className="text-xs text-gray-500 truncate">{student.email}</p>
                            )}
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span className="font-medium">{Math.round(student.progress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${Math.min(Math.max(student.progress, 0), 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-gray-500">
                            Enrolled: {student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString() : 'N/A'}
                          </span>
                          {student.email && (
                            <a
                              href={`mailto:${student.email}`}
                              className="text-green-600 hover:text-green-700 text-sm font-medium"
                            >
                              Message
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No assigned students</h4>
                    <p className="text-gray-600">
                      Students will appear here after an admin assigns you to a course or enrollment.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'courses' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">My Courses</h3>
                  <div className="text-sm text-gray-500">
                    {assignedCourses.length} course{assignedCourses.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {studentsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mb-4"></div>
                    <p className="text-gray-600">Loading assigned courses...</p>
                  </div>
                ) : studentsError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                    <p className="font-medium text-red-700">Failed to load courses</p>
                    <p className="mt-1 text-sm text-red-600">{studentsError}</p>
                    <button
                      type="button"
                      onClick={loadAssignedStudents}
                      className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Retry
                    </button>
                  </div>
                ) : assignedCourses.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              Course
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              Learners
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              Average Progress
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              Latest Enrollment
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {assignedCourses.map((course) => (
                            <tr key={course.courseId} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <div className="mr-3 rounded-lg bg-green-100 p-2">
                                    <BookOpen className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">{course.courseTitle}</div>
                                    <div className="text-sm text-gray-500">
                                      {course.enrollmentCount} enrollment{course.enrollmentCount !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {course.learnerCount}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-32 rounded-full bg-gray-200">
                                    <div
                                      className="h-2 rounded-full bg-green-600"
                                      style={{ width: `${Math.min(Math.max(course.averageProgress, 0), 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">
                                    {Math.round(course.averageProgress)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {course.latestEnrollmentAt ? new Date(course.latestEnrollmentAt).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No assigned courses</h4>
                    <p className="text-gray-600">
                      Courses will appear here after an admin assigns you to a course or enrollment.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Tutor Profile</h3>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start space-x-6">
                    <img
                      src="https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">
                        {user?.firstName} {user?.lastName}
                      </h4>
                      <p className="text-green-600 mb-4">Senior Programming Instructor</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="text-gray-900">{user?.email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Specializations</label>
                          <p className="text-gray-900">JavaScript, React, Node.js</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Experience</label>
                          <p className="text-gray-900">10+ years</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Rating</label>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-gray-900">4.9 (23 reviews)</span>
                          </div>
                        </div>
                      </div>
                      
                      <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorDashboard;
