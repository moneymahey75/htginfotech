import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserEnrollments, supabase } from '../../lib/supabase';
import PaymentHistory from '../../components/learner/PaymentHistory';
import VideoLibrary from '../../components/learner/VideoLibrary';
import CourseImage from '../../components/ui/CourseImage';
import {
  BookOpen,
  TrendingUp,
  Clock,
  Award,
  Play,
  Calendar,
  User,
  BarChart3,
  CheckCircle,
  Star,
  Receipt,
  Video,
  Download
} from 'lucide-react';

interface Enrollment {
  tce_id: string;
  tce_course_id: string;
  tce_progress_percentage: number;
  tce_enrollment_date: string;
  tce_completion_date?: string | null;
  tce_access_expires_at?: string;
  tbl_courses: {
    tc_id: string;
    tc_title: string;
    tc_thumbnail_url: string;
    tc_difficulty_level: string;
    tc_duration_hours: number;
    tbl_course_categories: {
      tcc_name: string;
      tcc_color: string;
    };
  };
}

interface AssignedTutor {
  tta_id: string;
  tta_assigned_at: string;
  tta_notes?: string;
  tta_status: string;
  tutor?: {
    tu_id: string;
    tu_email: string;
    profile?: {
      tup_first_name: string;
      tup_last_name: string;
      tup_middle_name?: string;
      tup_mobile?: string;
    }[];
    tutor_profile?: {
      tt_id: string;
      tt_bio: string;
      tt_experience_years: number;
      tt_hourly_rate: number;
      tt_rating: number;
      tt_total_students: number;
      tt_specializations: string[];
    }[];
  };
  course?: {
    tc_id: string;
    tc_title: string;
    tc_description?: string;
    tc_thumbnail_url?: string;
    tc_price?: number;
    tc_difficulty_level?: string;
  };
}

interface RecentActivity {
  type: string;
  message: string;
  time: string;
  icon: any;
}

const LearnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [assignedTutors, setAssignedTutors] = useState<AssignedTutor[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorsLoading, setTutorsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadEnrollments();
      loadRecentActivities();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && activeTab === 'tutor') {
      loadAssignedTutors();
    }
  }, [user?.id, activeTab]);

  const loadEnrollments = async () => {
    try {
      const data = await getUserEnrollments(user!.id);
      setEnrollments(data || []);
    } catch (error) {
      console.error('Failed to load enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const activities: RecentActivity[] = [];

      const { data: learningProgress } = await supabase
        .from('tbl_learning_progress')
        .select(`
          tlp_id,
          tlp_completed,
          tlp_completion_date,
          tlp_updated_at,
          tbl_course_content!inner(
            tcc_title,
            tcc_content_type
          ),
          tbl_courses!inner(
            tc_title
          )
        `)
        .eq('tlp_user_id', user!.id)
        .order('tlp_updated_at', { ascending: false })
        .limit(5);

      if (learningProgress) {
        learningProgress.forEach((progress: any) => {
          if (progress.tlp_completed) {
            activities.push({
              type: 'lesson_complete',
              message: `Completed: ${progress.tbl_course_content.tcc_title} in ${progress.tbl_courses.tc_title}`,
              time: getTimeAgo(progress.tlp_completion_date || progress.tlp_updated_at),
              icon: CheckCircle
            });
          }
        });
      }

      const { data: completedCourses } = await supabase
        .from('tbl_course_enrollments')
        .select('tce_id, tce_completion_date, tbl_courses(tc_title)')
        .eq('tce_user_id', user!.id)
        .eq('tce_progress_percentage', 100)
        .not('tce_completion_date', 'is', null)
        .order('tce_completion_date', { ascending: false })
        .limit(3);

      if (completedCourses) {
        completedCourses.forEach((course: any) => {
          activities.push({
            type: 'certificate',
            message: `Earned certificate for ${course.tbl_courses.tc_title}`,
            time: getTimeAgo(course.tce_completion_date),
            icon: Award
          });
        });
      }

      const { data: recentEnrollments } = await supabase
        .from('tbl_course_enrollments')
        .select('tce_id, tce_enrollment_date, tbl_courses(tc_title)')
        .eq('tce_user_id', user!.id)
        .order('tce_enrollment_date', { ascending: false })
        .limit(3);

      if (recentEnrollments) {
        recentEnrollments.forEach((enrollment: any) => {
          activities.push({
            type: 'course_start',
            message: `Started ${enrollment.tbl_courses.tc_title} course`,
            time: getTimeAgo(enrollment.tce_enrollment_date),
            icon: Play
          });
        });
      }

      activities.sort((a, b) => {
        const timeA = parseTimeAgo(a.time);
        const timeB = parseTimeAgo(b.time);
        return timeA - timeB;
      });

      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error('Failed to load recent activities:', error);
    }
  };

  const getTimeAgo = (date: string): string => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  };

  const parseTimeAgo = (timeStr: string): number => {
    const match = timeStr.match(/(\d+)\s+(minute|hour|day|week|month)/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers: { [key: string]: number } = {
      minute: 1,
      hour: 60,
      day: 1440,
      week: 10080,
      month: 43200
    };
    return value * (multipliers[unit] || 0);
  };

  const loadAssignedTutors = async () => {
    try {
      setTutorsLoading(true);
      const { data, error } = await supabase
          .from('tbl_tutor_assignments')
          .select(`
          tta_id,
          tta_assigned_at,
          tta_notes,
          tta_status,
          tutor:tbl_users!tbl_tutor_assignments_tta_tutor_id_fkey(
            tu_id,
            tu_email,
            profile:tbl_user_profiles!tbl_user_profiles_tup_user_id_fkey(
              tup_first_name,
              tup_last_name,
              tup_middle_name,
              tup_mobile
            ),
            tutor_profile:tbl_tutors!tbl_tutors_tt_user_id_fkey(
              tt_id,
              tt_bio,
              tt_experience_years,
              tt_hourly_rate,
              tt_rating,
              tt_total_students,
              tt_specializations
            )
          ),
          course:tbl_courses!tbl_tutor_assignments_tta_course_id_fkey(
            tc_id,
            tc_title,
            tc_description,
            tc_thumbnail_url,
            tc_price,
            tc_difficulty_level
          )
        `)
          .eq('tta_learner_id', user!.id)
          .eq('tta_status', 'active')
          .eq('tta_is_active', true);

      if (error) {
        throw error;
      }

      setAssignedTutors(data || []);
    } catch (error) {
      console.error('Failed to load assigned tutors:', error);
    } finally {
      setTutorsLoading(false);
    }
  };

  // Helper function to safely get tutor data
  const getTutorData = (assignment: AssignedTutor) => {
    const tutor = assignment.tutor;
    const profile = tutor?.profile && tutor.profile.length > 0 ? tutor.profile[0] : null;
    const tutorProfile = tutor?.tutor_profile && tutor.tutor_profile.length > 0 ? tutor.tutor_profile[0] : null;

    return {
      fullName: profile ? `${profile.tup_first_name || ''} ${profile.tup_last_name || ''}`.trim() : 'Unknown Tutor',
      email: tutor?.tu_email || '',
      profilePicture: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      bio: tutorProfile?.tt_bio || '',
      experienceYears: tutorProfile?.tt_experience_years || 0,
      hourlyRate: tutorProfile?.tt_hourly_rate || 0,
      rating: tutorProfile?.tt_rating || 0,
      totalStudents: tutorProfile?.tt_total_students || 0,
      specializations: tutorProfile?.tt_specializations || []
    };
  };

  const certificateEnrollments = enrollments.filter(e => e.tce_progress_percentage === 100);
  const completedCourses = certificateEnrollments.length;
  const totalHours = enrollments.reduce((total, e) => total + (e.tbl_courses?.tc_duration_hours || 0), 0);
  const timeSpentHours = Math.round(enrollments.reduce((sum, e) =>
    sum + ((e.tbl_courses?.tc_duration_hours || 0) * (e.tce_progress_percentage / 100)), 0));

  const stats = [
    {
      title: 'Enrolled Courses',
      value: enrollments.length,
      icon: BookOpen,
      color: 'bg-blue-500',
      change: totalHours > 0 ? `${totalHours} total hours` : 'No courses yet',
      tabId: 'courses'
    },
    {
      title: 'Completed Courses',
      value: completedCourses,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: enrollments.length > 0 && completedCourses > 0 ? `${Math.round((completedCourses / enrollments.length) * 100)}% completion rate` : 'No courses completed',
      tabId: 'courses'
    },
    {
      title: 'Learning Hours',
      value: timeSpentHours,
      icon: Clock,
      color: 'bg-purple-500',
      change: enrollments.length > 0 && totalHours > 0 ? `${Math.round((timeSpentHours / totalHours) * 100)}% of total` : 'Start learning',
      tabId: 'progress'
    },
    {
      title: 'Certificates',
      value: completedCourses,
      icon: Award,
      color: 'bg-yellow-500',
      change: completedCourses > 0 ? 'Download available' : 'Complete courses to earn',
      tabId: 'certificates'
    }
  ];

  const openDashboardTab = (tabId: string) => {
    setActiveTab(tabId);
    window.setTimeout(() => {
      document.getElementById('learner-dashboard-tabs')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 0);
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLearnerFullName = () => {
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    return fullName || user?.email || 'Learner';
  };

  const formatCertificateDate = (date?: string | null) => {
    const value = date ? new Date(date) : new Date();
    return value.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const sanitizeFileName = (value: string) => (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'certificate'
  );

  const loadCertificateLogo = async () => {
    const logo = new Image();
    logo.src = '/htginfotech-logo.png';
    await new Promise<void>((resolve, reject) => {
      logo.onload = () => resolve();
      logo.onerror = () => reject(new Error('Certificate logo could not be loaded'));
    });
    return logo;
  };

  const drawCenteredText = (
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';

    words.forEach((word) => {
      const testLine = line ? `${line} ${word}` : word;
      if (context.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    });

    if (line) {
      lines.push(line);
    }

    lines.forEach((lineText, index) => {
      context.fillText(lineText, x, y + (index * lineHeight));
    });

    return y + ((lines.length - 1) * lineHeight);
  };

  const createImagePdf = (imageDataUrl: string, width: number, height: number) => {
    const base64 = imageDataUrl.split(',')[1];
    const binary = atob(base64);
    const imageBytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      imageBytes[i] = binary.charCodeAt(i);
    }

    const encoder = new TextEncoder();
    const chunks: (Uint8Array | string)[] = [];
    const offsets = [0];
    let byteLength = 0;

    const append = (chunk: Uint8Array | string) => {
      chunks.push(chunk);
      byteLength += typeof chunk === 'string' ? encoder.encode(chunk).length : chunk.length;
    };

    const appendObject = (content: (Uint8Array | string)[]) => {
      offsets.push(byteLength);
      content.forEach(append);
    };

    append('%PDF-1.4\n');
    appendObject(['1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n']);
    appendObject(['2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n']);
    appendObject(['3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >> endobj\n']);

    const stream = 'q 842 0 0 595 0 0 cm /Im0 Do Q\n';
    appendObject([`4 0 obj << /Length ${stream.length} >> stream\n${stream}endstream endobj\n`]);
    appendObject([
      `5 0 obj << /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >> stream\n`,
      imageBytes,
      '\nendstream endobj\n'
    ]);

    const xrefOffset = byteLength;
    append(`xref\n0 ${offsets.length}\n`);
    append('0000000000 65535 f \n');
    offsets.slice(1).forEach((offset) => {
      append(`${String(offset).padStart(10, '0')} 00000 n \n`);
    });
    append(`trailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    return new Blob(chunks, {type: 'application/pdf'});
  };

  const createCertificatePdf = async (enrollment: Enrollment) => {
    const userName = getLearnerFullName();
    const courseName = enrollment.tbl_courses?.tc_title || 'Course';
    const completionDate = formatCertificateDate(enrollment.tce_completion_date || enrollment.tce_enrollment_date);
    const certificateId = `HTG-${enrollment.tce_id.slice(0, 8).toUpperCase()}`;
    const message = `This is to certify that ${userName} has successfully completed the course ${courseName} on ${completionDate}.`;

    const width = 1600;
    const height = 1131;
    const centerX = width / 2;
    const logoBlue = '#204a9a';
    const logoGold = '#f4b321';
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Certificate canvas could not be created');
    }

    context.fillStyle = '#f8fbff';
    context.fillRect(0, 0, width, height);

    context.strokeStyle = logoBlue;
    context.lineWidth = 18;
    context.strokeRect(54, 54, width - 108, height - 108);
    context.strokeStyle = logoGold;
    context.lineWidth = 7;
    context.strokeRect(83, 83, width - 166, height - 166);

    context.textAlign = 'right';
    context.fillStyle = logoBlue;
    context.font = 'bold 22px Arial, sans-serif';
    context.fillText(`Certificate ID: ${certificateId}`, width - 135, 150);

    const logo = await loadCertificateLogo();
    const logoWidth = 360;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    context.drawImage(logo, centerX - (logoWidth / 2), 118, logoWidth, logoHeight);

    context.textAlign = 'center';
    context.fillStyle = '#111827';
    context.font = 'bold 76px Georgia, serif';
    context.fillText('Certificate of Completion', centerX, 405);

    context.fillStyle = '#4b5563';
    context.font = '30px Arial, sans-serif';
    context.fillText('This certificate is proudly presented to', centerX, 485);

    context.fillStyle = logoBlue;
    context.font = 'bold 64px Georgia, serif';
    context.fillText(userName, centerX, 575);

    context.strokeStyle = logoGold;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(470, 607);
    context.lineTo(1130, 607);
    context.stroke();

    context.fillStyle = '#374151';
    context.font = '31px Arial, sans-serif';
    drawCenteredText(context, message, centerX, 690, 1120, 44);

    context.fillStyle = logoBlue;
    context.font = 'bold 24px Arial, sans-serif';
    context.fillText('COURSE', centerX, 810);
    context.fillStyle = '#111827';
    context.font = 'bold 34px Arial, sans-serif';
    drawCenteredText(context, courseName, centerX, 855, 1080, 42);

    context.fillStyle = logoBlue;
    context.font = 'bold 23px Arial, sans-serif';
    context.fillText('COMPLETION DATE', centerX, 955);
    context.fillStyle = '#111827';
    context.font = '28px Arial, sans-serif';
    context.fillText(completionDate, centerX, 997);

    return createImagePdf(canvas.toDataURL('image/jpeg', 0.94), width, height);
  };

  const downloadCertificate = async (enrollment: Enrollment) => {
    if (enrollment.tce_progress_percentage !== 100) {
      return;
    }

    const pdf = await createCertificatePdf(enrollment);
    const url = URL.createObjectURL(pdf);
    const link = document.createElement('a');
    const courseName = enrollment.tbl_courses?.tc_title || 'course';
    link.href = url;
    link.download = `${sanitizeFileName(courseName)}-certificate.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-gray-600 mt-2">
              Continue your learning journey and track your progress
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
                <button
                    key={index}
                    type="button"
                    onClick={() => openDashboardTab(stat.tabId)}
                    className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    aria-label={`Open ${stat.title}`}
                >
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
                </button>
            ))}
          </div>

          {/* Navigation Tabs */}
          <div id="learner-dashboard-tabs" className="bg-white rounded-xl shadow-sm mb-8 scroll-mt-6">
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="flex min-w-max space-x-8 px-6">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'courses', label: 'My Courses', icon: BookOpen },
                  { id: 'videos', label: 'Videos', icon: Video },
                  { id: 'progress', label: 'Progress', icon: TrendingUp },
                  { id: 'payments', label: 'Payment History', icon: Receipt },
                  { id: 'schedule', label: 'Schedule', icon: Calendar },
                  { id: 'tutor', label: 'My Tutor', icon: User },
                  { id: 'certificates', label: 'My Certificates', icon: Award }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-600'
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
              {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Activities */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
                      {recentActivities.length > 0 ? (
                        <div className="space-y-4">
                          {recentActivities.map((activity, index) => (
                            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                              <div className="bg-indigo-100 p-2 rounded-full">
                                <activity.icon className="h-4 w-4 text-indigo-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                                <p className="text-xs text-gray-500">{activity.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-8 text-center">
                          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 text-sm">No recent activities yet</p>
                          <p className="text-gray-500 text-xs mt-1">Start learning to see your progress here</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                      <div className="space-y-3">
                        <button className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors" onClick={() => navigate('/courses')}>
                          Browse New Courses
                        </button>
                        <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors" onClick={() => navigate('/tutors')}>
                          Browse Tutors
                        </button>
                      </div>
                    </div>
                  </div>
              )}

              {activeTab === 'videos' && (
                  <VideoLibrary />
              )}

              {activeTab === 'courses' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">My Enrolled Courses</h3>
                      <div className="text-sm text-gray-500">
                        {enrollments.length} course{enrollments.length !== 1 ? 's' : ''} enrolled
                      </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {[...Array(3)].map((_, i) => (
                              <div key={i} className="bg-gray-100 rounded-xl h-64 animate-pulse"></div>
                          ))}
                        </div>
                    ) : enrollments.length === 0 ? (
                        <div className="text-center py-12">
                          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No courses enrolled yet</h3>
                          <p className="text-gray-600 mb-6">Start your learning journey by enrolling in a course</p>
                          <Link
                              to="/courses"
                              className="group border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white hover:text-indigo-900 transition-all duration-300 flex items-center justify-center space-x-3 backdrop-blur-sm"
                          >
                            <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors">
                              Browse Courses
                            </button>
                          </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {enrollments.map((enrollment) => (
                              <div key={enrollment.tce_id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                                <div className="relative">
                                  <CourseImage
                                      src={enrollment.tbl_courses?.tc_thumbnail_url}
                                      alt={enrollment.tbl_courses?.tc_title}
                                      className="w-full h-48 rounded-t-xl"
                                      imageClassName="object-cover"
                                      fallbackClassName="object-contain opacity-20 p-6 bg-gray-50"
                                  />
                                  <div className="absolute top-4 left-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(enrollment.tbl_courses?.tc_difficulty_level)}`}>
                              {enrollment.tbl_courses?.tc_difficulty_level}
                            </span>
                                  </div>
                                </div>

                                <div className="p-6">
                                  <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">
                              {enrollment.tbl_courses?.tbl_course_categories?.tcc_name}
                            </span>
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">{enrollment.tbl_courses?.tc_duration_hours}h</span>
                                    </div>
                                  </div>

                                  <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
                                    {enrollment.tbl_courses?.tc_title}
                                  </h3>

                                  {/* Progress Bar */}
                                  <div className="mb-4">
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-gray-600">Progress</span>
                                      <span className="font-medium">{enrollment.tce_progress_percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                          style={{ width: `${enrollment.tce_progress_percentage}%` }}
                                      ></div>
                                    </div>
                                  </div>

                                  <button
                                      onClick={() => navigate(`/learner/course/${enrollment.tce_course_id}`)}
                                      className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                  >
                                    Continue Learning
                                  </button>
                                </div>
                              </div>
                          ))}
                        </div>
                    )}
                  </div>
              )}

              {activeTab === 'payments' && (
                  <PaymentHistory />
              )}

              {activeTab === 'progress' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Learning Progress</h3>

                    {/* Overall Progress */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-xl mb-6">
                      <h4 className="text-lg font-semibold mb-2">Overall Learning Progress</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-2xl font-bold">
                            {enrollments.length > 0
                              ? Math.round(enrollments.reduce((sum, e) => sum + e.tce_progress_percentage, 0) / enrollments.length)
                              : 0}%
                          </div>
                          <div className="text-sm opacity-90">Average Progress</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {Math.round(enrollments.reduce((sum, e) =>
                              sum + ((e.tbl_courses?.tc_duration_hours || 0) * (e.tce_progress_percentage / 100)), 0))}h
                          </div>
                          <div className="text-sm opacity-90">Time Spent</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {enrollments.filter(e => e.tce_progress_percentage === 100).length}
                          </div>
                          <div className="text-sm opacity-90">Completed</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {enrollments.filter(e => e.tce_progress_percentage === 100).length}
                          </div>
                          <div className="text-sm opacity-90">Certificates</div>
                        </div>
                      </div>
                    </div>

                    {/* Course Progress Details */}
                    <div className="space-y-4">
                      {enrollments.map((enrollment) => (
                          <div key={enrollment.tce_id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center space-x-4">
                              <CourseImage
                                  src={enrollment.tbl_courses?.tc_thumbnail_url}
                                  alt={enrollment.tbl_courses?.tc_title}
                                  className="w-16 h-16 rounded-lg"
                                  imageClassName="object-cover"
                                  fallbackClassName="object-contain opacity-20 p-3 bg-gray-50"
                              />
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{enrollment.tbl_courses?.tc_title}</h4>
                                <p className="text-sm text-gray-600">{enrollment.tbl_courses?.tbl_course_categories?.tcc_name}</p>
                                <div className="mt-2">
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>Progress</span>
                                    <span className="font-medium">{enrollment.tce_progress_percentage}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-indigo-600 h-2 rounded-full"
                                        style={{ width: `${enrollment.tce_progress_percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-500">Enrolled</div>
                                <div className="text-sm font-medium">
                                  {new Date(enrollment.tce_enrollment_date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
              )}

              {activeTab === 'schedule' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Upcoming Sessions</h3>
                    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No upcoming sessions</h4>
                      <p className="text-gray-600 mb-6">Schedule a session with your tutor to get personalized guidance</p>
                      <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors">
                        Schedule Session
                      </button>
                    </div>
                  </div>
              )}

              {activeTab === 'tutor' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">My Assigned Tutors</h3>

                    {tutorsLoading ? (
                        <div className="text-center py-12">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                    ) : assignedTutors.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-12 text-center">
                          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">No Assigned Tutors</h4>
                          <p className="text-gray-600">
                            You don't have any assigned tutors yet. Tutors will be assigned by the admin for your enrolled courses.
                          </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                          {assignedTutors.map((assignment) => {
                            const tutorData = getTutorData(assignment);
                            const courseTitle = assignment.course?.tc_title || 'Unknown Course';

                            return (
                                <div key={assignment.tta_id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                                  <div className="flex items-start space-x-4">
                                    <img
                                        src={tutorData.profilePicture}
                                        alt={tutorData.fullName}
                                        className="w-20 h-20 rounded-full object-cover"
                                    />
                                    <div className="flex-1">
                                      <h4 className="text-xl font-semibold text-gray-900">
                                        {tutorData.fullName}
                                      </h4>
                                      <p className="text-indigo-600 mb-2">
                                        {tutorData.specializations.length > 0
                                            ? tutorData.specializations.join(', ')
                                            : 'Instructor'}
                                      </p>
                                      <p className="text-gray-600 text-sm mb-2">
                                        <span className="font-medium">Course:</span> {courseTitle}
                                      </p>
                                      {tutorData.bio && (
                                          <p className="text-gray-600 text-sm mb-4">
                                            {tutorData.bio}
                                          </p>
                                      )}

                                      <div className="flex items-center space-x-6 text-sm">
                                        {tutorData.rating > 0 && (
                                            <div className="flex items-center space-x-1">
                                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                              <span>{tutorData.rating.toFixed(1)} rating</span>
                                            </div>
                                        )}
                                        <div className="flex items-center space-x-1">
                                          <User className="h-4 w-4" />
                                          <span>{tutorData.totalStudents} students</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          <Clock className="h-4 w-4" />
                                          <span>{tutorData.experienceYears} years experience</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      {tutorData.email && (
                                          <a
                                              href={`mailto:${tutorData.email}`}
                                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors mb-2 inline-block"
                                          >
                                            Message Tutor
                                          </a>
                                      )}
                                      {tutorData.hourlyRate > 0 && (
                                          <div className="text-sm text-gray-500 mt-2">
                                            ${tutorData.hourlyRate}/hour
                                          </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                            );
                          })}
                        </div>
                    )}
                  </div>
              )}

              {activeTab === 'certificates' && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">My Certificates</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Download certificates for courses you have completed.
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {certificateEnrollments.length} certificate{certificateEnrollments.length !== 1 ? 's' : ''} available
                      </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[...Array(2)].map((_, index) => (
                              <div key={index} className="bg-gray-100 rounded-xl h-44 animate-pulse"></div>
                          ))}
                        </div>
                    ) : certificateEnrollments.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-12 text-center">
                          <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">No Certificates Available</h4>
                          <p className="text-gray-600">
                            Complete a course to unlock your downloadable certificate.
                          </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {certificateEnrollments.map((enrollment) => {
                            const courseName = enrollment.tbl_courses?.tc_title || 'Course';
                            const completionDate = formatCertificateDate(
                                enrollment.tce_completion_date || enrollment.tce_enrollment_date
                            );

                            return (
                                <div key={enrollment.tce_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                  <div className="flex items-start gap-4">
                                    <div className="bg-yellow-100 p-3 rounded-lg flex-shrink-0">
                                      <Award className="h-6 w-6 text-yellow-700" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-lg font-semibold text-gray-900 line-clamp-2">
                                        {courseName}
                                      </h4>
                                      <div className="mt-3 flex flex-col gap-1 text-sm text-gray-600">
                                        <span>Received: {completionDate}</span>
                                        <span>Issued to: {getLearnerFullName()}</span>
                                      </div>
                                      <button
                                          onClick={() => downloadCertificate(enrollment)}
                                          className="mt-5 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                      >
                                        <Download className="h-4 w-4" />
                                        Download Certificate
                                      </button>
                                    </div>
                                  </div>
                                </div>
                            );
                          })}
                        </div>
                    )}
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
};

export default LearnerDashboard;
