import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Video, Play, Eye, BookOpen } from 'lucide-react';

interface Course {
  tc_id: string;
  tc_title: string;
}

interface Lesson {
  tcc_id: string;
  tcc_title: string;
  tcc_description: string;
  tcc_content_type: string;
  tcc_content_url: string;
  tcc_duration_minutes: number;
  tcc_sort_order: number;
  tcc_is_free: boolean;
  tcc_is_active: boolean;
  course: {
    tc_title: string;
  };
}

export default function VideoManager() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTutorCourses();
    fetchLessons();
  }, [selectedCourse]);

  const fetchTutorCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get courses where this tutor is assigned
      const { data: assignments } = await supabase
        .from('tbl_tutor_assignments')
        .select(`
          enrollment:tbl_course_enrollments!tta_enrollment_id (
            course:tbl_courses!tbl_course_enrollments_tce_course_id_fkey (
              tc_id,
              tc_title
            )
          )
        `)
        .eq('tta_tutor_id', user.id)
        .eq('tta_is_active', true);

      if (assignments) {
        const uniqueCourses = new Map();
        assignments.forEach((assignment: any) => {
          const course = assignment.enrollment?.course;
          if (course) {
            uniqueCourses.set(course.tc_id, {
              tc_id: course.tc_id,
              tc_title: course.tc_title,
            });
          }
        });
        setCourses(Array.from(uniqueCourses.values()));
      }
    } catch (err: any) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get course IDs for tutor's assignments
      const { data: assignments } = await supabase
        .from('tbl_tutor_assignments')
        .select(`
          enrollment:tbl_course_enrollments!tta_enrollment_id (
            tce_course_id
          )
        `)
        .eq('tta_tutor_id', user.id)
        .eq('tta_is_active', true);

      if (!assignments || assignments.length === 0) {
        setLessons([]);
        setLoading(false);
        return;
      }

      const courseIds = [...new Set(assignments
        .map((a: any) => a.enrollment?.tce_course_id)
        .filter(Boolean))];

      if (courseIds.length === 0) {
        setLessons([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('tbl_course_content')
        .select(`
          tcc_id,
          tcc_title,
          tcc_description,
          tcc_content_type,
          tcc_content_url,
          tcc_duration_minutes,
          tcc_sort_order,
          tcc_is_free,
          tcc_is_active,
          tcc_course_id,
          course:tbl_courses!tbl_course_content_tcc_course_id_fkey (
            tc_title
          )
        `)
        .in('tcc_course_id', courseIds)
        .eq('tcc_is_active', true)
        .eq('tcc_content_type', 'video')
        .order('tcc_sort_order', { ascending: true });

      if (selectedCourse !== 'all') {
        query = query.eq('tcc_course_id', selectedCourse);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setLessons(data || []);
    } catch (err: any) {
      console.error('Error fetching lessons:', err);
      setError('Failed to load video lessons');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Videos</h2>
          <p className="text-sm text-gray-600 mt-1">
            View video lessons for your assigned courses. Videos are managed by administrators.
          </p>
        </div>
      </div>

      {/* Course Filter */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by Course:</label>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Courses</option>
          {courses.map((course) => (
            <option key={course.tc_id} value={course.tc_id}>
              {course.tc_title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">You are not assigned to any courses yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Once an admin assigns you to learners, their course videos will appear here
          </p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {selectedCourse === 'all'
              ? 'No video lessons available yet'
              : 'No video lessons in this course yet'
            }
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Administrators can add video lessons in the Course Management section
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson) => (
            <div key={lesson.tcc_id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 h-48 flex items-center justify-center">
                <Play className="h-16 w-16 text-white opacity-80" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{lesson.tcc_title}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {lesson.tcc_description || 'No description'}
                </p>
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  <div className="flex items-center">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {lesson.course.tc_title}
                  </div>
                  <div className="flex items-center">
                    <Eye className="h-3 w-3 mr-1" />
                    Duration: {formatDuration(lesson.tcc_duration_minutes)}
                  </div>
                  {lesson.tcc_is_free && (
                    <div className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                      Free Preview
                    </div>
                  )}
                </div>
                {lesson.tcc_content_url && (
                  <a
                    href={lesson.tcc_content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Video
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Note for Tutors</h3>
        <p className="text-sm text-blue-800">
          Video lessons are managed by administrators in the Course Management section.
          You can view all videos for courses where you are assigned as a tutor.
          If you need new videos added or updated, please contact an administrator.
        </p>
      </div>
    </div>
  );
}
