import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import StripeCheckout from '../components/payment/StripeCheckout';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const CoursePayment: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
    const [checkingEnrollment, setCheckingEnrollment] = useState(true);

    const { courseId, amount, courseName } = location.state || {};

    useEffect(() => {
        console.log('CoursePayment - Current user:', user);

        if (!user) {
            console.log('No user found, redirecting to login');
            navigate('/login');
            return;
        }

        if (!courseId || !amount) {
            console.log('Missing course data, redirecting to courses');
            navigate('/courses');
            return;
        }

        checkEnrollmentStatus();
    }, [user, courseId, amount, navigate]);

    const checkEnrollmentStatus = async () => {
        if (!user || !courseId) return;

        try {
            setCheckingEnrollment(true);
            const { data, error } = await supabase
                .from('tbl_course_enrollments')
                .select('tce_id')
                .eq('tce_user_id', user.id)
                .eq('tce_course_id', courseId)
                .maybeSingle();

            if (error) {
                console.error('Error checking enrollment:', error);
            }

            if (data) {
                setAlreadyEnrolled(true);
            }
        } catch (err) {
            console.error('Error checking enrollment:', err);
        } finally {
            setCheckingEnrollment(false);
        }
    };

    const handlePaymentSuccess = () => {
        setShowSuccess(true);
        setTimeout(() => {
            navigate('/learner/dashboard');
        }, 3000);
    };

    const handleCancel = () => {
        navigate(`/courses/${courseId}`);
    };

    if (checkingEnrollment) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (alreadyEnrolled) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="mb-6">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
                            <AlertCircle className="h-10 w-10 text-yellow-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Already Enrolled</h2>
                    <p className="text-gray-600 mb-6">
                        You are already enrolled in <span className="font-semibold">{courseName}</span>
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/learner/dashboard')}
                            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
                        >
                            Go to My Courses
                        </button>
                        <button
                            onClick={() => navigate('/courses')}
                            className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300"
                        >
                            Browse Courses
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="mb-6">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
                    <p className="text-gray-600 mb-4">
                        You have successfully enrolled in <span className="font-semibold">{courseName}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                        Redirecting to your dashboard...
                    </p>
                </div>
            </div>
        );
    }

    if (showError) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="mb-6">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                            <XCircle className="h-10 w-10 text-red-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
                    <p className="text-gray-600 mb-6">
                        There was an issue processing your payment. Please try again.
                    </p>
                    <button
                        onClick={() => setShowError(false)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!user || !courseId || !amount) {
        return null;
    }

    console.log('Rendering StripeCheckout with userId:', user.id);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Enrollment</h1>
                    <p className="text-gray-600">Secure payment powered by Stripe</p>
                </div>

                <StripeCheckout
                    courseId={courseId}
                    courseTitle={courseName || 'Course'}
                    amount={parseFloat(amount)}
                    userId={user.id}
                    onSuccess={handlePaymentSuccess}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
};

export default CoursePayment;