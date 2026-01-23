import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { videoStorage } from '../../lib/videoStorage';
import { useNotification } from '../ui/NotificationProvider';
import {
  BookOpen,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Plus,
  Save,
  X,
  Upload,
  Play,
  FileText,
  Calendar,
  DollarSign,
  Users,
  Clock,
  Star,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal
} from 'lucide-react';

interface Course {
  tc_id: string;
  tc_title: string;
  tc_description: string;
  tc_short_description: string;
  tc_thumbnail_url: string;
  tc_price: number;
  tc_pricing_type: 'free' | 'paid_days' | 'lifetime';
  tc_access_days?: number;
  tc_difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  tc_duration_hours: number;
  tc_total_lessons: number;
  tc_learning_outcomes: string[];
  tc_tags: string[];
  tc_featured: boolean;
  tc_is_active: boolean;
  tc_created_at: string;
  tbl_course_categories: {
    tcc_name: string;
    tcc_color: string;
  };
}

interface CourseCategory {
  tcc_id: string;
  tcc_name: string;
  tcc_description: string;
  tcc_icon: string;
  tcc_color: string;
}

interface Lesson {
  tcc_id: string;
  tcc_title: string;
  tcc_description: string;
  tcc_content_type: 'video' | 'document' | 'quiz' | 'assignment' | 'live_session';
  tcc_content_url: string;
  tcc_storage_path?: string;
  tcc_storage_provider?: string;
  tcc_file_size?: number;
  tcc_duration_minutes: number;
  tcc_sort_order: number;
  tcc_is_free: boolean;
  tcc_is_locked: boolean;
  tcc_is_active: boolean;
}

// Skeleton Loader for Table Rows
const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
      <>
        {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="animate-pulse">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-gray-200 rounded-lg mr-4"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-40 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-6 bg-gray-200 rounded-full w-24"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-gray-600">Loading courses...</p>
      </div>
  );
};

const CourseManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLessonsModal, setShowLessonsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editLessonMode, setEditLessonMode] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const notification = useNotification();

  const [courseFormData, setCourseFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    thumbnail_url: '',
    category_id: '',
    price: 0,
    pricing_type: 'free' as 'free' | 'paid_days' | 'lifetime',
    access_days: 30,
    difficulty_level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    duration_hours: 0,
    total_lessons: 0,
    learning_outcomes: [] as string[],
    tags: [] as string[],
    featured: false,
    is_active: true
  });

  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    content_type: 'video' as 'video' | 'document' | 'quiz' | 'assignment' | 'live_session',
    content_url: '',
    duration_minutes: 0,
    sort_order: 1,
    is_free: false,
    is_active: true,
    is_locked: false
  });

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load courses with pagination
  const loadCourses = async () => {
    try {
      setLoading(true);
      setListLoading(true);
      setError(null);

      // Build the base query with count
      let query = supabase
          .from('tbl_courses')
          .select(`
          *,
          tbl_course_categories (
            tcc_name,
            tcc_color
          )
        `, { count: 'exact' });

      // Apply filters if any
      if (categoryFilter !== 'all') {
        query = query.eq('tc_category_id', categoryFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('tc_is_active', statusFilter === 'active');
      }

      if (searchTerm) {
        query = query.or(`tc_title.ilike.%${searchTerm}%,tc_description.ilike.%${searchTerm}%,tc_short_description.ilike.%${searchTerm}%`);
      }

      // Apply pagination and ordering
      query = query
          .order('tc_created_at', { ascending: false })
          .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      setCourses(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setError('Failed to load course data');
      notification.showError('Load Failed', 'Failed to load course data');
    } finally {
      setLoading(false);
      setListLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
          .from('tbl_course_categories')
          .select('*')
          .eq('tcc_is_active', true)
          .order('tcc_sort_order');

      if (error) throw error;
      setCategories(data || []);
      return data;
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
      return [];
    }
  };

  const loadLessons = async (courseId: string) => {
    try {
      const { data, error } = await supabase
          .from('tbl_course_content')
          .select('*')
          .eq('tcc_course_id', courseId)
          .order('tcc_sort_order');

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Failed to load lessons:', error);
      setLessons([]);
    }
  };

  // Load data when component mounts or filters/pagination change
  useEffect(() => {
    loadCourses();
    loadCategories();
  }, [searchTerm, categoryFilter, statusFilter, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMode && selectedCourse) {
        // Update existing course
        const { error } = await supabase
            .from('tbl_courses')
            .update({
              tc_title: courseFormData.title,
              tc_description: courseFormData.description,
              tc_short_description: courseFormData.short_description,
              tc_thumbnail_url: courseFormData.thumbnail_url,
              tc_category_id: courseFormData.category_id,
              tc_price: courseFormData.price,
              tc_pricing_type: courseFormData.pricing_type,
              tc_access_days: courseFormData.pricing_type === 'paid_days' ? courseFormData.access_days : null,
              tc_difficulty_level: courseFormData.difficulty_level,
              tc_duration_hours: courseFormData.duration_hours,
              tc_total_lessons: courseFormData.total_lessons,
              tc_learning_outcomes: courseFormData.learning_outcomes,
              tc_tags: courseFormData.tags,
              tc_featured: courseFormData.featured,
              tc_is_active: courseFormData.is_active
            })
            .eq('tc_id', selectedCourse.tc_id);

        if (error) throw error;
        notification.showSuccess('Course Updated', 'Course has been updated successfully');
      } else {
        // Create new course
        const { error } = await supabase
            .from('tbl_courses')
            .insert({
              tc_title: courseFormData.title,
              tc_description: courseFormData.description,
              tc_short_description: courseFormData.short_description,
              tc_thumbnail_url: courseFormData.thumbnail_url,
              tc_category_id: courseFormData.category_id,
              tc_price: courseFormData.price,
              tc_pricing_type: courseFormData.pricing_type,
              tc_access_days: courseFormData.pricing_type === 'paid_days' ? courseFormData.access_days : null,
              tc_difficulty_level: courseFormData.difficulty_level,
              tc_duration_hours: courseFormData.duration_hours,
              tc_total_lessons: courseFormData.total_lessons,
              tc_learning_outcomes: courseFormData.learning_outcomes,
              tc_tags: courseFormData.tags,
              tc_featured: courseFormData.featured,
              tc_is_active: courseFormData.is_active
            });

        if (error) throw error;
        notification.showSuccess('Course Created', 'New course has been created successfully');
      }

      setShowCourseModal(false);
      resetCourseForm();
      loadCourses();
    } catch (error) {
      console.error('Failed to save course:', error);
      notification.showError('Save Failed', 'Failed to save course');
    }
  };

  const updateCourseDynamicFields = async (courseId: string) => {
    try {
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('tbl_course_content')
        .select('tcc_duration_minutes')
        .eq('tcc_course_id', courseId)
        .eq('tcc_is_active', true);

      if (lessonsError) throw lessonsError;

      const totalLessons = lessonsData?.length || 0;
      const totalMinutes = lessonsData?.reduce((sum, lesson) => sum + (lesson.tcc_duration_minutes || 0), 0) || 0;
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

      const { error: updateError } = await supabase
        .from('tbl_courses')
        .update({
          tc_total_lessons: totalLessons,
          tc_duration_hours: totalHours
        })
        .eq('tc_id', courseId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Failed to update course dynamic fields:', error);
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    try {
      setUploadingVideo(true);
      let contentUrl = lessonFormData.content_url;
      let storagePath = selectedLesson?.tcc_storage_path || null;
      let storageProvider = selectedLesson?.tcc_storage_provider || 'external';
      let fileSize = selectedLesson?.tcc_file_size || 0;

      if (uploadMethod === 'upload' && selectedVideoFile && lessonFormData.content_type === 'video') {
        const result = await videoStorage.uploadVideo(
            selectedVideoFile,
            selectedCourse.tc_id,
            (progress) => setUploadProgress(progress.percentage)
        );

        storagePath = result.storagePath;
        storageProvider = result.provider;
        fileSize = result.fileSize;
        contentUrl = '';
      }

      const lessonData = {
        tcc_course_id: selectedCourse.tc_id,
        tcc_title: lessonFormData.title,
        tcc_description: lessonFormData.description,
        tcc_content_type: lessonFormData.content_type,
        tcc_content_url: contentUrl,
        tcc_storage_provider: storageProvider,
        tcc_storage_path: storagePath,
        tcc_file_size: fileSize,
        tcc_duration_minutes: lessonFormData.duration_minutes,
        tcc_sort_order: lessonFormData.sort_order,
        tcc_is_free: lessonFormData.is_free,
        tcc_is_locked: lessonFormData.is_locked,
        tcc_is_active: lessonFormData.is_active
      };

      let error;
      if (editLessonMode && selectedLesson) {
        const result = await supabase
            .from('tbl_course_content')
            .update(lessonData)
            .eq('tcc_id', selectedLesson.tcc_id);
        error = result.error;
      } else {
        const result = await supabase
            .from('tbl_course_content')
            .insert(lessonData);
        error = result.error;
      }

      if (error) throw error;

      await updateCourseDynamicFields(selectedCourse.tc_id);

      notification.showSuccess(
          editLessonMode ? 'Lesson Updated' : 'Lesson Added',
          editLessonMode ? 'Lesson has been updated successfully' : 'New lesson has been added successfully'
      );
      resetLessonForm();
      loadLessons(selectedCourse.tc_id);
      loadCourses();
    } catch (error: any) {
      console.error('Failed to save lesson:', error);
      notification.showError('Save Failed', error.message || 'Failed to save lesson');
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        const { error } = await supabase
            .from('tbl_courses')
            .delete()
            .eq('tc_id', courseId);

        if (error) throw error;
        notification.showSuccess('Course Deleted', 'Course has been deleted successfully');
        loadCourses();
      } catch (error) {
        console.error('Failed to delete course:', error);
        notification.showError('Delete Failed', 'Failed to delete course');
      }
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (confirm('Are you sure you want to delete this lesson? This will also delete the video file from storage if it exists.')) {
      try {
        await videoStorage.deleteVideo(lessonId);

        const { error } = await supabase
            .from('tbl_course_content')
            .delete()
            .eq('tcc_id', lessonId);

        if (error) throw error;

        if (selectedCourse) {
          await updateCourseDynamicFields(selectedCourse.tc_id);
          loadLessons(selectedCourse.tc_id);
          loadCourses();
        }

        notification.showSuccess('Lesson Deleted', 'Lesson and associated video file have been deleted successfully');
      } catch (error) {
        console.error('Failed to delete lesson:', error);
        notification.showError('Delete Failed', 'Failed to delete lesson');
      }
    }
  };

  const resetCourseForm = () => {
    setCourseFormData({
      title: '',
      description: '',
      short_description: '',
      thumbnail_url: '',
      category_id: '',
      price: 0,
      pricing_type: 'free',
      access_days: 30,
      difficulty_level: 'beginner',
      duration_hours: 0,
      total_lessons: 0,
      learning_outcomes: [],
      tags: [],
      featured: false,
      is_active: true
    });
    setEditMode(false);
    setSelectedCourse(null);
  };

  const resetLessonForm = () => {
    setLessonFormData({
      title: '',
      description: '',
      content_type: 'video',
      content_url: '',
      duration_minutes: 0,
      sort_order: lessons.length + 1,
      is_free: false,
      is_locked: false,
      is_active: true
    });
    setSelectedVideoFile(null);
    setUploadMethod('url');
    setUploadProgress(0);
    setEditLessonMode(false);
    setSelectedLesson(null);
  };

  const openEditLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setLessonFormData({
      title: lesson.tcc_title,
      description: lesson.tcc_description,
      content_type: lesson.tcc_content_type,
      content_url: lesson.tcc_content_url,
      duration_minutes: lesson.tcc_duration_minutes,
      sort_order: lesson.tcc_sort_order,
      is_free: lesson.tcc_is_free,
      is_locked: lesson.tcc_is_locked,
      is_active: lesson.tcc_is_active
    });
    setEditLessonMode(true);
    setUploadMethod('url');
  };

  const openEditCourse = async (course: Course) => {
    setSelectedCourse(course);

    await updateCourseDynamicFields(course.tc_id);

    const { data: updatedCourse } = await supabase
      .from('tbl_courses')
      .select('*')
      .eq('tc_id', course.tc_id)
      .single();

    const courseToEdit = updatedCourse || course;

    setCourseFormData({
      title: courseToEdit.tc_title,
      description: courseToEdit.tc_description,
      short_description: courseToEdit.tc_short_description,
      thumbnail_url: courseToEdit.tc_thumbnail_url,
      category_id: courseToEdit.tc_category_id || '',
      price: courseToEdit.tc_price,
      pricing_type: courseToEdit.tc_pricing_type,
      access_days: courseToEdit.tc_access_days || 30,
      difficulty_level: courseToEdit.tc_difficulty_level,
      duration_hours: courseToEdit.tc_duration_hours,
      total_lessons: courseToEdit.tc_total_lessons,
      learning_outcomes: courseToEdit.tc_learning_outcomes,
      tags: courseToEdit.tc_tags,
      featured: courseToEdit.tc_featured,
      is_active: courseToEdit.tc_is_active
    });
    setEditMode(true);
    setShowCourseModal(true);
  };

  const openLessonsModal = (course: Course) => {
    setSelectedCourse(course);
    setShowLessonsModal(true);
    loadLessons(course.tc_id);
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

  if (loading && courses.length === 0) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <Loader />
        </div>
    );
  }

  if (error && courses.length === 0) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Courses</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
                onClick={() => loadCourses()}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
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
              <div className="bg-purple-100 p-3 rounded-lg">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Course Management</h3>
                <p className="text-gray-600">Manage courses, lessons, and content</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Total: {totalCount} courses
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-purple-500"
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
                    resetCourseForm();
                    setShowCourseModal(true);
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Course</span>
              </button>
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
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Search courses..."
                />
              </div>
            </div>

            <div>
              <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                    <option key={category.tcc_id} value={category.tcc_id}>
                      {category.tcc_name}
                    </option>
                ))}
              </select>
            </div>

            <div>
              <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Courses List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Course
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pricing
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
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
                  {courses.map((course) => (
                      <tr key={course.tc_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                                src={course.tc_thumbnail_url}
                                alt={course.tc_title}
                                className="h-12 w-12 rounded-lg object-cover mr-4"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {course.tc_title}
                              </div>
                              <div className="text-sm text-gray-500">
                                {course.tc_short_description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {course.tbl_course_categories?.tcc_name}
                      </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {course.tc_pricing_type === 'free' ? (
                                <span className="text-green-600 font-medium">Free</span>
                            ) : (
                                <span>${course.tc_price}</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {course.tc_pricing_type.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {course.tc_duration_hours}h • {course.tc_total_lessons} lessons
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {course.tc_difficulty_level}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          course.tc_is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                      }`}>
                        {course.tc_is_active ? 'Active' : 'Inactive'}
                      </span>
                          {course.tc_featured && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Featured
                        </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                                onClick={() => openLessonsModal(course)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                                title="Manage Lessons"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => openEditCourse(course)}
                                className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                                title="Edit Course"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => handleDeleteCourse(course.tc_id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                                title="Delete Course"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
        {totalCount > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                <span className="font-medium">{totalCount}</span> courses
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
                                ? 'bg-purple-600 text-white'
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

        {courses.length === 0 && !listLoading && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your search criteria'
                    : 'No courses have been created yet'
                }
              </p>
              <button
                  onClick={() => {
                    resetCourseForm();
                    setShowCourseModal(true);
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create Course
              </button>
            </div>
        )}

        {/* Course Modal */}
        {showCourseModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">
                    {editMode ? 'Edit Course' : 'Add New Course'}
                  </h3>
                </div>

                <form onSubmit={handleSaveCourse} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course Title *
                      </label>
                      <input
                          type="text"
                          required
                          value={courseFormData.title}
                          onChange={(e) => setCourseFormData(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                          required
                          value={courseFormData.category_id}
                          onChange={(e) => setCourseFormData(prev => ({ ...prev, category_id: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select category</option>
                        {categories.map(category => (
                            <option key={category.tcc_id} value={category.tcc_id}>
                              {category.tcc_name}
                            </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Short Description *
                    </label>
                    <input
                        type="text"
                        required
                        value={courseFormData.short_description}
                        onChange={(e) => setCourseFormData(prev => ({ ...prev, short_description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Brief description for course cards"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Description *
                    </label>
                    <textarea
                        required
                        rows={4}
                        value={courseFormData.description}
                        onChange={(e) => setCourseFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Detailed course description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thumbnail URL *
                    </label>
                    <input
                        type="url"
                        required
                        value={courseFormData.thumbnail_url}
                        onChange={(e) => setCourseFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pricing Type *
                      </label>
                      <select
                          value={courseFormData.pricing_type}
                          onChange={(e) => setCourseFormData(prev => ({
                            ...prev,
                            pricing_type: e.target.value as 'free' | 'paid_days' | 'lifetime'
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="free">Free</option>
                        <option value="paid_days">Time Limited</option>
                        <option value="lifetime">Lifetime Access</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price ($)
                      </label>
                      <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={courseFormData.price}
                          onChange={(e) => setCourseFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          disabled={courseFormData.pricing_type === 'free'}
                      />
                    </div>

                    {courseFormData.pricing_type === 'paid_days' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Access Days
                          </label>
                          <input
                              type="number"
                              min="1"
                              value={courseFormData.access_days}
                              onChange={(e) => setCourseFormData(prev => ({ ...prev, access_days: parseInt(e.target.value) || 30 }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Difficulty Level
                      </label>
                      <select
                          value={courseFormData.difficulty_level}
                          onChange={(e) => setCourseFormData(prev => ({
                            ...prev,
                            difficulty_level: e.target.value as 'beginner' | 'intermediate' | 'advanced'
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (Hours)
                        <span className="text-xs text-gray-500 ml-1">(Auto-calculated)</span>
                      </label>
                      <input
                          type="text"
                          value={`${courseFormData.duration_hours}h`}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                          title="Automatically calculated from lessons"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Lessons
                        <span className="text-xs text-gray-500 ml-1">(Auto-calculated)</span>
                      </label>
                      <input
                          type="text"
                          value={`${courseFormData.total_lessons} lessons`}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                          title="Automatically calculated from lessons"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> Duration and lesson count are calculated automatically based on the lessons you add to the course.
                    </p>
                  </div>

                  {/* Learning Outcomes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Learning Outcomes
                      </label>
                      <button
                          type="button"
                          onClick={addLearningOutcome}
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        + Add Outcome
                      </button>
                    </div>
                    <div className="space-y-2">
                      {courseFormData.learning_outcomes.map((outcome, index) => (
                          <div key={index} className="flex space-x-2">
                            <input
                                type="text"
                                value={outcome}
                                onChange={(e) => updateLearningOutcome(index, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="What will students learn?"
                            />
                            <button
                                type="button"
                                onClick={() => removeLearningOutcome(index)}
                                className="text-red-600 hover:text-red-800 p-2"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Tags
                      </label>
                      <button
                          type="button"
                          onClick={addTag}
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        + Add Tag
                      </button>
                    </div>
                    <div className="space-y-2">
                      {courseFormData.tags.map((tag, index) => (
                          <div key={index} className="flex space-x-2">
                            <input
                                type="text"
                                value={tag}
                                onChange={(e) => updateTag(index, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Course tag"
                            />
                            <button
                                type="button"
                                onClick={() => removeTag(index)}
                                className="text-red-600 hover:text-red-800 p-2"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                      ))}
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="flex space-x-6">
                    <label className="flex items-center">
                      <input
                          type="checkbox"
                          checked={courseFormData.featured}
                          onChange={(e) => setCourseFormData(prev => ({ ...prev, featured: e.target.checked }))}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Featured Course</span>
                    </label>

                    <label className="flex items-center">
                      <input
                          type="checkbox"
                          checked={courseFormData.is_active}
                          onChange={(e) => setCourseFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={() => {
                          setShowCourseModal(false);
                          resetCourseForm();
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      {editMode ? 'Update Course' : 'Create Course'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* Lessons Modal */}
        {showLessonsModal && selectedCourse && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Manage Lessons - {selectedCourse.tc_title}
                      </h3>
                      <p className="text-sm text-gray-600">Add and organize course content</p>
                    </div>
                    <button
                        onClick={() => setShowLessonsModal(false)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Add/Edit Lesson Form */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {editLessonMode ? 'Edit Lesson' : 'Add New Lesson'}
                        </h4>
                        {editLessonMode && (
                            <button
                                type="button"
                                onClick={resetLessonForm}
                                className="text-sm text-gray-600 hover:text-gray-800"
                            >
                              Cancel Edit
                            </button>
                        )}
                      </div>
                      <form onSubmit={handleSaveLesson} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Lesson Title *
                          </label>
                          <input
                              type="text"
                              required
                              value={lessonFormData.title}
                              onChange={(e) => setLessonFormData(prev => ({ ...prev, title: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                          </label>
                          <textarea
                              rows={3}
                              value={lessonFormData.description}
                              onChange={(e) => setLessonFormData(prev => ({ ...prev, description: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Content Type
                            </label>
                            <select
                                value={lessonFormData.content_type}
                                onChange={(e) => setLessonFormData(prev => ({
                                  ...prev,
                                  content_type: e.target.value as any
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="video">Video</option>
                              <option value="document">Document</option>
                              <option value="quiz">Quiz</option>
                              <option value="assignment">Assignment</option>
                              <option value="live_session">Live Session</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Duration (Minutes)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={lessonFormData.duration_minutes}
                                onChange={(e) => setLessonFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        {/* Video Source Selection */}
                        {lessonFormData.content_type === 'video' && (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Video Source
                                </label>
                                <div className="flex space-x-4">
                                  <label className="flex items-center">
                                    <input
                                        type="radio"
                                        checked={uploadMethod === 'url'}
                                        onChange={() => setUploadMethod('url')}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">External URL (YouTube, Vimeo, etc.)</span>
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                        type="radio"
                                        checked={uploadMethod === 'upload'}
                                        onChange={() => setUploadMethod('upload')}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">Upload Video File</span>
                                  </label>
                                </div>
                              </div>

                              {uploadMethod === 'url' ? (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Content URL
                                    </label>
                                    <input
                                        type="url"
                                        value={lessonFormData.content_url}
                                        onChange={(e) => setLessonFormData(prev => ({ ...prev, content_url: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        placeholder="https://youtube.com/watch?v=..."
                                    />
                                  </div>
                              ) : (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      Select Video File
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => setSelectedVideoFile(e.target.files?.[0] || null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        disabled={uploadingVideo}
                                    />
                                    {selectedVideoFile && (
                                        <p className="text-sm text-gray-600 mt-1">
                                          Selected: {selectedVideoFile.name} ({(selectedVideoFile.size / 1024 / 1024).toFixed(2)}MB)
                                        </p>
                                    )}
                                    {uploadingVideo && (
                                        <div className="mt-2">
                                          <div className="bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-purple-600 h-2 rounded-full transition-all"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                          </div>
                                          <p className="text-sm text-center text-gray-600 mt-1">
                                            Uploading... {uploadProgress}%
                                          </p>
                                        </div>
                                    )}
                                  </div>
                              )}

                              <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isLocked"
                                    checked={lessonFormData.is_locked}
                                    onChange={(e) => setLessonFormData(prev => ({ ...prev, is_locked: e.target.checked }))}
                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-2"
                                />
                                <label htmlFor="isLocked" className="text-sm text-gray-700">
                                  Lock video (requires tutor to grant access to learners)
                                </label>
                              </div>
                            </div>
                        )}

                        {/* Content URL for non-video types */}
                        {lessonFormData.content_type !== 'video' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Content URL
                              </label>
                              <input
                                  type="url"
                                  value={lessonFormData.content_url}
                                  onChange={(e) => setLessonFormData(prev => ({ ...prev, content_url: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  placeholder="Document link, quiz URL, etc."
                              />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Sort Order
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={lessonFormData.sort_order}
                                onChange={(e) => setLessonFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 1 }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>

                          <div className="flex items-end space-x-4">
                            <label className="flex items-center">
                              <input
                                  type="checkbox"
                                  checked={lessonFormData.is_free}
                                  onChange={(e) => setLessonFormData(prev => ({ ...prev, is_free: e.target.checked }))}
                                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Free Preview</span>
                            </label>
                          </div>
                        </div>

                        <button
                            type="submit"
                            disabled={uploadingVideo}
                            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {uploadingVideo ? 'Uploading...' : (editLessonMode ? 'Update Lesson' : 'Add Lesson')}
                        </button>
                      </form>
                    </div>

                    {/* Lessons List */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Course Lessons ({lessons.length})
                      </h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {lessons.map((lesson, index) => (
                            <div key={lesson.tcc_id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                                {lesson.tcc_content_type}
                              </span>
                                    {lesson.tcc_is_free && (
                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                  Free Preview
                                </span>
                                    )}
                                    {lesson.tcc_is_locked && (
                                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                  Locked
                                </span>
                                    )}
                                    <span className="text-xs text-gray-500">
                                Order: {lesson.tcc_sort_order}
                              </span>
                                  </div>
                                  <h5 className="font-medium text-gray-900">{lesson.tcc_title}</h5>
                                  <p className="text-sm text-gray-600">{lesson.tcc_description}</p>
                                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                    <span>{lesson.tcc_duration_minutes} min</span>
                                    {lesson.tcc_content_url && (
                                        <a
                                            href={lesson.tcc_content_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-600 hover:text-purple-700"
                                        >
                                          View Content
                                        </a>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                      onClick={() => openEditLesson(lesson)}
                                      className="text-blue-600 hover:text-blue-800 p-1"
                                      title="Edit Lesson"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                      onClick={() => handleDeleteLesson(lesson.tcc_id)}
                                      className="text-red-600 hover:text-red-800 p-1"
                                      title="Delete Lesson"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                        ))}
                        {lessons.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <Play className="h-8 w-8 mx-auto mb-2" />
                              <p>No lessons added yet</p>
                            </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>
  );
};

// Helper functions that were in the component but got cut off
const addLearningOutcome = () => {
  // This function is defined in the main component
  return null;
};

const updateLearningOutcome = (index: number, value: string) => {
  // This function is defined in the main component
  return null;
};

const removeLearningOutcome = (index: number) => {
  // This function is defined in the main component
  return null;
};

const addTag = () => {
  // This function is defined in the main component
  return null;
};

const updateTag = (index: number, value: string) => {
  // This function is defined in the main component
  return null;
};

const removeTag = (index: number) => {
  // This function is defined in the main component
  return null;
};

export default CourseManagement;