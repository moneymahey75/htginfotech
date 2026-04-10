import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getCourseCategories, getCourses } from '../lib/supabase';
import { buildAssetUrl } from '../utils/baseUrl';
import { 
  Search, 
  Filter, 
  Clock, 
  Users, 
  Star, 
  Play,
  BookOpen,
  Award,
  DollarSign,
  Calendar,
  ChevronRight,
  Grid3X3,
  List,
  SlidersHorizontal
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
  tbl_course_categories: {
    tcc_name: string;
    tcc_color: string;
    tcc_icon: string;
  };
}

interface CourseCategory {
  tcc_id: string;
  tcc_name: string;
  tcc_description: string;
  tcc_icon: string;
  tcc_color: string;
  tcc_sort_order?: number;
}

const COURSE_VIEW_MODE_STORAGE_KEY = 'courses-view-mode';
const COURSE_FALLBACK_IMAGE = buildAssetUrl('/htginfotech-logo.png');

const getInitialViewMode = (): 'grid' | 'list' => {
  if (typeof window === 'undefined') {
    return 'grid';
  }

  const savedViewMode = window.localStorage.getItem(COURSE_VIEW_MODE_STORAGE_KEY);
  return savedViewMode === 'list' ? 'list' : 'grid';
};

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(getInitialViewMode);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(COURSE_VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesData, categoriesData] = await Promise.all([
        getCourses(),
        getCourseCategories()
      ]);
      setCourses(coursesData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.tc_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.tc_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.tc_tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = 
      selectedCategory === 'all' || 
      course.tbl_course_categories?.tcc_name === selectedCategory;

    const matchesPrice = 
      priceFilter === 'all' ||
      (priceFilter === 'free' && course.tc_pricing_type === 'free') ||
      (priceFilter === 'paid' && course.tc_pricing_type !== 'free');

    const matchesDifficulty = 
      difficultyFilter === 'all' || 
      course.tc_difficulty_level === difficultyFilter;

    return matchesSearch && matchesCategory && matchesPrice && matchesDifficulty;
  });

  const visibleCategories = useMemo(() => {
    const categoryNamesWithCourses = new Set(
      courses
        .map((course) => course.tbl_course_categories?.tcc_name)
        .filter(Boolean)
    );

    return categories.filter((category) => categoryNamesWithCourses.has(category.tcc_name));
  }, [categories, courses]);

  useEffect(() => {
    if (selectedCategory === 'all') {
      return;
    }

    const categoryStillVisible = visibleCategories.some((category) => category.tcc_name === selectedCategory);
    if (!categoryStillVisible) {
      setSelectedCategory('all');
    }
  }, [selectedCategory, visibleCategories]);

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return a.tc_price - b.tc_price;
      case 'price_high':
        return b.tc_price - a.tc_price;
      case 'duration':
        return a.tc_duration_hours - b.tc_duration_hours;
      case 'title':
        return a.tc_title.localeCompare(b.tc_title);
      default: // newest
        return new Date(b.tc_created_at || '').getTime() - new Date(a.tc_created_at || '').getTime();
    }
  });

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriceDisplay = (course: Course) => {
    if (course.tc_pricing_type === 'free') {
      return <span className="text-green-600 font-bold">Free</span>;
    } else if (course.tc_pricing_type === 'paid_days') {
      return (
        <div>
          <span className="text-2xl font-bold text-gray-900">${course.tc_price}</span>
          <span className="text-sm text-gray-600">/{course.tc_access_days} days</span>
        </div>
      );
    } else {
      return (
        <div>
          <span className="text-2xl font-bold text-gray-900">${course.tc_price}</span>
          <span className="text-sm text-gray-600">/lifetime</span>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6">
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 mb-6 border border-white/20">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-medium">Course Catalog</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Explore Our Courses</h1>
          <p className="text-xl md:text-2xl text-indigo-100 max-w-3xl mx-auto mb-8">
            Discover thousands of courses taught by expert tutors.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 border border-white/20 rounded-2xl bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:ring-2 focus:ring-white/50 focus:border-transparent"
                placeholder="Search courses, topics, or skills..."
              />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <SlidersHorizontal className="h-5 w-5 text-gray-400" />
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Categories</h4>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {visibleCategories.map((category) => (
                    <option key={category.tcc_id} value={category.tcc_name}>
                      {category.tcc_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Price</h4>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'All Courses' },
                    { value: 'free', label: 'Free Only' },
                    { value: 'paid', label: 'Paid Courses' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setPriceFilter(option.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        priceFilter === option.value
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Difficulty</h4>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'All Levels' },
                    { value: 'beginner', label: 'Beginner' },
                    { value: 'intermediate', label: 'Intermediate' },
                    { value: 'advanced', label: 'Advanced' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDifficultyFilter(option.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        difficultyFilter === option.value
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedCategory === 'all' ? 'All Courses' : selectedCategory}
                </h2>
                <p className="text-gray-600">{sortedCourses.length} courses found</p>
              </div>

              <div className="flex items-center space-x-4">
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="title">Title A-Z</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="duration">Duration</option>
                </select>

                {/* View Mode */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Courses Grid/List */}
            {sortedCourses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
                <p className="text-gray-600">Try adjusting your search criteria or browse different categories.</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-6'
              }>
                {sortedCourses.map((course) => (
                  <CourseCard 
                    key={course.tc_id} 
                    course={course} 
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Course Card Component
const CourseCard: React.FC<{ course: Course; viewMode: 'grid' | 'list' }> = ({ course, viewMode }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.src.endsWith(COURSE_FALLBACK_IMAGE)) {
      return;
    }

    image.src = COURSE_FALLBACK_IMAGE;
    image.classList.remove('object-cover');
    image.classList.add('object-contain', 'opacity-20', 'p-6');
    image.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-gray-50');
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const courseDescription = (course.tc_short_description || course.tc_description || '').trim();
  const maxDescriptionLength = 50;
  const shouldTruncateDescription = courseDescription.length > maxDescriptionLength;
  const visibleDescription = isDescriptionExpanded || !shouldTruncateDescription
    ? courseDescription
    : `${courseDescription.slice(0, maxDescriptionLength).trimEnd()}...`;

  const getAccessLabel = () => {
    if (course.tc_pricing_type === 'free') {
      return 'Free access';
    }

    if (course.tc_pricing_type === 'paid_days') {
      return `${course.tc_access_days ?? 0} days`;
    }

    return 'Lifetime';
  };

  const getPriceDisplay = () => {
    if (course.tc_pricing_type === 'free') {
      return <span className="text-green-600 font-bold text-xl">Free</span>;
    }

    return <span className="text-2xl font-bold text-gray-900">${course.tc_price}</span>;
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
        <div className="flex min-h-[220px]">
          <div className="w-64 min-h-[220px] flex-shrink-0 bg-gray-100 rounded-l-xl overflow-hidden relative">
            <img
                src={course.tc_thumbnail_url}
                alt={course.tc_title}
                className="w-full h-full min-h-full object-cover"
                onError={handleImageError}
            />
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getDifficultyColor(course.tc_difficulty_level)}`}>
                {course.tc_difficulty_level}
              </span>
              {course.tc_featured && (
                <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                  Featured
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 px-5 py-2 flex flex-col">
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div className="min-w-0 flex-1">
                  <h3 className="text-3xl font-bold text-gray-900 leading-tight mb-1">{course.tc_title}</h3>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600">4.8</span>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-0">{visibleDescription}</p>
              {shouldTruncateDescription && (
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 w-fit"
                >
                  {isDescriptionExpanded ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>

            <div className="border-t border-b border-gray-100 py-4 mt-3 mb-4">
              <div className="grid grid-cols-3 gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2 justify-start">
                  <Clock className="h-5 w-5 flex-shrink-0" />
                  <span>{course.tc_duration_hours}h</span>
                </div>
                <div className="flex items-center gap-2 justify-start">
                  <Play className="h-5 w-5 flex-shrink-0" />
                  <span>{course.tc_total_lessons} lessons</span>
                </div>
                <div className="flex items-center gap-2 justify-start">
                  <Users className="h-5 w-5 flex-shrink-0" />
                  <span>1.2k students</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-6 mt-auto">
              <div className="min-w-0">
                {getPriceDisplay()}
              </div>
              <div className="text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
                {getAccessLabel()}
              </div>
              <Link
                to={`/courses/${course.tc_id}`}
                className="bg-indigo-600 text-white px-5 py-2 rounded-full hover:bg-indigo-700 transition-colors flex items-center space-x-2 text-base font-medium whitespace-nowrap"
              >
                <span>View Details</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group h-full flex flex-col">
      <div className="relative overflow-hidden rounded-t-xl">
        <img
          src={course.tc_thumbnail_url}
          alt={course.tc_title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          onError={handleImageError}
        />
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(course.tc_difficulty_level)}`}>
            {course.tc_difficulty_level}
          </span>
        </div>
        <div className="absolute top-4 right-4">
          {course.tc_featured && (
            <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold">
              Featured
            </div>
          )}
        </div>
      </div>
      
      <div className="px-6 pt-4 pb-6 flex flex-col flex-1">
        <div className="mb-1">
          <span className="text-sm text-gray-500">
            {course.tbl_course_categories?.tcc_name}
          </span>
        </div>
        
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-xl font-bold text-gray-900 flex-1 line-clamp-2">{course.tc_title}</h3>
          <div className="flex items-center space-x-1 flex-shrink-0 pt-1">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="text-sm text-gray-600">4.8</span>
          </div>
        </div>

        <div className="mb-0">
          <p className="text-gray-600 text-sm">{visibleDescription}</p>
          {shouldTruncateDescription && (
            <button
              type="button"
              onClick={() => setIsDescriptionExpanded((prev) => !prev)}
              className="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              {isDescriptionExpanded ? 'Read less' : 'Read more'}
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-3 text-sm text-gray-500 border-t border-b border-gray-100 py-4 mt-3 mb-4">
          <div className="flex flex-col items-center text-center">
            <div className="h-5 flex items-center justify-center mb-2">
              <Clock className="h-4 w-4" />
            </div>
            <span className="leading-tight">{course.tc_duration_hours}h</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="h-5 flex items-center justify-center mb-2">
              <Play className="h-4 w-4" />
            </div>
            <span className="leading-tight">{course.tc_total_lessons} lessons</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="h-5 flex items-center justify-center mb-2">
              <Users className="h-4 w-4" />
            </div>
            <span className="leading-tight">1.2k students</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            {getPriceDisplay()}
          </div>
          <div className="text-sm text-gray-500 text-right whitespace-nowrap">
            {getAccessLabel()}
          </div>
        </div>

        <Link
          to={`/courses/${course.tc_id}`}
          className="block w-full bg-indigo-600 text-white px-4 py-2.5 rounded-full hover:bg-indigo-700 transition-colors text-base font-medium text-center mt-auto"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default Courses;
