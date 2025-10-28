import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import VideoPlayer from '../../components/learner/VideoPlayer';
import { ArrowLeft, CheckCircle, Circle, Play, Lock, Clock } from 'lucide-react';

interface CourseContent {
  tcc_id: string;
  tcc_title: string;
  tcc_description: string;
  tcc_content_type: string;
  tcc_duration_minutes: number;
  tcc_sort_order: number;
  tcc_is_free: boolean;
  tcc_is_locked: boolean;
  tcc_is_active: boolean;
  progress?: {
    tlp_completed: boolean;
    tlp_time_spent_minutes: number;
  };
}

interface Course {
  tc_id: string;
  tc_title: string;
  tc_description: string;
  tc_thumbnail_url: string;
  tc_total_lessons: number;
}

export default function CourseLearning() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [contents, setContents] = useState<CourseContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<CourseContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/learner/login');
        return;
      }
      setUserId(user.id);

      const { data: courseData, error: courseError } = await supabase
        .from('tbl_courses')
        .select('tc_id, tc_title, tc_description, tc_thumbnail_url, tc_total_lessons')
        .eq('tc_id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      const { data: contentData, error: contentError } = await supabase
        .from('tbl_course_content')
        .select('*')
        .eq('tcc_course_id', courseId)
        .eq('tcc_is_active', true)
        .eq('tcc_content_type', 'video')
        .order('tcc_sort_order', { ascending: true });

      if (contentError) throw contentError;

      const { data: progressData, error: progressError } = await supabase
        .from('tbl_learning_progress')
        .select('tlp_content_id, tlp_completed, tlp_time_spent_minutes')
        .eq('tlp_user_id', user.id)
        .eq('tlp_course_id', courseId);

      if (progressError) throw progressError;

      const progressMap = new Map(
        progressData?.map(p => [p.tlp_content_id, {
          tlp_completed: p.tlp_completed,
          tlp_time_spent_minutes: p.tlp_time_spent_minutes
        }])
      );

      const contentWithProgress = contentData.map(content => ({
        ...content,
        progress: progressMap.get(content.tcc_id)
      }));

      setContents(contentWithProgress);
      calculateProgress(contentWithProgress);

      const firstIncomplete = contentWithProgress.find(c => !c.progress?.tlp_completed);
      if (firstIncomplete) {
        setSelectedContent(firstIncomplete);
      } else if (contentWithProgress.length > 0) {
        setSelectedContent(contentWithProgress[0]);
      }
    } catch (err: any) {
      console.error('Error loading course:', err);
      setError('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (contentList: CourseContent[]) => {
    const total = contentList.length;
    if (total === 0) {
      setProgressPercentage(0);
      return;
    }
    const completed = contentList.filter(c => c.progress?.tlp_completed).length;
    setProgressPercentage(Math.round((completed / total) * 100));
  };

  const markAsCompleted = async (contentId: string) => {
    if (!userId || !courseId) return;

    try {
      const { error } = await supabase
        .from('tbl_learning_progress')
        .upsert({
          tlp_user_id: userId,
          tlp_course_id: courseId,
          tlp_content_id: contentId,
          tlp_completed: true,
          tlp_completion_date: new Date().toISOString(),
          tlp_updated_at: new Date().toISOString()
        }, {
          onConflict: 'tlp_user_id,tlp_content_id'
        });

      if (error) throw error;

      await supabase.rpc('update_enrollment_progress', {
        p_user_id: userId,
        p_course_id: courseId
      });

      await loadCourseData();
    } catch (err: any) {
      console.error('Error marking as completed:', err);
    }
  };

  const handleVideoEnd = () => {
    if (selectedContent && !selectedContent.progress?.tlp_completed) {
      markAsCompleted(selectedContent.tcc_id);
    }
  };

  const selectContent = (content: CourseContent) => {
    setSelectedContent(content);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Course not found'}</p>
          <button
            onClick={() => navigate('/learner/dashboard')}
            className="text-blue-600 hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/learner/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{course.tc_title}</h1>
              <p className="text-gray-600 mt-1">{contents.length} lessons</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Course Progress</div>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <span className="font-bold text-gray-900">{progressPercentage}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {selectedContent ? (
              <div>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
                  <VideoPlayer
                    contentId={selectedContent.tcc_id}
                    title={selectedContent.tcc_title}
                    isFreePreview={selectedContent.tcc_is_free}
                    isLocked={selectedContent.tcc_is_locked}
                    hasAccess={true}
                    onVideoEnd={handleVideoEnd}
                  />
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedContent.tcc_title}
                      </h2>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDuration(selectedContent.tcc_duration_minutes)}
                        </div>
                        <div className="flex items-center">
                          <span className="text-gray-400">Lesson #{selectedContent.tcc_sort_order}</span>
                        </div>
                      </div>
                    </div>
                    {!selectedContent.progress?.tlp_completed && (
                      <button
                        onClick={() => markAsCompleted(selectedContent.tcc_id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Mark as Complete
                      </button>
                    )}
                  </div>
                  {selectedContent.tcc_description && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">About this lesson</h3>
                      <p className="text-gray-600">{selectedContent.tcc_description}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Play className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a lesson to start learning</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Course Content</h3>
              <div className="space-y-2">
                {contents.map((content, index) => (
                  <button
                    key={content.tcc_id}
                    onClick={() => selectContent(content)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedContent?.tcc_id === content.tcc_id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {content.progress?.tlp_completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : content.tcc_is_locked ? (
                          <Lock className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Lesson {content.tcc_sort_order}</span>
                          <span className="text-xs text-gray-500">
                            {formatDuration(content.tcc_duration_minutes)}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                          {content.tcc_title}
                        </h4>
                        {content.tcc_is_free && (
                          <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            Free Preview
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
