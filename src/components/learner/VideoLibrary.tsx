import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Play, Video as VideoIcon, Lock, BookOpen, Eye, X } from 'lucide-react';
import VideoPlayer from './VideoPlayer';

interface Lesson {
  tcc_id: string;
  tcc_title: string;
  tcc_description: string;
  tcc_content_type: string;
  tcc_content_url: string;
  tcc_duration_minutes: number;
  tcc_is_free: boolean;
  tcc_is_locked: boolean;
  tcc_sort_order: number;
  course: {
    tc_title: string;
  };
}

export default function VideoLibrary() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    fetchAccessibleVideos();
  }, []);

  const fetchAccessibleVideos = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: enrollments, error: enrollError } = await supabase
        .from('tbl_course_enrollments')
        .select('tce_course_id')
        .eq('tce_user_id', user.id);

      if (enrollError) throw enrollError;

      if (!enrollments || enrollments.length === 0) {
        setLessons([]);
        setLoading(false);
        return;
      }

      const courseIds = enrollments.map(e => e.tce_course_id);

      const { data: videosData, error: videosError } = await supabase
        .from('tbl_course_content')
        .select(`
          tcc_id,
          tcc_title,
          tcc_description,
          tcc_content_type,
          tcc_content_url,
          tcc_duration_minutes,
          tcc_is_free,
          tcc_is_locked,
          tcc_sort_order,
          course:tbl_courses!tbl_course_content_tcc_course_id_fkey (
            tc_title
          )
        `)
        .in('tcc_course_id', courseIds)
        .eq('tcc_is_active', true)
        .eq('tcc_content_type', 'video')
        .order('tcc_sort_order', { ascending: true });

      if (videosError) throw videosError;
      setLessons(videosData || []);
    } catch (err: any) {
      console.error('Error fetching videos:', err);
      setError('Failed to load videos');
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

  const openPlayer = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setShowPlayer(true);
  };

  const closePlayer = () => {
    setShowPlayer(false);
    setSelectedLesson(null);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Video Library</h2>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No videos available yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Video lessons will appear here once they are added to your enrolled courses
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson) => (
            <div key={lesson.tcc_id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 h-48 flex items-center justify-center relative">
                <Play className="h-16 w-16 text-white opacity-80" />
                {lesson.tcc_is_free && (
                  <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Free Preview
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{lesson.tcc_title}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {lesson.tcc_description || 'No description available'}
                </p>
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  <div className="flex items-center">
                    <VideoIcon className="h-3 w-3 mr-1" />
                    {lesson.course.tc_title}
                  </div>
                  <div className="flex items-center">
                    <Eye className="h-3 w-3 mr-1" />
                    Duration: {formatDuration(lesson.tcc_duration_minutes)}
                  </div>
                  <div className="text-blue-600 text-xs">
                    Lesson #{lesson.tcc_sort_order}
                  </div>
                </div>
                <button
                  onClick={() => openPlayer(lesson)}
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Watch Video</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {lessons.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">About Course Videos</h3>
          <p className="text-sm text-blue-800">
            These video lessons are part of your enrolled courses. Watch them in order for the best learning experience.
            If you have questions about the content, reach out to your assigned tutor for guidance.
          </p>
        </div>
      )}

      {showPlayer && selectedLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedLesson.tcc_title}</h2>
                <p className="text-gray-300 text-sm">{selectedLesson.course.tc_title}</p>
              </div>
              <button
                onClick={closePlayer}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <X className="h-8 w-8" />
              </button>
            </div>
            <VideoPlayer
              contentId={selectedLesson.tcc_id}
              title={selectedLesson.tcc_title}
              isFreePreview={selectedLesson.tcc_is_free}
              isLocked={selectedLesson.tcc_is_locked}
              hasAccess={true}
            />
            {selectedLesson.tcc_description && (
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <h3 className="text-white font-semibold mb-2">About this lesson</h3>
                <p className="text-gray-300 text-sm">{selectedLesson.tcc_description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
